import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type IELTSSection = 'listening' | 'reading' | 'writing';
export type TestAnswerMap = Record<IELTSSection, Record<number, string>>;
export type ReviewMap = Record<IELTSSection, Record<number, boolean>>;
export type TestNote = {
  id: string;
  quote: string;
  text: string;
};
export type TestNoteMap = Record<IELTSSection, TestNote[]>;

const emptyAnswers = (): TestAnswerMap => ({
  listening: {},
  reading: {},
  writing: {},
});

const emptyReviewMap = (): ReviewMap => ({
  listening: {},
  reading: {},
  writing: {},
});

const emptyNotes = (): TestNoteMap => ({
  listening: [],
  reading: [],
  writing: [],
});

interface TestState {
  currentQuestionId: number;
  timeLeft: number;
  answers: TestAnswerMap;
  markedForReview: ReviewMap;
  notes: TestNoteMap;
  isNotesOpen: boolean;
  textSize: 'standard' | 'large' | 'extra-large';
  colorScheme: 'standard' | 'yellow-black' | 'white-blue';
  isHidden: boolean;
  splitRatio: number;
  testPhase: 'instructions' | 'exam' | 'results';
  activeSection: IELTSSection | null;
  completedSections: Record<IELTSSection, boolean>;

  setCurrentQuestion: (id: number) => void;
  setAnswer: (section: IELTSSection, id: number, answer: string) => void;
  toggleReview: (section: IELTSSection, id: number) => void;
  addNote: (section: IELTSSection, quote: string) => void;
  updateNote: (section: IELTSSection, id: string, text: string) => void;
  deleteNote: (section: IELTSSection, id: string) => void;
  setNotesOpen: (open: boolean) => void;
  setTextSize: (size: 'standard' | 'large' | 'extra-large') => void;
  setColorScheme: (scheme: 'standard' | 'yellow-black' | 'white-blue') => void;
  setHidden: (hidden: boolean) => void;
  setSplitRatio: (ratio: number) => void;
  setTestPhase: (phase: 'instructions' | 'exam' | 'results') => void;
  startSection: (section: IELTSSection, durationSeconds: number) => void;
  completeSection: (section: IELTSSection) => void;
  decrementTime: () => void;
  resetTest: () => void;
}

export const useTestStore = create<TestState>()(
  persist(
    (set) => ({
      currentQuestionId: 1,
      timeLeft: 3600, // 60 minutes
      answers: emptyAnswers(),
      markedForReview: emptyReviewMap(),
      notes: emptyNotes(),
      isNotesOpen: false,
      textSize: 'standard',
      colorScheme: 'standard',
      isHidden: false,
      splitRatio: 50,
      testPhase: 'instructions',
      activeSection: null,
      completedSections: { listening: false, reading: false, writing: false },

      setCurrentQuestion: (id) => set({ currentQuestionId: id }),
      setAnswer: (section, id, answer) => set((state) => ({
        answers: {
          ...state.answers,
          [section]: { ...state.answers[section], [id]: answer },
        },
      })),
      toggleReview: (section, id) => set((state) => ({
        markedForReview: {
          ...state.markedForReview,
          [section]: {
            ...state.markedForReview[section],
            [id]: !state.markedForReview[section][id],
          },
        },
      })),
      addNote: (section, quote) => set((state) => ({
        notes: {
          ...state.notes,
          [section]: [
            ...state.notes[section],
            {
              id: `${Date.now()}-${state.notes[section].length}`,
              quote,
              text: '',
            },
          ],
        },
        isNotesOpen: true,
      })),
      updateNote: (section, id, text) => set((state) => ({
        notes: {
          ...state.notes,
          [section]: state.notes[section].map((note) => (
            note.id === id ? { ...note, text } : note
          )),
        },
      })),
      deleteNote: (section, id) => set((state) => ({
        notes: {
          ...state.notes,
          [section]: state.notes[section].filter((note) => note.id !== id),
        },
      })),
      setNotesOpen: (open) => set({ isNotesOpen: open }),
      setTextSize: (size) => set({ textSize: size }),
      setColorScheme: (scheme) => set({ colorScheme: scheme }),
      setHidden: (hidden) => set({ isHidden: hidden }),
      setSplitRatio: (ratio) => set({ splitRatio: Math.max(25, Math.min(75, ratio)) }),
      setTestPhase: (phase) => set({ testPhase: phase }),
      startSection: (section, durationSeconds) => set({
        activeSection: section,
        currentQuestionId: 1,
        timeLeft: durationSeconds,
        testPhase: 'exam',
        isHidden: false,
      }),
      completeSection: (section) => set((state) => ({
        completedSections: { ...state.completedSections, [section]: true },
      })),
      decrementTime: () => set((state) => ({ 
        timeLeft: Math.max(0, state.timeLeft - 1) 
      })),
      resetTest: () => set({
        currentQuestionId: 1,
        timeLeft: 3600,
        answers: emptyAnswers(),
        markedForReview: emptyReviewMap(),
        notes: emptyNotes(),
        isNotesOpen: false,
        testPhase: 'instructions',
        activeSection: null,
        completedSections: { listening: false, reading: false, writing: false },
        isHidden: false,
      }),
    }),
    {
      name: 'test-storage',
      version: 3,
      migrate: (persistedState) => {
        const persisted = persistedState as Partial<TestState> | undefined;
        return {
          textSize: persisted?.textSize ?? 'standard',
          colorScheme: persisted?.colorScheme ?? 'standard',
          splitRatio: persisted?.splitRatio ?? 50,
        };
      },
      // Keep an in-progress attempt recoverable after an accidental refresh or
      // mobile browser eviction. resetTest remains the explicit fresh-start path.
      partialize: (state) => ({
        currentQuestionId: state.currentQuestionId,
        timeLeft: state.timeLeft,
        answers: state.answers,
        markedForReview: state.markedForReview,
        notes: state.notes,
        isNotesOpen: state.isNotesOpen,
        textSize: state.textSize,
        colorScheme: state.colorScheme,
        isHidden: state.isHidden,
        splitRatio: state.splitRatio,
        testPhase: state.testPhase,
        activeSection: state.activeSection,
        completedSections: state.completedSections,
      }),
    }
  )
);
