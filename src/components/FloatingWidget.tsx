'use client';
// Loaded via FloatingWidgetClient (dynamic ssr:false) — no hydration issues

import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

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

function clampY(y: number): number {
  return Math.max(GAP, Math.min(window.innerHeight - SZ - GAP, y));
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function FloatingWidget() {
  const t = useTranslations('EventWidget');

  const [expanded, setExpanded] = useState(false);
  const [side, setSide]         = useState<Side>('left');
  const [pillW, setPillW]       = useState(320);
  
  // Base Y position (X is strictly handled by side = left/right)
  const [top, setTop] = useState(0);

  // Transform offsets (used ONLY for dragging and FLIP snapping)
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);

  const [isSnapAnim, setIsSnapAnim] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  // Refs
  const moved      = useRef(false);
  const origin     = useRef({ cx: 0, cy: 0 });
  const liveΔ      = useRef({ dx: 0, dy: 0 });
  const sideRef    = useRef<Side>('left');
  const topRef     = useRef(0);
  const expandedRef = useRef(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPillW(getPillW());
    const initY = window.innerHeight * 0.82 - SZ / 2;
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
    setTop(initY);
    topRef.current = initY;
  }, []);

  useEffect(() => {
    const onResize = () => {
      setPillW(getPillW());
      setTop(cy => { const ny = clampY(cy); topRef.current = ny; return ny; });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button,a')) return;
    setIsDragging(true);
    setIsSnapAnim(false); // Disable transitions while dragging
    moved.current     = false;
    origin.current    = { cx: e.clientX, cy: e.clientY };
    liveΔ.current     = { dx: 0, dy: 0 };
    setTx(0); setTy(0);
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!liveΔ.current) return; 
    if (e.buttons === 0) return;
    const ddx = e.clientX - origin.current.cx;
    const ddy = e.clientY - origin.current.cy;
    if (Math.abs(ddx) > 3 || Math.abs(ddy) > 3) moved.current = true;
    
    // Prevent dragging if expanded
    if (expandedRef.current) return;

    liveΔ.current = { dx: ddx, dy: ddy };
    setTx(ddx); setTy(ddy);
  }, []);

  const onPointerUp = useCallback(() => {
    setIsDragging(false);

    if (!moved.current) {
      liveΔ.current = { dx: 0, dy: 0 };
      setTx(0); setTy(0);
      setIsSnapAnim(true); // Re-enable transitions for expansion
      const newExp = !expandedRef.current;
      setExpanded(newExp);
      expandedRef.current = newExp;
      return;
    }

    // --- FLIP Animation Logic for flawless snap ---
    const { dx, dy } = liveΔ.current;
    // 1. Where is the pill visually right now on the screen?
    const baseX = sideRef.current === 'left' ? GAP : window.innerWidth - GAP - SZ;
    const currentX = baseX + dx;
    const currentY = topRef.current + dy;

    // 2. Where should it snap to?
    const centerX = currentX + SZ / 2;
    const newSide: Side = centerX < window.innerWidth / 2 ? 'left' : 'right';
    const newTop = clampY(currentY);
    const newBaseX = newSide === 'left' ? GAP : window.innerWidth - GAP - SZ;

    // 3. How far is the new snapped base from the current visual position?
    const invertX = currentX - newBaseX;
    const invertY = currentY - newTop;

    // 4. instantly move the base to the new edge, but apply the invert transform
    // so it visually stays EXACTLY under the user's cursor (no flickering)
    sideRef.current = newSide; setSide(newSide);
    topRef.current = newTop;   setTop(newTop);
    setTx(invertX);
    setTy(invertY);
    liveΔ.current = { dx: 0, dy: 0 };

    // 5. In the next frame, turn the spring transition back on and animate transform to 0
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsSnapAnim(true);
        setTx(0);
        setTy(0);
      });
    });
  }, []);

  const isRight = side === 'right';

  return (
    <div
      style={{
        position: 'fixed',
        left: side === 'left' ? GAP : 'auto',
        right: side === 'right' ? GAP : 'auto',
        top: Math.round(top),
        zIndex: 100,
        // GPU transform for dragging and snapping
        transform: `translate(${Math.round(tx)}px, ${Math.round(ty)}px)`,
        // Animate transform only during snap/expand-right-shift — never during drag
        transition: isSnapAnim ? `transform ${SNAP_MS}ms ${SPRING}` : 'none',
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
        {/* Positioned absolutely outside the inner container flow */}
        <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 1, 
          // If on the right side, the dot should still probably be on the top-right of the logo.
          // Since the logo is always on the right when isRight, right: 1 works perfectly.
          right: isRight ? 1 : 1,
          left: isRight ? 'auto' : 'auto', // wait, if it's on left side, logo is on left, we want dot on top right of logo. So left: SZ - 14? 
          // Actually, let's keep it anchored to the logo wrapper's position!
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
          top: 0,
          left: side === 'left' ? 0 : 'auto',
          right: side === 'right' ? 0 : 'auto',
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
          transition: (isDragging || !isSnapAnim)
            ? 'none'
            : `width ${SNAP_MS}ms ${SPRING}, height ${SNAP_MS}ms ${SPRING}, border-radius ${SNAP_MS * 0.85}ms ${SPRING}`,
        }}
      >
        {/* ── Link overlay ── */}
        <Link
        href="/articles/simulation-platform"
        style={{
          position: 'absolute', inset: 0, zIndex: 10,
          borderRadius: 'inherit',
          opacity: expanded ? 1 : 0,
          pointerEvents: expanded ? 'auto' : 'none',
        }}
        aria-label="AIESEC Workshop"
        tabIndex={expanded ? 0 : -1}
      />

      {/* ── Inner container ── */}
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
              left: isRight ? 'auto' : -1,
              right: isRight ? -1 : 'auto',
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
                color: '#f59e0b',
              }}>
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>

            {/* Text */}
            <div style={{
              position: 'absolute',
              top: 0, bottom: 0,
              width: pillW - SZ - 44, // Fixed width prevents jitter during expansion
              ...(isRight ? { right: SZ } : { left: SZ }),
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
              onClick={e => {
                e.preventDefault(); 
                e.stopPropagation(); 
                setExpanded(false);
                expandedRef.current = false;
              }}
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
