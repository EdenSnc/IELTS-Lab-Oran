'use client';

import { useTestStore } from '@/lib/store/useTestStore';

export default function NotesSidebar() {
  const activeSection = useTestStore((state) => state.activeSection);
  const notes = useTestStore((state) => (
    state.activeSection ? state.notes[state.activeSection] : []
  ));
  const setNotesOpen = useTestStore((state) => state.setNotesOpen);
  const updateNote = useTestStore((state) => state.updateNote);
  const deleteNote = useTestStore((state) => state.deleteNote);

  if (!activeSection) return null;

  return (
    <aside className="ielts-notes-sidebar fixed bottom-[54px] right-0 top-[63px] z-50 flex w-[min(22rem,90vw)] flex-col border-l border-[#707070] bg-[#ededed] shadow-xl md:static md:z-auto md:w-[20rem] md:shrink-0 md:shadow-none">
      <div className="flex h-12 items-center justify-between border-b border-[#b7b7b7] px-4">
        <h2 className="font-bold">Notes</h2>
        <button
          type="button"
          onClick={() => setNotesOpen(false)}
          aria-label="Hide notes"
          className="p-1 text-2xl text-gray-600 hover:text-black"
        >
          ×
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {notes.length === 0 && (
          <div className="mt-10 text-center text-sm text-gray-500">
            <p className="font-bold text-gray-700">Your private notes will show here</p>
            <p className="mt-2">Select text, right-click, then choose Add note.</p>
          </div>
        )}

        {notes.map((note) => (
          <section key={note.id} className="border border-[#b7b7b7] bg-white p-3">
            <blockquote className="mb-3 border-l-2 border-[#c10037] pl-3 text-xs text-gray-600">
              {note.quote}
            </blockquote>
            <textarea
              value={note.text}
              onChange={(event) => updateNote(activeSection, note.id, event.target.value)}
              placeholder="Type your note"
              rows={4}
              className="w-full resize-y rounded-sm border border-gray-400 bg-white p-2 text-sm outline-none focus:border-[#00205b] focus:ring-1 focus:ring-[#00205b]"
            />
            <button
              type="button"
              onClick={() => deleteNote(activeSection, note.id)}
              className="mt-2 text-xs font-bold text-red-700 hover:underline"
            >
              Delete note
            </button>
          </section>
        ))}
      </div>
    </aside>
  );
}
