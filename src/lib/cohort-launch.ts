export const COHORT_ARTICLE_PATH = '/articles/first-ielts-preparation-cohort-oran';
export const COHORT_APPLICATION_DEADLINE = '2026-11-26';
export const COHORT_DEADLINE_ISO = COHORT_APPLICATION_DEADLINE + 'T23:59:59.999+01:00';

export function isCohortDeadlinePassed(now: Date = new Date()): boolean {
  return now.getTime() > Date.parse(COHORT_DEADLINE_ISO);
}

export const cohortLaunch = {
  en: {
    category: 'IELTS Lab news',
    title: 'First IELTS Preparation Cohort in Oran (5,000 DA)',
    desc: 'In-person 8-seat IELTS preparation cohort in Bir El Djir, Oran: ~4 weeks of all-4-skills coaching, Writing & Speaking feedback, and 5,000 DA launch fee.',
    deadline: '26 November 2026',
    deadlineLabel: 'Application deadline',
    feeLabel: 'Special first-cohort price',
    pastPriceLabel: 'Previously listed price',
    details: 'Practise all four IELTS skills in person with structured classroom exercises, timed practice and personal feedback on Writing and Speaking. The group is kept small so each participant gets individual attention.',
    apply: 'Apply for the camp',
    next: 'Send your weekly availability by 26 November. We’ll contact applicants with the timetable and enrolment details. Applying is free and does not reserve a seat.',
    closedTitle: 'First-cohort applications closed (26 Nov 2026)',
    closedDesc: 'Applications for the first Oran cohort have closed. Join the waitlist to share your availability for the next cohort.',
    closedCta: 'Join the waitlist',
    waitlistNote: 'Share your availability to hear about the next cohort.',
  },
  fr: {
    category: 'Actualités IELTS Lab',
    title: '1er Groupe de Préparation IELTS à Oran (5 000 DA)',
    desc: 'Préparation IELTS en présentiel à Bir El Djir, Oran (8 places) : environ un mois sur les 4 épreuves, retours personnalisés et tarif de lancement 5 000 DA.',
    deadline: '26 novembre 2026',
    deadlineLabel: 'Date limite de candidature',
    feeLabel: 'Tarif exceptionnel du premier groupe',
    pastPriceLabel: 'Ancien prix affiché',
    details: 'Travaillez les quatre compétences de l’IELTS en présentiel avec des exercices structurés en salle, des entraînements chronométrés et des retours personnalisés à l’écrit et à l’oral. L’effectif est limité pour que chacun bénéficie d’un suivi individuel.',
    apply: 'Candidater à la formation',
    next: 'Indiquez vos disponibilités avant la fin de la journée du 26 novembre. Nous contacterons les candidats avec les horaires et les modalités d’inscription. La candidature est gratuite et ne réserve pas de place.',
    closedTitle: 'Candidatures clôturées pour le 1er groupe (26 nov. 2026)',
    closedDesc: 'Les candidatures au premier groupe sont clôturées. Rejoignez la liste d’attente et indiquez vos disponibilités pour le prochain groupe à Oran.',
    closedCta: 'Rejoindre la liste d’attente',
    waitlistNote: 'Indiquez vos disponibilités pour recevoir les informations sur le prochain groupe.',
  },
  ar: {
    category: 'أخبار IELTS Lab',
    title: 'أول دورة تحضيرية لاختبار IELTS بوهران (5,000 دج)',
    desc: 'دورة تحضيرية حضورية مصغرة (8 مقاعد) لاختبار IELTS في بئر الجير، وهران لمدة شهر تقريباً: المهارات الأربع، تصحيح فردي، وسعر إطلاق خاص قدره 5,000 دج.',
    deadline: '26 نوفمبر 2026',
    deadlineLabel: 'آخر أجل للتقديم',
    feeLabel: 'سعر استثنائي للمجموعة الأولى',
    pastPriceLabel: 'السعر المعروض سابقاً',
    details: 'تدرّب حضورياً على مهارات IELTS الأربع بتمارين صفية منظّمة وتدريبات محددة الوقت، مع ملاحظات فردية على الكتابة والمحادثة. عدد المشاركين محدود لإتاحة المتابعة الفردية لكل متدرّب.',
    apply: 'قدّم طلبك للدورة',
    next: 'أرسل أوقات تفرّغك بحلول 26 نوفمبر. سنتواصل مع المتقدمين لمشاركة الجدول وتفاصيل التسجيل. تقديم الطلب مجاني ولا يحجز مقعداً.',
    closedTitle: 'انتهت فترة التقديم للمجموعة الأولى (26 نوفمبر 2026)',
    closedDesc: 'أُغلقت طلبات المجموعة الأولى في وهران. انضم إلى قائمة الانتظار وأرسل أوقات تفرّغك للدفعة القادمة.',
    closedCta: 'الانضمام إلى قائمة الانتظار',
    waitlistNote: 'أرسل أوقات تفرّغك لتصلك معلومات الدفعة القادمة.',
  },
};
