'use client';

import { useEffect } from 'react';
import type { DeliveryTest } from '@/lib/content/delivery-types';
import type { ListeningAudioResolution } from '@/lib/content/delivery-types';
import { useTestStore } from '@/lib/store/useTestStore';
import TestHeader from '@/components/mock-test/TestHeader';
import TestFooterNav from '@/components/mock-test/TestFooterNav';
import SplitPane from '@/components/mock-test/SplitPane';
import TestInstructions from '@/components/mock-test/TestInstructions';
import ListeningLayout from '@/components/mock-test/ListeningLayout';
import WritingLayout from '@/components/mock-test/WritingLayout';
import StrictDRM from '@/components/mock-test/StrictDRM';
import NotesSidebar from '@/components/mock-test/NotesSidebar';
import DiagnosticResults from '@/components/mock-test/DiagnosticResults';

export default function MockTestClient({
  test,
  onFinish,
  resolveListeningAudio,
}: {
  test: DeliveryTest;
  onFinish?: () => void | Promise<void>;
  resolveListeningAudio?: (stimulusId: string) => Promise<ListeningAudioResolution>;
}) {
  const testPhase = useTestStore((state) => state.testPhase);
  const activeSection = useTestStore((state) => state.activeSection);
  const textSize = useTestStore((state) => state.textSize);
  const colorScheme = useTestStore((state) => state.colorScheme);
  const isNotesOpen = useTestStore((state) => state.isNotesOpen);
  const listening = test.sections.find((section) => section.skill === 'LISTENING');
  const reading = test.sections.find((section) => section.skill === 'READING');
  const writing = test.sections.find((section) => section.skill === 'WRITING');

  useEffect(() => {
    if (!activeSection || testPhase !== 'exam') return;
    const section = test.sections.find(
      (candidate) => candidate.skill.toLowerCase() === activeSection,
    );
    const images = (section?.parts ?? [])
      .flatMap((part) => part.stimuli)
      .filter((stimulus) => stimulus.assetUrl && stimulus.type !== 'AUDIO_TRACK')
      .map((stimulus) => {
        const image = new window.Image();
        image.decoding = 'async';
        image.src = stimulus.assetUrl!;
        return image;
      });
    return () => {
      images.forEach((image) => { image.onload = null; image.onerror = null; });
    };
  }, [activeSection, test.sections, testPhase]);

  // StrictDRM is always mounted, including on the instructions screen.
  if (testPhase === 'instructions') {
    return (
      <>
        <StrictDRM />
        <TestInstructions test={test} resolveListeningAudio={resolveListeningAudio} />
      </>
    );
  }

  if (testPhase === 'results') {
    return <DiagnosticResults test={test} />;
  }

  // Map state to Tailwind classes
  const textSizeClass = 
    textSize === 'large' ? 'text-lg' : 
    textSize === 'extra-large' ? 'text-xl' : 
    'text-base';

  const colorClass = 
    colorScheme === 'yellow-black' ? 'bg-black text-yellow-400' :
    colorScheme === 'white-blue' ? 'bg-[#002f6c] text-white' :
    'bg-white text-black';

  return (
    <>
      <StrictDRM />
      <div
        className="ielts-test-shell relative flex h-[100dvh] w-screen flex-col overflow-hidden bg-white text-black"
        data-color-scheme={colorScheme}
      >
      <TestHeader onFinish={onFinish} />
      
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <main className={`flex min-w-0 flex-1 overflow-hidden ${textSizeClass} ${colorClass}`}>
          {activeSection === 'listening' && listening && (
            <ListeningLayout section={listening} resolveListeningAudio={resolveListeningAudio} />
          )}
          {activeSection === 'reading' && reading && <SplitPane section={reading} />}
          {activeSection === 'writing' && writing && <WritingLayout section={writing} />}
          {!activeSection && (
            <div className="flex flex-1 items-center justify-center text-gray-400">
              No module selected. Please return to the dashboard.
            </div>
          )}
        </main>
        {isNotesOpen && <NotesSidebar />}
      </div>

        <TestFooterNav test={test} />
      </div>
    </>
  );
}
