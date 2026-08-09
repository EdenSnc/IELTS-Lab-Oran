'use client';

import { memo } from 'react';
import { TextAnnotationMenu, useTextAnnotations } from './TextAnnotations';

type ReadingPassageProps = {
  contentKey: string;
  html: string;
  title?: string | null;
  showTitle: boolean;
};

function ReadingPassage({ contentKey, html, title, showTitle }: ReadingPassageProps) {
  const {
    containerRef,
    menu,
    openMenu,
    highlight,
    createNote,
    clearHighlights,
  } = useTextAnnotations('reading', contentKey);

  return (
    <div className="mx-auto max-w-[800px] px-3 py-4 md:px-5">
      {showTitle && title && <h2 className="mb-5 text-lg font-bold">{title}</h2>}
      <TextAnnotationMenu
        menu={menu}
        onHighlight={highlight}
        onNote={createNote}
        onClear={clearHighlights}
      />
      <div
        ref={containerRef}
        data-text-annotations="true"
        onContextMenu={openMenu}
        className="mock-reading-text prose max-w-none cursor-text leading-relaxed text-charcoal"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

export default memo(
  ReadingPassage,
  (previous, next) => (
    previous.contentKey === next.contentKey
    && previous.html === next.html
    && previous.title === next.title
    && previous.showTitle === next.showTitle
  ),
);
