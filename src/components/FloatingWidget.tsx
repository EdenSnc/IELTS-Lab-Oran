'use client';
// Loaded via FloatingWidgetClient (dynamic ssr:false) — no hydration issues

import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import Image from 'next/image';

// ─── Constants ────────────────────────────────────────────────────────────────
const GAP     = 20;   // px from screen edge when snapped
const SZ      = 64;   // bubble diameter (px) — increased for better visibility
const PILL_H  = 72;   // expanded pill height (px)
const SPRING  = 'cubic-bezier(0.34, 1.45, 0.64, 1)';
const SNAP_MS = 520;

type Side = 'left' | 'right';

// Compute pill width: wide as possible while staying in viewport
function getPillW(): number {
  if (typeof window === 'undefined') return 320;
  return Math.min(340, window.innerWidth - GAP * 2 - 4);
}

// Compute root X so the pill is anchored to the correct screen edge
function computeX(side: Side, expanded: boolean, pillW: number): number {
  if (side === 'left') return GAP;
  return window.innerWidth - GAP - (expanded ? pillW : SZ);
}

function clampY(y: number): number {
  return Math.max(GAP, Math.min(window.innerHeight - SZ - GAP, y));
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function FloatingWidget() {
  const t = useTranslations('EventWidget');

  const [expanded, setExpanded] = useState(false);
  const [side, setSide]         = useState<Side>('left');
  const [pillW, setPillW]       = useState(290);

  // Root position — always via transform: translate(x,y) from left:0 top:0
  // so CSS transition: transform is equally smooth in every direction
  const [x, setX] = useState(GAP);
  const [y, setY] = useState(0); // set in useEffect after mount

  // True while a snap animation should run on the transform
  const [animTx, setAnimTx] = useState(false);

  // Drag deltas (added to x/y during drag)
  const [dx, setDx] = useState(0);
  const [dy, setDy] = useState(0);

  // Refs (never stale in callbacks)
  const dragging   = useRef(false);
  const moved      = useRef(false);
  const origin     = useRef({ cx: 0, cy: 0 });
  const liveΔ      = useRef({ dx: 0, dy: 0 });
  const snapXRef   = useRef(GAP);
  const snapYRef   = useRef(0);
  const sideRef    = useRef<Side>('left');
  const expandedRef = useRef(false);
  const pillWRef   = useRef(290);

  // Mount: set real Y and real pillW
  useEffect(() => {
    const pw = getPillW();
    setPillW(pw);
    pillWRef.current = pw;
    const initY = window.innerHeight * 0.82 - SZ / 2;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    setY(initY);
    snapYRef.current = initY;
  }, []);

  // When expanded or side changes → shift X (especially right-side anchor)
  // We do NOT call setAnimTx here — the pill CSS transition handles the size,
  // and the transform shift on expand (right side) is handled below.
  useEffect(() => {
    const newX = computeX(side, expanded, pillWRef.current);
    expandedRef.current = expanded;
    sideRef.current = side;
    if (newX !== snapXRef.current) {
      // X actually moves (right-side expand/collapse) → animate the transform too
      setAnimTx(true);
      const tid = setTimeout(() => setAnimTx(false), SNAP_MS + 100);
      setX(newX);
      snapXRef.current = newX;
      return () => clearTimeout(tid);
    }
    // Left side: X doesn't move, pill just grows in place — no transform animation needed
    setX(newX);
    snapXRef.current = newX;
  }, [expanded, side]);

  // Resize handler
  useEffect(() => {
    const onResize = () => {
      const pw = getPillW();
      setPillW(pw);
      pillWRef.current = pw;
      const nx = computeX(sideRef.current, expandedRef.current, pw);
      setX(nx); snapXRef.current = nx;
      setY(cy => { const ny = clampY(cy); snapYRef.current = ny; return ny; });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // ── Pointer handlers (all stable callbacks, read from refs) ─────────────────
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button,a')) return;
    dragging.current  = true;
    moved.current     = false;
    origin.current    = { cx: e.clientX, cy: e.clientY };
    liveΔ.current     = { dx: 0, dy: 0 };
    setDx(0); setDy(0);
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const ddx = e.clientX - origin.current.cx;
    const ddy = e.clientY - origin.current.cy;
    if (Math.abs(ddx) > 3 || Math.abs(ddy) > 3) moved.current = true;
    liveΔ.current = { dx: ddx, dy: ddy };
    setDx(ddx);
    setDy(ddy);
  }, []);

  const onPointerUp = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;

    if (!moved.current) {
      setDx(0); setDy(0);
      liveΔ.current = { dx: 0, dy: 0 };
      setExpanded(p => !p);
      return;
    }

    const { dx: fdx, dy: fdy } = liveΔ.current;
    const finalX  = snapXRef.current + fdx;
    const finalY  = snapYRef.current + fdy;
    const centerX = finalX + SZ / 2;
    const newSide: Side = centerX < window.innerWidth / 2 ? 'left' : 'right';
    const clampedY = clampY(finalY);
    const newX     = computeX(newSide, expandedRef.current, pillWRef.current);

    setSide(newSide);        sideRef.current = newSide;
    setY(clampedY);          snapYRef.current = clampedY;
    setX(newX);              snapXRef.current = newX;
    setDx(0); setDy(0);
    liveΔ.current = { dx: 0, dy: 0 };

    setAnimTx(true);
    setTimeout(() => setAnimTx(false), SNAP_MS + 100);
  }, []);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const liveX   = x + dx;
  const liveY   = y + dy;
  const isDrag  = dx !== 0 || dy !== 0;
  const isRight = side === 'right' && !isDrag;

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 100,
        // Use Math.round and translate (not translate3d) to prevent blurry layer rasterization on Windows
        transform: `translate(${Math.round(liveX)}px, ${Math.round(liveY)}px)`,
        // Animate transform only during snap/expand-right-shift — never during drag
        transition: !isDrag && animTx ? `transform ${SNAP_MS}ms ${SPRING}` : 'none',
        touchAction: 'none',
        userSelect: 'none',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className="cursor-grab active:cursor-grabbing"
    >
      {/* Wrapper: overflow visible so notification dot isn't clipped */}
      <div style={{ position: 'relative', width: SZ, height: SZ }}>

        {/* ── Notification dot ── */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            // Inset slightly so it sits ON the bubble edge, not outside it
            top: 1, right: 1,
            zIndex: 40,
            width: 13, height: 13,
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
              position: 'absolute', inset: 0,
              borderRadius: '50%',
              backgroundColor: '#dc2626',
              opacity: 0.7,
            }}
          />
          <span style={{
            position: 'relative', width: '100%', height: '100%',
            borderRadius: '50%',
            backgroundColor: '#dc2626',
            border: '2px solid #111',
          }} />
        </span>

        {/* ── Pill shell ──
            KEY FIX: transition is ALWAYS on (just disabled during drag).
            This means when `expanded` changes, the width/height instantly
            has a from-state (the current size) and the browser animates
            to the new size. No React batching issue. */}
        <div
          style={{
            position: 'absolute',
            left: 0, top: 0,
            width: expanded ? pillW : SZ,
            height: expanded ? PILL_H : SZ,
            borderRadius: expanded ? 32 : SZ / 2,
            backgroundColor: 'rgba(26, 26, 26, 0.94)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.3)',
            overflow: 'hidden',
            // Always animated except during drag — this is what makes expand/collapse smooth
            transition: isDrag
              ? 'none'
              : `width ${SNAP_MS}ms ${SPRING}, height ${SNAP_MS}ms ${SPRING}, border-radius ${SNAP_MS * 0.85}ms ${SPRING}`,
          }}
        >
          {/* Link overlay */}
          <Link
            href="/articles/aiesec-workshop"
            style={{
              position: 'absolute', inset: 0, zIndex: 10,
              borderRadius: 'inherit',
              opacity: expanded ? 1 : 0,
              pointerEvents: expanded ? 'auto' : 'none',
            }}
            aria-label="AIESEC Workshop"
            tabIndex={expanded ? 0 : -1}
          />

          {/* Inner container */}
          <div style={{
            position: 'relative',
            width: '100%',
            height: '100%',
          }}>
            {/* Logo */}
            <div style={{
              position: 'absolute',
              top: '50%',
              marginTop: -(SZ / 2),
              left: isRight ? 'auto' : 0,
              right: isRight ? 0 : 'auto',
              width: SZ, height: SZ,
              padding: 6,
              zIndex: 20,
            }}>
              <div style={{
                width: '100%', height: '100%',
                borderRadius: '50%',
                overflow: 'hidden',
                background: '#fff',
                boxShadow: '0 1px 6px rgba(0,0,0,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Image
                  src="/aiesec-logo.png"
                  alt="AIESEC"
                  width={48}
                  height={48}
                  style={{
                    width: '100%', height: '100%',
                    objectFit: 'contain',
                    transform: 'scale(1.2) translateY(-1px)',
                  }}
                />
              </div>
            </div>

            {/* Text */}
            <div style={{
              position: 'absolute',
              top: 0, bottom: 0,
              left: isRight ? 44 : SZ,
              right: isRight ? SZ : 44,
              display: 'flex', flexDirection: 'column', justifyContent: 'center',
              textAlign: isRight ? 'right' : 'left',
              padding: isRight ? '0 6px 0 0' : '0 0 0 4px',
              opacity: expanded ? 1 : 0,
              transform: expanded
                ? 'translateX(0)'
                : isRight ? 'translateX(10px)' : 'translateX(-10px)',
              transition: expanded
                ? `opacity 0.22s ease ${SNAP_MS * 0.38}ms, transform 0.28s ${SPRING} ${SNAP_MS * 0.33}ms`
                : 'opacity 0.12s ease, transform 0.12s ease',
              pointerEvents: 'none',
            }}>
              <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.14em',
                color: 'rgba(150,150,160,1)', textTransform: 'uppercase',
                lineHeight: 1.3, whiteSpace: 'nowrap',
              }}>
                {t('badge')}
              </span>
              <span style={{
                fontSize: 13, fontWeight: 600, color: '#fff',
                lineHeight: 1.35, whiteSpace: 'nowrap',
                overflow: 'hidden', textOverflow: 'ellipsis',
                maxWidth: pillW - SZ - 44,
              }}>
                {t('title')}
              </span>
            </div>

            {/* Dismiss */}
            <button
              onPointerDown={e => e.stopPropagation()}
              onClick={e => { e.preventDefault(); e.stopPropagation(); setExpanded(false); }}
              aria-label="Minimize"
              style={{
                position: 'absolute',
                top: '50%',
                marginTop: -14, // half of height
                right: isRight ? 'auto' : 10,
                left: isRight ? 10 : 'auto',
                zIndex: 30,
                width: 28, height: 28,
                borderRadius: '50%', border: 'none',
                background: 'rgba(255,255,255,0.09)',
                color: 'rgba(160,160,170,1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                opacity: expanded ? 1 : 0,
                transform: expanded ? 'scale(1)' : 'scale(0.4)',
                pointerEvents: expanded ? 'auto' : 'none',
                transition: expanded
                  ? `opacity 0.18s ease ${SNAP_MS * 0.42}ms, transform 0.22s ${SPRING} ${SNAP_MS * 0.38}ms`
                  : 'opacity 0.1s ease, transform 0.1s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.18)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.09)')}
            >
              <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
