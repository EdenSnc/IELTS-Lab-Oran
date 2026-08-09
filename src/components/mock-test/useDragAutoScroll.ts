'use client';

import { useEffect } from 'react';
import type { RefObject } from 'react';

const EDGE_SIZE = 110;
const MAX_STEP = 18;
const OUTSIDE_TOLERANCE = 64;

export function scrollPaneAtPoint(clientX: number, clientY: number) {
  const panes = Array.from(document.querySelectorAll<HTMLElement>(
    '[data-question-scroll-pane="true"], .ielts-question-scroll',
  ));
  return panes.find((pane) => {
    const bounds = pane.getBoundingClientRect();
    return clientX >= bounds.left
      && clientX <= bounds.right
      && clientY >= bounds.top - OUTSIDE_TOLERANCE
      && clientY <= bounds.bottom + OUTSIDE_TOLERANCE;
  }) ?? null;
}

export function scrollPaneNearEdge(pane: HTMLElement, clientY: number) {
  const bounds = pane.getBoundingClientRect();
  let step = 0;
  if (clientY < bounds.top + EDGE_SIZE) {
    const strength = Math.min(1, Math.max(0, (bounds.top + EDGE_SIZE - clientY) / EDGE_SIZE));
    step = -Math.max(3, MAX_STEP * strength * strength);
  } else if (clientY > bounds.bottom - EDGE_SIZE) {
    const strength = Math.min(1, Math.max(0, (clientY - (bounds.bottom - EDGE_SIZE)) / EDGE_SIZE));
    step = Math.max(3, MAX_STEP * strength * strength);
  }
  if (step) pane.scrollBy({ top: Math.max(-MAX_STEP, Math.min(MAX_STEP, step)), behavior: 'auto' });
  return step !== 0;
}

/** Keeps the question pane moving while a native HTML drag is near its edge. */
export function useDragAutoScroll(draggedValue: RefObject<string | null>) {
  useEffect(() => {
    let frame = 0;
    let point: { x: number; y: number } | null = null;

    const stop = () => {
      point = null;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    };

    const tick = () => {
      frame = 0;
      if (!draggedValue.current || !point) return;
      const pane = scrollPaneAtPoint(point.x, point.y);
      if (!pane) return;
      scrollPaneNearEdge(pane, point.y);
      frame = requestAnimationFrame(tick);
    };

    const handleDragOver = (event: DragEvent) => {
      if (!draggedValue.current) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
      point = { x: event.clientX, y: event.clientY };
      if (!frame) frame = requestAnimationFrame(tick);
    };

    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragend', stop);
    document.addEventListener('drop', stop);
    return () => {
      stop();
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('dragend', stop);
      document.removeEventListener('drop', stop);
    };
  }, [draggedValue]);
}
