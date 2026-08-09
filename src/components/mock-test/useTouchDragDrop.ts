'use client';

import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { scrollPaneAtPoint, scrollPaneNearEdge } from './useDragAutoScroll';

type TouchDragDropOptions = {
  containerRef: RefObject<HTMLElement | null>;
  draggedLabelRef: RefObject<string | null>;
  onAssign: (number: number, label: string) => void;
};

/** Adds consistent mouse, touch and pen dragging without the browser's no-drop cursor. */
export function useTouchDragDrop({
  containerRef,
  draggedLabelRef,
  onAssign,
}: TouchDragDropOptions) {
  const onAssignRef = useRef(onAssign);

  useEffect(() => {
    onAssignRef.current = onAssign;
  }, [onAssign]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let start: { x: number; y: number } | null = null;
    let point: { x: number; y: number } | null = null;
    let source: HTMLElement | null = null;
    let label: string | null = null;
    let active = false;
    let ghost: HTMLElement | null = null;
    let frame = 0;
    let suppressClickUntil = 0;

    const targetAt = (x: number, y: number) => {
      const element = document.elementFromPoint(x, y);
      const target = element?.closest<HTMLElement>('[data-answer-number]') ?? null;
      return target && container.contains(target) ? target : null;
    };

    const decorateTarget = (target: HTMLElement | null) => {
      container.querySelector('.mock-ielts-gap.drag-over')?.classList.remove('drag-over');
      target?.classList.add('drag-over');
    };

    const tick = () => {
      frame = 0;
      if (!active || !point) return;
      const pane = scrollPaneAtPoint(point.x, point.y);
      if (pane) scrollPaneNearEdge(pane, point.y);
      decorateTarget(targetAt(point.x, point.y));
      frame = requestAnimationFrame(tick);
    };

    const cleanup = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      ghost?.remove();
      ghost = null;
      source?.classList.remove('is-dragging');
      container.querySelectorAll('.dragging, .drag-over').forEach((element) => {
        element.classList.remove('dragging', 'drag-over');
      });
      draggedLabelRef.current = null;
      start = null;
      point = null;
      source = null;
      label = null;
      active = false;
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
      const candidate = event.target instanceof Element
        ? event.target.closest<HTMLElement>('[data-answer-label]')
        : null;
      if (!candidate || !container.contains(candidate) || candidate.classList.contains('opacity')) return;
      event.preventDefault();
      source = candidate;
      label = candidate.dataset.answerLabel ?? null;
      start = { x: event.clientX, y: event.clientY };
      point = start;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!start || !source || !label) return;
      point = { x: event.clientX, y: event.clientY };
      if (!active && Math.hypot(point.x - start.x, point.y - start.y) < 7) return;
      event.preventDefault();
      if (!active) {
        active = true;
        draggedLabelRef.current = label;
        source.classList.add('is-dragging');
        container.querySelectorAll('.mock-ielts-gap:not(.populated)').forEach((target) => {
          target.classList.add('dragging');
        });
        ghost = document.createElement('div');
        ghost.className = 'mock-touch-drag-ghost';
        ghost.textContent = source.textContent?.trim() ?? '';
        document.body.appendChild(ghost);
      }
      if (ghost) {
        ghost.style.left = `${event.clientX}px`;
        ghost.style.top = `${event.clientY}px`;
      }
      decorateTarget(targetAt(event.clientX, event.clientY));
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const onPointerUp = (event: PointerEvent) => {
      if (!start) return;
      if (active && label) {
        event.preventDefault();
        const target = targetAt(event.clientX, event.clientY);
        const number = Number(target?.dataset.answerNumber);
        if (target && Number.isInteger(number)) onAssignRef.current(number, label);
        suppressClickUntil = performance.now() + 500;
      }
      cleanup();
    };

    const onClickCapture = (event: MouseEvent) => {
      if (performance.now() >= suppressClickUntil) return;
      event.preventDefault();
      event.stopPropagation();
    };

    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('click', onClickCapture, true);
    document.addEventListener('pointermove', onPointerMove, { passive: false });
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', cleanup);
    return () => {
      cleanup();
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('click', onClickCapture, true);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', cleanup);
    };
  }, [containerRef, draggedLabelRef]);
}
