'use client';

import {
  type MouseEvent as ReactMouseEvent,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { IELTSSection, useTestStore } from '@/lib/store/useTestStore';

type MenuState = {
  x: number;
  y: number;
  quote: string;
  startOffset: number;
  endOffset: number;
};

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

export function useTextAnnotations(
  section: IELTSSection,
  contentKey: string = section,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const renderedHtmlRef = useRef<string | null>(null);
  const previousContentKeyRef = useRef(contentKey);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const addNote = useTestStore((state) => state.addNote);

  useLayoutEffect(() => {
    if (previousContentKeyRef.current !== contentKey) {
      previousContentKeyRef.current = contentKey;
      renderedHtmlRef.current = null;
      return;
    }
    const container = containerRef.current;
    const renderedHtml = renderedHtmlRef.current;
    if (container && renderedHtml && container.innerHTML !== renderedHtml) {
      container.innerHTML = renderedHtml;
    }
  });

  const openMenu = (event: ReactMouseEvent) => {
    const selection = window.getSelection();
    const quote = selection?.toString().trim() ?? '';
    if (
      !selection
      || !quote
      || selection.rangeCount === 0
      || !containerRef.current?.contains(selection.anchorNode)
      || !containerRef.current?.contains(selection.focusNode)
    ) {
      setMenu(null);
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const selectedRange = selection.getRangeAt(0);
    setMenu({
      x: Math.min(event.clientX, window.innerWidth - 180),
      y: Math.min(event.clientY, window.innerHeight - 110),
      quote,
      startOffset: textOffset(
        containerRef.current,
        selectedRange.startContainer,
        selectedRange.startOffset,
      ),
      endOffset: textOffset(
        containerRef.current,
        selectedRange.endContainer,
        selectedRange.endOffset,
      ),
    });
  };

  const clearSelection = () => {
    window.getSelection()?.removeAllRanges();
    setMenu(null);
  };

  const highlight = () => {
    const container = containerRef.current;
    if (!menu || !container) return;
    const range = rangeFromTextOffsets(
      container,
      menu.startOffset,
      menu.endOffset,
    );
    if (!range || range.collapsed) return;
    const mark = document.createElement('mark');
    mark.dataset.ieltsHighlight = 'true';
    mark.className = 'bg-yellow-300 text-inherit';
    mark.append(range.extractContents());
    range.insertNode(mark);
    renderedHtmlRef.current = container.innerHTML;
    clearSelection();
  };

  const createNote = () => {
    if (!menu) return;
    addNote(section, menu.quote);
    clearSelection();
  };

  const clearHighlights = () => {
    containerRef.current
      ?.querySelectorAll('mark[data-ielts-highlight]')
      .forEach((mark) => mark.replaceWith(...Array.from(mark.childNodes)));
    renderedHtmlRef.current = containerRef.current?.innerHTML ?? null;
    clearSelection();
  };

  return {
    containerRef,
    menu,
    openMenu,
    closeMenu: () => setMenu(null),
    highlight,
    createNote,
    clearHighlights,
  };
}

export function TextAnnotationMenu({
  menu,
  onHighlight,
  onNote,
  onClear,
}: {
  menu: { x: number; y: number } | null;
  onHighlight: () => void;
  onNote: () => void;
  onClear: () => void;
}) {
  if (!menu) return null;

  return (
    <div
      className="fixed z-[65] min-w-40 rounded-sm border border-gray-300 bg-white py-1 text-sm shadow-lg"
      style={{ top: menu.y, left: menu.x }}
      role="menu"
      aria-label="Selected text actions"
    >
      <button
        type="button"
        onPointerDown={(event) => {
          event.preventDefault();
          onHighlight();
        }}
        onClick={(event) => {
          if (event.detail === 0) onHighlight();
        }}
        className="block w-full px-4 py-2 text-left hover:bg-gray-100"
      >
        Highlight
      </button>
      <button
        type="button"
        onPointerDown={(event) => {
          event.preventDefault();
          onNote();
        }}
        onClick={(event) => {
          if (event.detail === 0) onNote();
        }}
        className="block w-full px-4 py-2 text-left hover:bg-gray-100"
      >
        Add note
      </button>
      <button
        type="button"
        onPointerDown={(event) => {
          event.preventDefault();
          onClear();
        }}
        onClick={(event) => {
          if (event.detail === 0) onClear();
        }}
        className="block w-full px-4 py-2 text-left hover:bg-gray-100"
      >
        Clear highlights
      </button>
    </div>
  );
}
