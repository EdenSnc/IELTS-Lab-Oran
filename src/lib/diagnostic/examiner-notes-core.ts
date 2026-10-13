/** Consent/status changes may advance a version without changing persisted notes.
 * Never adopt a competing editor's notes version underneath an unsaved draft. */
export function reconcileExaminerStatus<T extends {notes:string;version:number}>(previous:T,fresh:T,dirty:boolean):T {
  return !dirty||previous.notes===fresh.notes?fresh:{...fresh,notes:previous.notes,version:previous.version};
}
