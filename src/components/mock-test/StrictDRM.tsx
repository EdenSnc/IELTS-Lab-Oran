'use client';

import { useEffect } from 'react';

export default function StrictDRM() {
  useEffect(() => {
    let internalWritingClipboard = '';
    let internalWritingClipboardExpiresAt = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target instanceof Element ? e.target : null;
      const isWritingResponse = Boolean(target?.closest('[data-writing-response="true"]'));

      if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // The official Writing editor offers basic editing shortcuts. Clipboard
      // actions remain disabled in passages and short-answer fields.
      if (
        (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey &&
        (e.key === 'c' || e.key === 'v' || e.key === 'x' || e.key === 'z' || e.key === 'C' || e.key === 'V' || e.key === 'X' || e.key === 'Z')
      ) {
        if (e.key.toLowerCase() === 'z' || isWritingResponse) return;
        e.preventDefault();
        return;
      }

      // Block browser search, print and save inside the test player.
      if (
        (e.ctrlKey || e.metaKey)
        && ['f', 'p', 's'].includes(e.key.toLowerCase())
      ) {
        e.preventDefault();
      }

      // Block Ctrl+U / Cmd+Option+U (View Source)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
      }

      // Block DevTools: Ctrl+Shift+I/J/C (Windows) and Cmd+Option+I/J/C (Mac) and F12
      if (
        e.key === 'F12' || 
        ((e.ctrlKey || e.metaKey) && (e.shiftKey || e.altKey) && (e.key === 'i' || e.key === 'I' || e.key === 'j' || e.key === 'J' || e.key === 'c' || e.key === 'C'))
      ) {
        e.preventDefault();
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      // A valid annotation menu stops propagation in React. Any event that
      // reaches the window is therefore a native browser context menu.
      e.preventDefault();
    };

    const isWritingClipboardEvent = (e: ClipboardEvent) => (
      e.target instanceof Element
      && Boolean(e.target.closest('[data-writing-response="true"]'))
    );

    const handleCopy = (e: ClipboardEvent) => {
      if (isWritingClipboardEvent(e)) {
        const field = e.target instanceof HTMLTextAreaElement ? e.target : null;
        internalWritingClipboard = field
          ? field.value.slice(field.selectionStart, field.selectionEnd)
          : window.getSelection()?.toString() ?? '';
        internalWritingClipboardExpiresAt = Date.now() + 10 * 60 * 1000;
        return;
      }
      e.preventDefault();
      e.clipboardData?.setData('text/plain', 'IELTS Lab: content is protected.');
    };

    const handlePaste = (e: ClipboardEvent) => {
      if (!isWritingClipboardEvent(e)) {
        e.preventDefault();
        return;
      }
      const pastedText = e.clipboardData?.getData('text/plain') ?? '';
      if (
        !internalWritingClipboard
        || Date.now() > internalWritingClipboardExpiresAt
        || pastedText !== internalWritingClipboard
      ) e.preventDefault();
    };

    const handleCut = (e: ClipboardEvent) => {
      if (isWritingClipboardEvent(e)) {
        const field = e.target instanceof HTMLTextAreaElement ? e.target : null;
        internalWritingClipboard = field
          ? field.value.slice(field.selectionStart, field.selectionEnd)
          : window.getSelection()?.toString() ?? '';
        internalWritingClipboardExpiresAt = Date.now() + 10 * 60 * 1000;
        return;
      }
      e.preventDefault();
    };

    const handleDragStart = (e: DragEvent) => {
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest('img, picture, svg, [data-ielts-canvas="true"]')) e.preventDefault();
    };

    // A2: Tab visibility blur; grey out content when the student switches tabs.
    const handleVisibilityChange = () => {
      if (document.hidden) {
        document.body.style.filter = 'blur(8px)';
        document.body.style.pointerEvents = 'none';
      } else {
        document.body.style.filter = '';
        document.body.style.pointerEvents = '';
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('copy', handleCopy as EventListener);
    window.addEventListener('paste', handlePaste as EventListener);
    window.addEventListener('cut', handleCut as EventListener);
    window.addEventListener('dragstart', handleDragStart as EventListener);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.body.classList.add('user-select-none');

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('copy', handleCopy as EventListener);
      window.removeEventListener('paste', handlePaste as EventListener);
      window.removeEventListener('cut', handleCut as EventListener);
      window.removeEventListener('dragstart', handleDragStart as EventListener);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.body.classList.remove('user-select-none');
      // Ensure blur is removed on cleanup
      document.body.style.filter = '';
      document.body.style.pointerEvents = '';
    };
  }, []);

  return null;
}
