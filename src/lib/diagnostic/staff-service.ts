import 'server-only';
import { randomBytes } from 'node:crypto';
import { compileReadyDiagnosticContent, diagnosticNow, diagnosticTransaction } from './content-service';
import { DiagnosticError } from './protocol';

export async function loadDiagnosticStaffOverview(actorUserId: string, email = '', selectedBlueprintId?: string) {
  return diagnosticTransaction(async tx => {
    const actor = await tx.user.findUnique({ where: { id: actorUserId }, select: { role: true, status: true } });
    if (!actor || actor.status !== 'ACTIVE' || !['TEACHER', 'ADMIN'].includes(actor.role)) throw new DiagnosticError('STAFF_REQUIRED', 403);
    const now = await diagnosticNow(tx);
    const candidates = await tx.testBlueprint.findMany({ where: { status: 'PUBLISHED', slots: { some: { partSlot: 'LISTENING_PART_3' } } },
      select: { id: true, name: true, slots: { select: { partSlot: true } } }, orderBy: { createdAt: 'desc' }, take: 30 });
    const blueprints: Array<{ id: string; name: string; ready: boolean | null }> = [];
    for (const candidate of candidates.filter(row => row.slots.length === 4 && row.slots.some(slot => slot.partSlot === 'WRITING_TASK_2'))) {
      let ready: boolean | null = null;
      if (candidate.id === selectedBlueprintId) {
        ready = true;
        try { await compileReadyDiagnosticContent(tx, { blueprintId: candidate.id, seed: randomBytes(32).toString('base64url'), now }); }
        catch (error) { if (error instanceof DiagnosticError) ready = false; else throw error; }
      }
      blueprints.push({ id: candidate.id, name: candidate.name, ready });
    }
    const recipients = email ? await tx.user.findMany({ where: { email: email.trim().toLowerCase(), role: 'STUDENT', status: 'ACTIVE' },
      select: { id: true, name: true, email: true }, take: 1 }) : [];
    const invitations = await tx.diagnosticInvitation.findMany({ where: actor.role === 'ADMIN' ? {} : { issuedById: actorUserId },
      select: { id: true, expiresAt: true, revokedAt: true, recipient: { select: { name: true, email: true } },
        session: { select: { id: true, state: true, startedAt: true, submittedAt: true } } }, orderBy: { createdAt: 'desc' }, take: 60 });
    return { blueprints, recipients, invitations: invitations.map(invitation => ({ ...invitation,
      expiresAt: invitation.expiresAt.toISOString(), revokedAt: invitation.revokedAt?.toISOString() ?? null,
      session: invitation.session ? { ...invitation.session, startedAt: invitation.session.startedAt.toISOString(),
        submittedAt: invitation.session.submittedAt?.toISOString() ?? null } : null })) };
  });
}
export type DiagnosticStaffOverview = Awaited<ReturnType<typeof loadDiagnosticStaffOverview>>;
