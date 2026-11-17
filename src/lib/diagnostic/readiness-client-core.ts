export type ReadinessMarkingDraft={writing:number[];speaking:number[]|null;notes:string;decision:string;overrideReason:string;writingRunId?:string|null;speakingRunId?:string|null};
/** A stored review also has provenance; it must not be reposted as editable input. */
export function readinessMarkingDraft(value:ReadinessMarkingDraft):ReadinessMarkingDraft {
  return {writing:[...value.writing],speaking:value.speaking?[...value.speaking]:null,notes:value.notes,decision:value.decision,overrideReason:value.overrideReason,writingRunId:value.writingRunId??null,speakingRunId:value.speakingRunId??null};
}
