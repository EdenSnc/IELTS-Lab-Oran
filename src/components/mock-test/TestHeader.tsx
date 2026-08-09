'use client';

import { useEffect, useRef, useState } from 'react';
import { useTestStore } from '@/lib/store/useTestStore';
import { stopListeningAudio } from '@/lib/audio/listening-audio';
import HelpModal from './HelpModal';

function SpeakerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-current">
      <path d="M4 9v6h4l5 4V5L8 9H4Zm11.5-.8v7.6a5 5 0 0 0 0-7.6Zm0-4.1v2.1a7 7 0 0 1 0 11.6v2.1a9 9 0 0 0 0-15.8Z" />
    </svg>
  );
}

function WifiIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-current">
      <path d="M12 18.8 14.8 16a4 4 0 0 0-5.6 0l2.8 2.8Zm-5.6-5.6 1.4 1.4a6 6 0 0 1 8.4 0l1.4-1.4a8 8 0 0 0-11.2 0ZM3.6 10.4 5 11.8a10 10 0 0 1 14 0l1.4-1.4a12 12 0 0 0-16.8 0Z" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-current">
      <path d="M12 22a2.5 2.5 0 0 0 2.4-2h-4.8A2.5 2.5 0 0 0 12 22Zm7-6-2-2.5V9a5 5 0 0 0-4-4.9V3a1 1 0 1 0-2 0v1.1A5 5 0 0 0 7 9v4.5L5 16v2h14v-2Z" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-7 w-7 fill-current">
      <path d="M4 6h16v2H4V6Zm0 5h16v2H4v-2Zm0 5h16v2H4v-2Z" />
    </svg>
  );
}

function NotesIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-7 w-7 fill-none stroke-current" strokeWidth="1.8">
      <path d="M5 3.8h10.2L19 7.6V20H5V3.8Z" />
      <path d="M15 3.8v4h4M8 12h8M8 15.5h6" />
      <path d="m14.5 19 4.8-4.8 1.5 1.5-4.8 4.8-2 .5.5-2Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function TestHeader() {
  const timeLeft = useTestStore((state) => state.timeLeft);
  const setTimeLeft = useTestStore((state) => state.setTimeLeft);
  const isHidden = useTestStore((state) => state.isHidden);
  const setHidden = useTestStore((state) => state.setHidden);
  const activeSection = useTestStore((state) => state.activeSection);
  const isNotesOpen = useTestStore((state) => state.isNotesOpen);
  const setNotesOpen = useTestStore((state) => state.setNotesOpen);
  const textSize = useTestStore((state) => state.textSize);
  const setTextSize = useTestStore((state) => state.setTextSize);
  const colorScheme = useTestStore((state) => state.colorScheme);
  const setColorScheme = useTestStore((state) => state.setColorScheme);

  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [dismissedWarning, setDismissedWarning] = useState<5 | 10 | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const initialTimeLeftRef = useRef(timeLeft);
  const deadlineRef = useRef(0);

  useEffect(() => {
    deadlineRef.current = Date.now() + (initialTimeLeftRef.current * 1000);
    let finished = false;
    const finishAtDeadline = () => {
      if (finished) return;
      finished = true;
      const state = useTestStore.getState();
      state.setTimeLeft(0);
      if (state.activeSection === 'listening') stopListeningAudio();
      if (state.activeSection) state.completeSection(state.activeSection);
      state.setTestPhase('instructions');
    };
    const updateClock = () => {
      const millisecondsLeft = deadlineRef.current - Date.now();
      if (millisecondsLeft <= 0) finishAtDeadline();
      else useTestStore.getState().setTimeLeft(millisecondsLeft / 1000);
    };
    const timer = window.setInterval(updateClock, 1000);
    const cutoff = window.setTimeout(
      finishAtDeadline,
      Math.max(0, deadlineRef.current - Date.now()),
    );
    document.addEventListener('visibilitychange', updateClock);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(cutoff);
      document.removeEventListener('visibilitychange', updateClock);
    };
  }, [setTimeLeft]);

  useEffect(() => {
    if (!showMenu) return;
    const close = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setShowMenu(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [showMenu]);

  const timeWarning =
    timeLeft <= 300
      ? dismissedWarning === 5 ? null : 5
      : timeLeft <= 600
        ? dismissedWarning === 10 ? null : 10
        : null;
  const minutes = Math.max(0, Math.ceil(timeLeft / 60));
  const remainingLabel = timeLeft > 0 && timeLeft <= 60
    ? '1 min left'
    : `${minutes} min left`;
  const warningClass = timeLeft <= 300
    ? 'text-[#c10037] animate-pulse'
    : timeLeft <= 600
      ? 'text-[#8a3f00]'
      : 'text-black';

  const openMenuPanel = (panel: 'help' | 'settings' | 'hide') => {
    setShowMenu(false);
    if (panel === 'help') setShowHelpModal(true);
    if (panel === 'settings') setShowSettingsModal(true);
    if (panel === 'hide') setHidden(true);
  };

  return (
    <>
      {isHidden && (
        <div className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-[#707070]">
          <button
            type="button"
            onClick={() => setHidden(false)}
            className="border border-black bg-white px-8 py-3 text-base font-bold text-black hover:bg-gray-100"
          >
            Resume test
          </button>
        </div>
      )}

      <header className="ielts-test-topbar">
        <div className="ielts-header-left">
          <strong className="ielts-header-brand">IELTS Lab</strong>
          {activeSection === 'listening' && (
            <div className="ielts-audio-status" aria-live="polite">
              <SpeakerIcon />
              <span>Audio is playing</span>
            </div>
          )}
        </div>

        <div className={`ielts-candidate-clock ${warningClass}`}>
          <span
            className="ielts-timer"
            aria-label={`Time remaining: ${remainingLabel}`}
          >
            {remainingLabel}
          </span>
        </div>

        <div className="ielts-header-actions flex shrink-0 items-center gap-3 sm:gap-5">
          <button
            type="button"
            onClick={() => setShowFinishModal(true)}
            className="ielts-finish-button"
          >
            Finish test
          </button>
          <button
            type="button"
            disabled
            className="hidden text-black sm:inline-flex disabled:cursor-default"
            title="Network Connection (disabled for the familiarisation test)"
            aria-label="Network connection status"
          >
            <WifiIcon />
          </button>
          <button
            type="button"
            disabled
            className="hidden text-black sm:inline-flex disabled:cursor-default"
            title="Notifications (disabled for the familiarisation test)"
            aria-label="Notifications"
          >
            <BellIcon />
          </button>
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setShowMenu((current) => !current)}
              aria-expanded={showMenu}
              aria-label="Open test menu"
              className="ielts-header-icon-button"
            >
              <MenuIcon />
            </button>
            {showMenu && (
              <div className="ielts-test-menu" role="menu">
                <button type="button" role="menuitem" onClick={() => openMenuPanel('help')}>Help</button>
                <button type="button" role="menuitem" onClick={() => openMenuPanel('settings')}>Settings</button>
                <button type="button" role="menuitem" onClick={() => openMenuPanel('hide')}>Hide test</button>
              </div>
            )}
          </div>
          <button
            type="button"
            title={isNotesOpen ? 'Hide notes' : 'Show notes'}
            aria-label={isNotesOpen ? 'Hide notes' : 'Show notes'}
            aria-pressed={isNotesOpen}
            onClick={() => setNotesOpen(!isNotesOpen)}
            className="ielts-header-icon-button"
          >
            <NotesIcon />
          </button>
        </div>
      </header>

      {showFinishModal && (
        <div className="ielts-modal-backdrop">
          <div role="dialog" aria-modal="true" aria-labelledby="finish-test-title" className="ielts-modal-card max-w-md text-center">
            <h2 id="finish-test-title" className="text-xl font-bold">Finish test?</h2>
            <p className="mt-3 text-[#54585a]">
              You will not be able to return to this section after you finish it.
            </p>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => setShowFinishModal(false)} className="ielts-secondary-button flex-1">
                Go back
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowFinishModal(false);
                  if (activeSection === 'listening') stopListeningAudio();
                  if (activeSection) useTestStore.getState().completeSection(activeSection);
                  useTestStore.getState().setTestPhase('instructions');
                }}
                className="ielts-primary-button flex-1"
              >
                Finish
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettingsModal && (
        <div className="ielts-modal-backdrop">
          <div role="dialog" aria-modal="true" aria-labelledby="settings-title" className="ielts-modal-card max-w-lg">
            <div className="flex items-center justify-between">
              <h2 id="settings-title" className="text-2xl font-bold">Settings</h2>
              <button type="button" onClick={() => setShowSettingsModal(false)} aria-label="Close settings" className="text-3xl leading-none">
                &times;
              </button>
            </div>
            <fieldset className="mt-6">
              <legend className="mb-3 text-lg font-bold">Text size</legend>
              {(['standard', 'large', 'extra-large'] as const).map((size) => (
                <label key={size} className="flex cursor-pointer items-center gap-3 py-1.5">
                  <input type="radio" name="textSize" checked={textSize === size} onChange={() => setTextSize(size)} />
                  <span className={size === 'large' ? 'text-lg' : size === 'extra-large' ? 'text-xl' : 'text-base'}>
                    {size === 'extra-large' ? 'Extra large' : size[0].toUpperCase() + size.slice(1)}
                  </span>
                </label>
              ))}
            </fieldset>
            <fieldset className="mt-6">
              <legend className="mb-3 text-lg font-bold">Colours</legend>
              {([
                ['standard', 'Standard', 'bg-white text-black'],
                ['yellow-black', 'Yellow on black', 'bg-black text-yellow-300'],
                ['white-blue', 'White on blue', 'bg-[#002f6c] text-white'],
              ] as const).map(([scheme, label, swatchClass]) => (
                <label key={scheme} className="flex cursor-pointer items-center gap-3 py-1.5">
                  <input type="radio" name="colorScheme" checked={colorScheme === scheme} onChange={() => setColorScheme(scheme)} />
                  <span
                    aria-hidden="true"
                    className={`inline-flex h-8 w-12 items-center justify-center border border-[#707070] text-base font-bold ${swatchClass}`}
                  >
                    Aa
                  </span>
                  <span>{label}</span>
                </label>
              ))}
            </fieldset>
            <div className="mt-8 flex justify-end border-t border-gray-300 pt-4">
              <button type="button" onClick={() => setShowSettingsModal(false)} className="ielts-primary-button">
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {timeWarning !== null && (
        <div className="ielts-modal-backdrop z-[80]">
          <div role="alertdialog" aria-modal="true" className="ielts-modal-card max-w-sm text-center">
            <h2 className="text-xl font-bold text-[#c10037]">Time warning</h2>
            <p className="mt-3 font-semibold">You have {timeWarning} minutes remaining.</p>
            <button type="button" onClick={() => setDismissedWarning(timeWarning)} className="ielts-primary-button mt-6 w-full">
              OK
            </button>
          </div>
        </div>
      )}

      {showHelpModal && (
        <HelpModal activeSection={activeSection} onClose={() => setShowHelpModal(false)} />
      )}

    </>
  );
}
