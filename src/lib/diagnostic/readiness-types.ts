export type ReadinessPathway = 'ACADEMIC' | 'GENERAL_TRAINING' | 'UNSURE';
export type ReadinessPhase = 'CORE' | 'EXTENSION';
export type ReadinessItem = { id: string; number: number; type: 'TEXT' | 'CHOICE'; prompt: string; instructions?: string; options?: Record<string, string>; maxWords?: number };
export type ReadinessPart = { id: string; title: string; skill: 'LISTENING' | 'READING'; phase: ReadinessPhase; pathway: 'BOTH' | Exclude<ReadinessPathway, 'UNSURE'>; instructions: string; text?: string; audio?: string; audioSeconds?: number; items: ReadinessItem[] };
