'use client';
// Loaded via FloatingWidgetClient (dynamic ssr:false) to avoid hydration issues.

import { useState, useRef, useCallback, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { isCohortDeadlinePassed } from '@/lib/cohort-launch';

const GAP     = 20;   // px from screen edge when snapped
const SZ      = 64;   // Bubble diameter in pixels
const PILL_H  = 72;   // expanded pill height (px)
const SPRING  = 'cubic-bezier(0.34, 1.45, 0.64, 1)';
const SNAP_MS = 520;

type Side = 'left' | 'right';

function getPillW(): number {
  if (typeof window === 'undefined') return 320;
  return Math.min(340, window.innerWidth - GAP * 2 - 4);
}

function clampY(y: number): number {
  return Math.max(GAP, Math.min(window.innerHeight - SZ - GAP, y));
}

export default function FloatingWidget() {
  const t = useTranslations('EventWidget');
  const locale = useLocale();
  const isRtl = locale === 'ar';
  const defaultSide: Side = isRtl ? 'right' : 'left';
  const deadlinePassed = isCohortDeadlinePassed();

  const [expanded, setExpanded] = useState(false);
  const [side, setSide]         = useState<Side>(defaultSide);
  const [pillW, setPillW]       = useState(() => getPillW());
  const [hasDragged, setHasDragged] = useState(false);
  const [top, setTop] = useState(0);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [isSnapAnim, setIsSnapAnim] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  const moved             = useRef(false);
  const pointerToggledRef = useRef(false);
  const origin            = useRef({ cx: 0, cy: 0 });
  const liveDelta         = useRef({ dx: 0, dy: 0 });
  const sideRef           = useRef<Side>(defaultSide);
  const topRef            = useRef(0);
  const expandedRef       = useRef(false);

  useEffect(() => {
    const onResize = () => {
      setPillW(getPillW());
      if (hasDragged) {
        setTop((cy) => {
          const ny = clampY(cy);
          topRef.current = ny;
          return ny;
        });
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [hasDragged]);

  const toggleExpanded = useCallback(() => {
    setIsSnapAnim(true);
    const next = !expandedRef.current;
    setExpanded(next);
    expandedRef.current = next;
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).closest('a, [data-dismiss="true"]')) return;
    const rect = e.currentTarget.getBoundingClientRect();
    topRef.current = rect.top;
    setIsDragging(true);
    setIsSnapAnim(false);
    moved.current   = false;
    origin.current  = { cx: e.clientX, cy: e.clientY };
    liveDelta.current = { dx: 0, dy: 0 };
    setTx(0);
    setTy(0);
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (e.buttons === 0) return;
    const ddx = e.clientX - origin.current.cx;
    const ddy = e.clientY - origin.current.cy;
    if (Math.abs(ddx) > 3 || Math.abs(ddy) > 3) moved.current = true;
    if (expandedRef.current) return;
    liveDelta.current = { dx: ddx, dy: ddy };
    setTx(ddx);
    setTy(ddy);
  }, []);

  const onPointerUp = useCallback(() => {
    setIsDragging(false);

    if (!moved.current) {
      liveDelta.current = { dx: 0, dy: 0 };
      setTx(0);
      setTy(0);
      pointerToggledRef.current = true;
      requestAnimationFrame(() => {
        pointerToggledRef.current = false;
      });
      toggleExpanded();
      return;
    }

    const { dx, dy } = liveDelta.current;
    const baseX = sideRef.current === 'left' ? GAP : window.innerWidth - GAP - SZ;
    const currentX = baseX + dx;
    const currentY = topRef.current + dy;

    const centerX = currentX + SZ / 2;
    const newSide: Side = centerX < window.innerWidth / 2 ? 'left' : 'right';
    const newTop = clampY(currentY);
    const newBaseX = newSide === 'left' ? GAP : window.innerWidth - GAP - SZ;

    const invertX = currentX - newBaseX;
    const invertY = currentY - newTop;

    setHasDragged(true);
    sideRef.current = newSide;
    setSide(newSide);
    topRef.current = newTop;
    setTop(newTop);
    setTx(invertX);
    setTy(invertY);
    liveDelta.current = { dx: 0, dy: 0 };

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsSnapAnim(true);
        setTx(0);
        setTy(0);
      });
    });
  }, [toggleExpanded]);

  const isRight = side === 'right';

  return (
    <aside
      aria-label={t('linkAriaLabel')}
      dir={isRtl ? 'rtl' : 'ltr'}
      style={{
        position: 'fixed',
        left: side === 'left' ? GAP : 'auto',
        right: side === 'right' ? GAP : 'auto',
        top: hasDragged ? Math.round(top) : 'auto',
        bottom: hasDragged ? 'auto' : GAP,
        width: SZ,
        height: SZ,
        contain: 'layout style',
        zIndex: 45,
        transform: `translate(${Math.round(tx)}px, ${Math.round(ty)}px)`,
        transition: isSnapAnim ? `transform ${SNAP_MS}ms ${SPRING}` : 'none',
        touchAction: 'none',
        userSelect: 'none',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className="cursor-grab active:cursor-grabbing"
    >
      <div style={{ position: 'relative', width: SZ, height: SZ }}>
        {/* Notification dot */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 1,
            right: 1,
            zIndex: 40,
            width: 13,
            height: 13,
            display: 'flex',
            pointerEvents: 'none',
            transition: 'opacity 0.25s ease, transform 0.25s ease',
            opacity: expanded ? 0 : 1,
            transform: expanded ? 'scale(0)' : 'scale(1)',
          }}
        >
          <span
            className="animate-ping"
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              backgroundColor: '#dc2626',
              opacity: 0.7,
            }}
          />
          <span
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              backgroundColor: '#dc2626',
              border: '2px solid #111',
            }}
          />
        </span>

        {/* Pill shell */}
        <div
          style={{
            position: 'absolute',
            top: hasDragged ? 0 : 'auto',
            bottom: hasDragged ? 'auto' : 0,
            left: side === 'left' ? 0 : 'auto',
            right: side === 'right' ? 0 : 'auto',
            width: expanded ? pillW : SZ,
            height: expanded ? PILL_H : SZ,
            borderRadius: expanded ? 32 : SZ / 2,
            backgroundColor: 'rgba(18, 18, 18, 0.96)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.14)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.3)',
            overflow: 'hidden',
            transition:
              isDragging || !isSnapAnim
                ? 'none'
                : `width ${SNAP_MS}ms ${SPRING}, height ${SNAP_MS}ms ${SPRING}, border-radius ${SNAP_MS * 0.85}ms ${SPRING}`,
          }}
        >
          {/* Keyboard & screen-reader accessible trigger when collapsed */}
          <button
            type="button"
            aria-label={t('linkAriaLabel')}
            aria-expanded={expanded}
            aria-hidden={expanded}
            tabIndex={expanded ? -1 : 0}
            onClick={() => {
              if (pointerToggledRef.current) {
                pointerToggledRef.current = false;
                return;
              }
              toggleExpanded();
            }}
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: expanded ? 0 : 25,
              borderRadius: 'inherit',
              background: 'transparent',
              border: 'none',
              padding: 0,
              visibility: expanded ? 'hidden' : 'visible',
              pointerEvents: expanded ? 'none' : 'auto',
            }}
            className="focus-visible:outline-2 focus-visible:outline-crimson"
          />

          {/* Link overlay when expanded */}
          <Link
            href="/articles/first-ielts-preparation-cohort-oran"
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 10,
              borderRadius: 'inherit',
              opacity: expanded ? 1 : 0,
              visibility: expanded ? 'visible' : 'hidden',
              pointerEvents: expanded ? 'auto' : 'none',
            }}
            aria-label={t('linkAriaLabel')}
            aria-hidden={!expanded}
            tabIndex={expanded ? 0 : -1}
          />

          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            {/* Icon */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                marginTop: -(SZ / 2),
                left: isRight ? 'auto' : -1,
                right: isRight ? -1 : 'auto',
                width: SZ,
                height: SZ,
                padding: 6,
                zIndex: 20,
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: '#fff',
                  boxShadow: '0 1px 6px rgba(0,0,0,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#d97706',
                }}
              >
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>

            {/* Text */}
            <div
              aria-hidden={!expanded}
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                width: pillW - SZ - 44,
                ...(isRight ? { right: SZ } : { left: SZ }),
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                textAlign: isRtl ? 'right' : isRight ? 'right' : 'left',
                padding: isRight ? '0 6px 0 0' : '0 0 0 4px',
                opacity: expanded ? 1 : 0,
                visibility: expanded ? 'visible' : 'hidden',
                transform: expanded
                  ? 'translateX(0)'
                  : isRight
                    ? 'translateX(10px)'
                    : 'translateX(-10px)',
                transition: expanded
                  ? `opacity 0.22s ease ${SNAP_MS * 0.38}ms, transform 0.28s ${SPRING} ${SNAP_MS * 0.33}ms`
                  : 'opacity 0.12s ease, transform 0.12s ease',
                pointerEvents: 'none',
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  color: '#d1d5db',
                  textTransform: 'uppercase',
                  lineHeight: 1.3,
                  whiteSpace: 'nowrap',
                }}
              >
                {t('badge')}
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#fff',
                  lineHeight: 1.35,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: pillW - SZ - 44,
                }}
              >
                {deadlinePassed ? t('closedTitle') : t('title')}
              </span>
            </div>

            {/* Dismiss */}
            <button
              type="button"
              data-dismiss="true"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setExpanded(false);
                expandedRef.current = false;
              }}
              aria-label={t('minimizeLabel')}
              aria-hidden={!expanded}
              tabIndex={expanded ? 0 : -1}
              style={{
                position: 'absolute',
                top: '50%',
                marginTop: -14,
                right: isRight ? 'auto' : 10,
                left: isRight ? 10 : 'auto',
                zIndex: 30,
                width: 28,
                height: 28,
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(255,255,255,0.12)',
                color: '#e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'var(--cursor-pointer, pointer)',
                opacity: expanded ? 1 : 0,
                visibility: expanded ? 'visible' : 'hidden',
                transform: expanded ? 'scale(1)' : 'scale(0.4)',
                pointerEvents: expanded ? 'auto' : 'none',
                transition: expanded
                  ? `opacity 0.18s ease ${SNAP_MS * 0.42}ms, transform 0.22s ${SPRING} ${SNAP_MS * 0.38}ms`
                  : 'opacity 0.1s ease, transform 0.1s ease',
              }}
            >
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
