'use client';

import { useState } from 'react';
import type { DeliveryTest } from '@/lib/content/delivery-types';
import { useTestStore, IELTSSection } from '@/lib/store/useTestStore';
import { startListeningAudio } from '@/lib/audio/listening-audio';

const SECTION_VIDEOS: Record<IELTSSection, string> = {
  listening: '/listening.mp4',
  reading: '/reading.mp4',
  writing: '/writing.mp4',
};

export default function TestInstructions({ test }: { test: DeliveryTest }) {
  const startSection = useTestStore((state) => state.startSection);
  const completedSections = useTestStore((state) => state.completedSections);
  const resetTest = useTestStore((state) => state.resetTest);
  const setTestPhase = useTestStore((state) => state.setTestPhase);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [confirmedSections, setConfirmedSections] = useState<Record<string, boolean>>({});
  const sections = test.sections.flatMap((section) => {
    const normalizedId = section.skill.toLowerCase();
    if (
      normalizedId !== 'listening'
      && normalizedId !== 'reading'
      && normalizedId !== 'writing'
    ) return [];
    const id: IELTSSection = normalizedId;
    const durationSeconds = section.timeLimitSeconds ?? 60 * 60;
    return [{
      id,
      title: id[0].toUpperCase() + id.slice(1),
      timing: `${Math.round(durationSeconds / 60)} minutes`,
      durationSeconds,
      videoSrc: SECTION_VIDEOS[id],
    }];
  });
  const firstIncompleteId = sections.find((section) => !completedSections[section.id])?.id;
  const allCompleted = sections.length > 0
    && sections.every((section) => completedSections[section.id]);

  const toggleAccordion = (sectionId: string) => {
    const willOpen = expandedSection !== sectionId;
    setExpandedSection(willOpen ? sectionId : null);
    if (willOpen) {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        void document.documentElement.requestFullscreen().catch(() => {
          // Fullscreen is optional and may be denied by browser or device policy.
        });
      }
    }
  };

  const handleConfirm = (sectionId: string) => {
    setConfirmedSections((prev) => ({ ...prev, [sectionId]: true }));
  };

  const confirmReset = () => {
    if (window.confirm('Reset this test? All saved answers, progress and scores on this device will be deleted.')) {
      resetTest();
      setExpandedSection(null);
      setConfirmedSections({});
    }
  };

  const handleStart = (section: IELTSSection, durationSeconds: number) => {
    if (section === 'listening') {
      const audioUrl = test.sections
        .find((candidate) => candidate.skill === 'LISTENING')
        ?.parts.flatMap((part) => part.stimuli)
        .find((stimulus) => stimulus.type === 'AUDIO_TRACK')
        ?.assetUrl;
      if (audioUrl) void startListeningAudio(audioUrl).catch(() => {});
    }
    startSection(section, durationSeconds);
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-y-auto bg-white text-black">
      <div className="flex h-[42px] shrink-0 items-center border-b border-black px-6 text-sm font-bold">
        IELTS Lab
      </div>

      <div className="mx-auto w-full max-w-[1040px] flex-1 px-5 py-7">
        
        <h1 className="mb-6 text-[28px] font-normal text-[#c10037]">IELTS Familiarisation Test</h1>
        
        <div className="mb-7">
          <p className="mb-2 font-bold text-[#333]">Today</p>
          <hr className="border-[#707070]" />
        </div>

        <div className="space-y-4">
          {sections.map((section) => {
            const isExpanded = expandedSection === section.id;
            const isConfirmed = confirmedSections[section.id];
            const isCompleted = completedSections[section.id];
            const isAvailable = section.id === firstIncompleteId;

            return (
              <div key={section.id} className="test-instructions-card overflow-hidden rounded-[5px] border border-[#707070] bg-white">
                
                {/* Module Header */}
                <div className="test-instructions-card-header px-9 py-8">
                  <h2 className="mb-2 text-[22px] font-bold text-[#333]">{section.title}</h2>
                  
                  {isCompleted ? (
                    <h4 className="text-[#a3c942] font-bold mb-2 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
                      </svg>
                      Completed
                    </h4>
                  ) : (
                    <h4 className="text-[#c10037] font-bold mb-2">Not completed</h4>
                  )}

                  <p className="mb-4 text-[#54585a]">Timing: {section.timing}</p>

                  {/* The official flow exposes the next available test information only. */}
                  {!isCompleted && isAvailable && (
                    <button 
                      type="button"
                      onClick={() => toggleAccordion(section.id)}
                      aria-expanded={isExpanded}
                      aria-controls={`test-information-${section.id}`}
                      className="touch-manipulation flex w-full items-center gap-2 border border-[#b7b7b7] bg-[#f7f7f7] px-4 py-3 text-left hover:bg-[#efefef]"
                    >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 24 24" 
                      fill="currentColor" 
                      className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    >
                      <path fillRule="evenodd" d="M12.53 16.28a.75.75 0 01-1.06 0l-7.5-7.5a.75.75 0 011.06-1.06L12 14.69l6.97-6.97a.75.75 0 111.06 1.06l-7.5 7.5z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-800">Test information.</span>
                    <span className={`ml-2 ${isConfirmed ? 'text-[#a3c942]' : 'text-[#c10037]'}`}>
                      {isConfirmed ? 'Confirmed.' : 'Not confirmed.'}
                    </span>
                  </button>
                  )}
                </div>

                {/* Accordion Content */}
                {isExpanded && isAvailable && (
                  <div id={`test-information-${section.id}`} className="test-information-panel scroll-mt-2 border-t border-[#d8d8d8] bg-[#f7f7f7] px-9 pb-8">
                    <div className="py-6">
                      <video 
                        controls 
                        playsInline
                        className="w-full bg-black rounded-sm max-h-[400px]"
                        preload="metadata"
                      >
                        <source src={section.videoSrc} type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                    </div>
                    
                    <div className="mb-4">
                      <h4 className="text-lg font-bold mb-2">Ready?</h4>
                      <p className="text-gray-600 mb-4">Please confirm that you have understood the instructions above.</p>
                      
                      <button 
                        type="button"
                        onClick={() => handleConfirm(section.id)}
                        disabled={isConfirmed}
                        className={`px-4 py-2 font-bold flex items-center gap-2 ${
                          isConfirmed 
                            ? 'bg-gray-200 text-gray-500 cursor-default' 
                            : 'bg-black text-white hover:bg-gray-800'
                        }`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                          <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
                        </svg>
                        I confirm
                      </button>
                    </div>

                    {isConfirmed && (
                      <div className="mt-6 flex justify-end">
                        <button 
                          type="button"
                          onClick={() => handleStart(section.id, section.durationSeconds)}
                          className="px-6 py-2 bg-black text-white font-bold rounded-sm hover:bg-gray-800 flex items-center gap-2"
                        >
                          Start {section.title}
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          <div className="test-instructions-card overflow-hidden rounded-[5px] border border-[#707070] bg-white">
            <div className="test-instructions-card-header px-9 py-8">
              <h2 className="mb-2 text-[22px] font-bold text-[#333]">Speaking</h2>
              <h4 className="mb-2 font-bold text-[#707070]">Coming soon</h4>
              <p className="text-[#54585a]">The Speaking practice section is not yet available.</p>
            </div>
          </div>
        </div>

        <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-[#707070] pt-5">
          <button
            type="button"
            onClick={confirmReset}
            className="border border-black bg-white px-4 py-2 font-bold text-black hover:bg-[#eeeeee]"
          >
            Reset familiarisation test
          </button>
          {allCompleted && (
            <button
              type="button"
              onClick={() => setTestPhase('results')}
              className="bg-black px-6 py-2 font-bold text-white hover:bg-[#333333]"
            >
              View your results
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
