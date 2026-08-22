export type DeliverySkill = 'LISTENING' | 'READING' | 'WRITING';

export type DeliveryOption = {
  label: string;
  text: string;
};

export type DeliveryQuestion = {
  id: string;
  stableKey: string;
  sourceNumber: number | null;
  displayOrder: number;
  promptHtml: string | null;
  maxMarks: number;
};

export type DeliveryQuestionGroup = {
  id: string;
  displayOrder: number;
  questionType: string;
  responseKind: string;
  scoringStrategy: string;
  sourceNumberStart: number | null;
  sourceNumberEnd: number | null;
  instructionsHtml: string | null;
  promptHtml: string | null;
  options: DeliveryOption[];
  maxMarks: number;
  minWordCount: number | null;
  maxWords: number | null;
  allowNumbers: boolean | null;
  rawAnswerInstruction: string | null;
  questions: DeliveryQuestion[];
};

export type DeliveryStimulus = {
  id: string;
  type: string;
  displayOrder: number;
  title: string | null;
  bodyHtml: string | null;
  plainText: string | null;
  assetUrl: string | null;
};

export type DeliveryPart = {
  id: string;
  slot: string;
  title: string | null;
  instructionsHtml: string | null;
  recommendedTimeSeconds: number | null;
  stimuli: DeliveryStimulus[];
  questionGroups: DeliveryQuestionGroup[];
};

export type DeliverySection = {
  id: string;
  skill: DeliverySkill;
  displayOrder: number;
  timeLimitSeconds: number | null;
  parts: DeliveryPart[];
};

export type DeliveryTest = {
  id: string;
  title: string;
  variant: string;
  version: number;
  sections: DeliverySection[];
};

export type ListeningAudioResolution = {
  audioUrl: string;
  stimulusId: string;
  resumeAtSeconds: number;
};

