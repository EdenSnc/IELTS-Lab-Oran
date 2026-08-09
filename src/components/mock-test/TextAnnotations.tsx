'use client';

import {
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { IELTSSection, useTestStore } from '@/lib/store/useTestStore';

type MenuState = {
  contentKey: string;
  x: number;
  y: number;
  quote: string;
  startOffset: number;
  endOffset: number;
  highlighted: boolean;
};

type StoredRange = Pick<MenuState, 'startOffset' | 'endOffset'>;
type HighlightRegistry = { set: (name: string, value: unknown) => void; delete: (name: string) => void };
type HighlightConstructor = new (...ranges: Range[]) => unknown;

const HIGHLIGHT_NAME = 'ielts-user-highlight';
const highlightRanges = new Map<string, Range[]>();

function ensureHighlightStyle() {
  if (document.getElementById('ielts-highlight-style')) return;
  const style = document.createElement('style');
  style.id = 'ielts-highlight-style';
  style.textContent = '::highlight(ielts-user-highlight){background-color:#fde047;color:inherit}';
  document.head.appendChild(style);
}

function repaintHighlights() {
  const registry = (CSS as unknown as { highlights?: HighlightRegistry }).highlights;
  const Highlight = (window as unknown as { Highlight?: HighlightConstructor }).Highlight;
  if (!registry || !Highlight) return false;
  ensureHighlightStyle();
  const ranges = Array.from(highlightRanges.values()).flat();
  if (ranges.length) registry.set(HIGHLIGHT_NAME, new Highlight(...ranges));
  else registry.delete(HIGHLIGHT_NAME);
  return true;
}

function textOffset(container: Node, node: Node, offset: number) {
  const range = document.createRange();
  range.selectNodeContents(container);
  range.setEnd(node, offset);
  return range.toString().length;
}

function rangeFromTextOffsets(container: Node, startOffset: number, endOffset: number) {
  const range = document.createRange();
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let total = 0;
  let startSet = false;
  let node: Node | null;

  while ((node = walker.nextNode())) {
    const length = node.textContent?.length ?? 0;
    if (!startSet && startOffset <= total + length) {
      range.setStart(node, Math.max(0, startOffset - total));
      startSet = true;
    }
    if (startSet && endOffset <= total + length) {
      range.setEnd(node, Math.max(0, endOffset - total));
      return range;
    }
    total += length;
  }
  return null;
}

export function useTextAnnotations(section: IELTSSection, contentKey: string = section) {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceId = useId();
  const storedRangesRef = useRef<StoredRange[]>([]);
  const previousContentKeyRef = useRef(contentKey);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const addNote = useTestStore((state) => state.addNote);

  const rebuildRanges = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const ranges = storedRangesRef.current.flatMap(({ startOffset, endOffset }) => {
      const range = rangeFromTextOffsets(container, startOffset, endOffset);
      return range && !range.collapsed ? [range] : [];
    });
    highlightRanges.set(instanceId, ranges);
    repaintHighlights();
  }, [instanceId]);

  useLayoutEffect(() => {
    if (previousContentKeyRef.current !== contentKey) {
      previousContentKeyRef.current = contentKey;
      storedRangesRef.current = [];
    }
    rebuildRanges();
  });

  useLayoutEffect(() => {
    return () => {
      highlightRanges.delete(instanceId);
      repaintHighlights();
    };
  }, [instanceId]);

  const showMenuFromSelection = useCallback((clientX?: number, clientY?: number) => {
    const selection = window.getSelection();
    const quote = selection?.toString().trim() ?? '';
    const container = containerRef.current;
    if (!selection || !quote || selection.rangeCount === 0 || !container
      || !container.contains(selection.anchorNode) || !container.contains(selection.focusNode)) {
      setMenu(null);
      return false;
    }

    const selectedRange = selection.getRangeAt(0);
    const rect = selectedRange.getBoundingClientRect();
    setMenu({
      contentKey,
      x: Math.max(8, Math.min(clientX ?? rect.left, window.innerWidth - 180)),
      y: Math.max(8, Math.min(clientY ?? rect.bottom + 8, window.innerHeight - 150)),
      quote,
      startOffset: textOffset(container, selectedRange.startContainer, selectedRange.startOffset),
      endOffset: textOffset(container, selectedRange.endContainer, selectedRange.endOffset),
      highlighted: storedRangesRef.current.some((stored) => (
        stored.startOffset < textOffset(container, selectedRange.endContainer, selectedRange.endOffset)
        && stored.endOffset > textOffset(container, selectedRange.startContainer, selectedRange.startOffset)
      )),
    });
    return true;
  }, [contentKey]);

  const openMenu = (event: ReactMouseEvent) => {
    if (showMenuFromSelection(event.clientX, event.clientY)) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const openMenuFromSelection = () => {
    window.setTimeout(() => showMenuFromSelection(), 0);
  };

  useEffect(() => {
    const updateSelection = () => window.setTimeout(() => showMenuFromSelection(), 0);
    document.addEventListener('selectionchange', updateSelection);
    return () => document.removeEventListener('selectionchange', updateSelection);
  }, [showMenuFromSelection]);

  const clearSelection = () => {
    window.getSelection()?.removeAllRanges();
    setMenu(null);
  };

  const highlight = () => {
    if (!menu || menu.contentKey !== contentKey) return;
    if (menu.highlighted) {
      storedRangesRef.current = storedRangesRef.current.filter((stored) => (
        stored.endOffset <= menu.startOffset || stored.startOffset >= menu.endOffset
      ));
    } else {
      storedRangesRef.current.push({ startOffset: menu.startOffset, endOffset: menu.endOffset });
    }
    rebuildRanges();
    clearSelection();
  };

  const createNote = () => {
    if (!menu || menu.contentKey !== contentKey) return;
    addNote(section, menu.quote);
    clearSelection();
  };

  const clearHighlights = () => {
    storedRangesRef.current = [];
    rebuildRanges();
    clearSelection();
  };

  return {
    containerRef,
    menu: menu?.contentKey === contentKey ? menu : null,
    openMenu,
    openMenuFromSelection,
    closeMenu: () => setMenu(null),
    highlight,
    createNote,
    clearHighlights,
  };
}

export function TextAnnotationMenu({ menu, onHighlight, onNote, onClear }: {
  menu: { x: number; y: number; highlighted: boolean } | null;
  onHighlight: () => void;
  onNote: () => void;
  onClear: () => void;
}) {
  if (!menu) return null;

  const action = (callback: () => void) => (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    callback();
  };

  return (
    <div className="text-annotation-menu fixed z-[65] min-w-40 rounded-sm border border-gray-300 bg-white py-1 text-sm shadow-lg" style={{ top: menu.y, left: menu.x }} role="menu" aria-label="Selected text actions">
      <button type="button" onPointerDown={action(onHighlight)} className="block w-full px-4 py-2 text-left hover:bg-gray-100">{menu.highlighted ? 'Remove highlight' : 'Highlight'}</button>
      <button type="button" onPointerDown={action(onNote)} className="block w-full px-4 py-2 text-left hover:bg-gray-100">Add note</button>
      <button type="button" onPointerDown={action(onClear)} className="block w-full px-4 py-2 text-left hover:bg-gray-100">Clear all</button>
    </div>
  );
}
