'use client';

import { useState } from 'react';
import type { IELTSSection } from '@/lib/store/useTestStore';

interface HelpModalProps {
  activeSection: IELTSSection | null;
  onClose: () => void;
}

const TASK_HELP: Record<IELTSSection, { title: string; points: string[] }> = {
  listening: {
    title: 'Listening task help',
    points: [
      'The recording plays once. Enter answers while you listen.',
      'Type completion answers directly into the numbered boxes.',
      'For matching tasks, drag an option to a numbered target. On a touch screen, tap the option and then its target.',
      'Use the question numbers or arrow buttons at the bottom to move through the current part.',
    ],
  },
  reading: {
    title: 'Reading task help',
    points: [
      'The passage is shown beside the questions on larger screens and above them on smaller screens.',
      'Use the divider to resize the passage and question panes on a desktop.',
      'Select passage or question text and right-click to highlight it or attach a private note.',
      'Use the question numbers or arrow buttons at the bottom to move between questions.',
    ],
  },
  writing: {
    title: 'Writing task help',
    points: [
      'Complete both tasks. Task 2 contributes twice as much as Task 1 to the Writing score.',
      'The prompt is shown beside the answer area on larger screens and above it on smaller screens.',
      'Your current word count appears below the answer box.',
      'Use Task 1 and Task 2 in the lower bar to switch tasks.',
    ],
  },
};

export default function HelpModal({ activeSection, onClose }: HelpModalProps) {
  const [activeTab, setActiveTab] = useState<'task' | 'test' | 'information'>('task');
  const taskHelp = activeSection ? TASK_HELP[activeSection] : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="test-help-title"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
    >
      <div className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-sm bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-4">
          <h2 id="test-help-title" className="text-xl font-bold text-gray-900">Help</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close help"
            className="text-2xl leading-none text-gray-500 hover:text-black"
          >
            ×
          </button>
        </div>

        <div className="flex gap-6 border-b border-gray-200 bg-gray-50 px-6 pt-2">
          {([
            ['task', 'Task help'],
            ['test', 'Test help'],
            ['information', 'Information'],
          ] as const).map(([id, label]) => (
            <button
              type="button"
              key={id}
              onClick={() => setActiveTab(id)}
              className={`border-b-2 pb-2 text-sm font-bold ${
                activeTab === id
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-black'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 text-sm leading-relaxed text-[#1a1a1a]">
          {activeTab === 'task' && (
            <section>
              <h3 className="mb-3 text-base font-bold">
                {taskHelp?.title ?? 'Task help'}
              </h3>
              {taskHelp ? (
                <ul className="list-disc space-y-2 pl-5">
                  {taskHelp.points.map((point) => <li key={point}>{point}</li>)}
                </ul>
              ) : (
                <p>Start a section to see help for the current task.</p>
              )}
            </section>
          )}

          {activeTab === 'test' && (
            <section>
              <h3 className="mb-3 text-base font-bold">Using the test player</h3>
              <ul className="list-disc space-y-2 pl-5">
                <li>The timer shows the remaining time for the current section.</li>
                <li>Use Hide if you need to temporarily conceal the test content.</li>
                <li>Use Settings to change text size and colour contrast.</li>
                <li>Use the pencil icon to show or hide your private notes.</li>
                <li>The lower bar shows the current part or task and its question numbers.</li>
                <li>Previous and Next move one question at a time.</li>
              </ul>
            </section>
          )}

          {activeTab === 'information' && (
            <section>
              <h3 className="mb-3 text-base font-bold">Highlighting and notes</h3>
              <ul className="list-disc space-y-2 pl-5">
                <li>In Listening and Reading, select relevant text, right-click it, then choose Highlight or Add note.</li>
                <li>Your notes are private and can be opened with the pencil icon.</li>
                <li>Highlights and notes do not affect scoring.</li>
                <li>Highlighting is not offered in Writing. Writing responses remain plain text, with spellcheck and grammar correction disabled.</li>
              </ul>
            </section>
          )}
        </div>

        <div className="flex justify-end border-t border-gray-200 bg-gray-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-sm bg-black px-6 py-2 font-bold text-white hover:bg-gray-800"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
