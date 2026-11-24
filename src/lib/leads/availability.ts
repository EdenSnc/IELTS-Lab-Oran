import { z } from 'zod';

export const weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
export const maxAvailabilityWindows = 21;

const windowSchema = z.object({
  day: z.enum(weekdays),
  startHour: z.number().int().min(8).max(21),
  endHour: z.number().int().min(9).max(22),
}).strict().refine(({ startHour, endHour }) => startHour < endHour, { path: ['endHour'] });

export type AvailabilityWindow = z.infer<typeof windowSchema>;

export const availabilitySchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('flexible') }).strict(),
  z.object({
    mode: z.literal('windows'),
    windows: z.array(windowSchema).min(1).max(maxAvailabilityWindows),
  }).strict(),
]);

export function formatAvailabilityHour(hour: number) {
  return `${String(hour).padStart(2, '0')}:00`;
}

export const availabilityCopy = {
  en: {
    title: 'Weekly availability',
    hint: 'Add every time window you can attend. All times are local to Oran.',
    timezone: 'Oran time (UTC+1)',
    flexible: 'My schedule is flexible',
    add: 'Add a time window',
    day: 'Day',
    from: 'From',
    to: 'To',
    remove: 'Remove',
    chooseDay: 'Choose a day',
    saveDraft: 'Add the time window before submitting.',
    shortDays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    invalid: 'Add a valid time window or choose a flexible schedule. End time must be after start time.',
    days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  },
  fr: {
    title: 'Disponibilités hebdomadaires',
    hint: 'Ajoutez vos créneaux disponibles. Toutes les heures sont celles d’Oran.',
    timezone: 'Heure d’Oran (UTC+1)',
    flexible: 'Mes horaires sont flexibles',
    add: 'Ajouter un créneau',
    day: 'Jour',
    from: 'De',
    to: 'À',
    remove: 'Supprimer',
    chooseDay: 'Choisissez un jour',
    saveDraft: 'Ajoutez le créneau saisi avant d’envoyer la candidature.',
    shortDays: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
    invalid: 'Ajoutez un créneau valide ou indiquez que vos horaires sont flexibles. L’heure de fin doit suivre l’heure de début.',
    days: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
  },
  ar: {
    title: 'التفرّغ الأسبوعي',
    hint: 'أضف جميع الأوقات التي يمكنك الحضور فيها بتوقيت وهران.',
    timezone: 'توقيت وهران (UTC+1)',
    flexible: 'أوقاتي مرنة',
    add: 'إضافة فترة',
    day: 'اليوم',
    from: 'من',
    to: 'إلى',
    remove: 'حذف',
    chooseDay: 'اختر يومًا',
    saveDraft: 'أضف الفترة المحددة قبل إرسال الطلب.',
    shortDays: ['أحد', 'اثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'],
    invalid: 'أضف فترة صالحة أو اختر الأوقات المرنة. يجب أن يكون وقت الانتهاء بعد وقت البدء.',
    days: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
  },
} as const;
