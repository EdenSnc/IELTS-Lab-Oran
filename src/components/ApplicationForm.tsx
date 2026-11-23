'use client';

import { FormEvent, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { readActiveUtms } from '@/lib/acquisition/utm-client';

type Locale = 'en' | 'fr' | 'ar';
type YesNo = '' | 'yes' | 'no';

const copy = {
  en: {
    eyebrow: 'Official intake portal',
    title: 'IELTS Lab Oran Application',
    intro: 'A focused application for an intensive, computer-based IELTS preparation programme in Oran.',
    reasons: [
      ['PCs, not paper', 'The official exam is digital. Train on the interface you will actually face.'],
      ['A clear band blueprint', 'Turn examiner criteria into practical, repeatable decisions.'],
      ['About one month', 'Practise the skills you need most before your test.'],
    ],
    begin: 'Start application', back: 'Back', next: 'Next', submit: 'Submit application', pending: 'Submitting…',
    step: 'Step {current} of {total}',
    sections: ['Identity & contact', 'Testing timeline', 'Objective & destination', 'Diagnostic', 'Commitment'],
    fullName: 'Full legal name', phone: 'WhatsApp number', email: 'Email address', discovery: 'Where did you find us?',
    discoveryOptions: [['google_search', 'Google Search'], ['google_maps', 'Google Maps / Business Profile'], ['poster', 'Poster / QR code in Oran'], ['social_media', 'Social media'], ['workshop', 'Our workshops'], ['friend', 'Friend'], ['other', 'Other']],
    booked: 'Have you booked your computer-delivered IELTS test?', bookedDate: 'What is your booked exam date?', targetDate: 'What is your target exam date to meet your deadline?',
    yes: 'Yes', no: 'No',
    purpose: 'Why do you need to pass IELTS?',
    purposeOptions: [['higher_education', 'Higher education abroad'], ['immigration', 'Immigration'], ['career', 'Career advancement'], ['other', 'Other']],
    admission: 'Have you already secured university admission?', country: 'Which country are you targeting?', band: 'What IELTS band do you need?',
    bandOptions: [
      ['5.5', '5.5 — some undergraduate entry and basic immigration'], ['6.0', '6.0 — many undergraduate and visa routes'],
      ['6.5', '6.5 — postgraduate entry and common immigration routes'], ['7.0', '7.0 — competitive postgraduate or professional licensing'],
      ['7.5', '7.5 — selective universities and professional bodies'], ['8.0', '8.0 — highly selective programmes'],
      ['8.5-9.0', '8.5–9.0 — near-perfect, rare requirements'],
    ],
    taken: 'Have you taken IELTS before?', recentScore: 'What was your most recent score?', challenges: 'Which modules do you find most challenging?',
    modules: [['listening', 'Listening'], ['reading', 'Reading'], ['writing', 'Writing'], ['speaking', 'Speaking']],
    level: 'How would you describe your current English level?',
    levels: [['A1', 'Beginner (A1)'], ['A2', 'Elementary (A2)'], ['B1', 'Intermediate (B1)'], ['B2', 'Upper-intermediate (B2)'], ['C1+', 'Advanced (C1+)']],
    levelHelp: 'Not sure? The free EF SET test can give you a CEFR estimate before you apply.',
    urgency: 'Explain how urgently you need the score and your biggest weakness or obstacle.', urgencyPlaceholder: 'For example: I run out of time in Reading and struggle to organise Writing Task 2 ideas.',
    commitment: 'I understand that the first in-person cohort costs 5,000 DA and lasts about one month. I will review the confirmed schedule before enrolling. Applying does not reserve a seat.',
    privacy: 'Your details are stored for application review and essential follow-up. WhatsApp opens only after our system confirms that the application was saved.',
    requiredModules: 'Choose at least one challenging module.',
    successTitle: 'Application successfully submitted.',
    success: 'Your application has been saved for one of eight places (applying does not reserve a seat). You are now being redirected to WhatsApp for the final handoff.',
    handoff: 'Hello IELTS Lab Oran, I just submitted my application. My name is {name}.',
    whatsapp: 'Open WhatsApp now', error: 'Unable to submit the application. Your answers remain here so you can try again.',
  },
  fr: {
    eyebrow: 'Portail officiel de candidature', title: 'Candidature IELTS Lab Oran',
    intro: 'Une candidature ciblée pour une préparation IELTS intensive et entièrement informatisée à Oran.',
    reasons: [['Sur PC, pas sur papier', "L’examen officiel est numérique. Entraînez-vous sur l’interface réelle."], ['Une stratégie de score claire', 'Transformez les critères des examinateurs en décisions pratiques et répétables.'], ['Environ un mois', 'Travaillez les compétences prioritaires avant votre test.']],
    begin: 'Commencer', back: 'Retour', next: 'Suivant', submit: 'Envoyer la candidature', pending: 'Envoi…', step: 'Étape {current} sur {total}',
    sections: ['Identité et contact', 'Calendrier du test', 'Objectif et destination', 'Diagnostic', 'Engagement'],
    fullName: 'Nom légal complet', phone: 'Numéro WhatsApp', email: 'Adresse e-mail', discovery: 'Comment nous avez-vous connus ?',
    discoveryOptions: [['google_search', 'Recherche Google'], ['google_maps', 'Google Maps / Fiche établissement'], ['poster', 'Affiche / QR code à Oran'], ['social_media', 'Réseaux sociaux'], ['workshop', 'Nos ateliers'], ['friend', 'Un proche'], ['other', 'Autre']],
    booked: 'Avez-vous réservé votre IELTS sur ordinateur ?', bookedDate: 'Quelle est la date réservée ?', targetDate: 'Quelle est votre date cible ?', yes: 'Oui', no: 'Non',
    purpose: 'Pourquoi devez-vous réussir l’IELTS ?', purposeOptions: [['higher_education', 'Études supérieures à l’étranger'], ['immigration', 'Immigration'], ['career', 'Évolution professionnelle'], ['other', 'Autre']],
    admission: 'Avez-vous déjà obtenu une admission universitaire ?', country: 'Quel pays visez-vous ?', band: 'Quel score IELTS devez-vous obtenir ?',
    bandOptions: [['5.5', '5.5 — certaines admissions et démarches'], ['6.0', '6.0 — nombreuses licences et catégories de visa'], ['6.5', '6.5 — master et immigration courante'], ['7.0', '7.0 — cursus compétitifs ou autorisations professionnelles'], ['7.5', '7.5 — universités sélectives'], ['8.0', '8.0 — programmes très sélectifs'], ['8.5-9.0', '8.5–9.0 — niveau quasi parfait, rarement exigé']],
    taken: 'Avez-vous déjà passé l’IELTS ?', recentScore: 'Quel était votre dernier score ?', challenges: 'Quelles compétences vous posent le plus de difficultés ?', modules: [['listening', 'Listening'], ['reading', 'Reading'], ['writing', 'Writing'], ['speaking', 'Speaking']],
    level: 'Comment décririez-vous votre niveau actuel ?', levels: [['A1', 'Débutant (A1)'], ['A2', 'Élémentaire (A2)'], ['B1', 'Intermédiaire (B1)'], ['B2', 'Intermédiaire supérieur (B2)'], ['C1+', 'Avancé (C1+)']],
    levelHelp: 'Pas sûr ? Le test EF SET gratuit peut estimer votre niveau CECR avant la candidature.', urgency: 'Expliquez votre urgence ainsi que votre principale faiblesse ou difficulté.', urgencyPlaceholder: 'Exemple : je manque de temps en Reading et j’organise difficilement mes idées en Writing Task 2.',
    commitment: 'Je comprends que le premier groupe en présentiel coûte 5 000 DA et dure environ un mois. Je vérifierai les horaires confirmés avant de m’inscrire. Cette candidature ne réserve pas de place.',
    privacy: 'Vos informations servent à examiner votre candidature et au suivi essentiel. WhatsApp ne s’ouvre qu’après confirmation de l’enregistrement.', requiredModules: 'Choisissez au moins une compétence.',
    successTitle: 'Candidature envoyée avec succès.', success: 'Votre candidature est enregistrée (sans réservation automatique de place). Redirection vers WhatsApp pour finaliser le suivi.', handoff: 'Bonjour IELTS Lab Oran, je viens d’envoyer ma candidature. Je m’appelle {name}.', whatsapp: 'Ouvrir WhatsApp', error: 'Impossible d’envoyer la candidature. Vos réponses sont conservées pour réessayer.',
  },
  ar: {
    eyebrow: 'بوابة الترشح الرسمية', title: 'طلب الالتحاق بـ IELTS Lab Oran', intro: 'طلب مركز لبرنامج تحضير مكثف لاختبار IELTS على الكمبيوتر في وهران.',
    reasons: [['التدريب على الكمبيوتر', 'الاختبار الرسمي رقمي، لذلك تتدرب على الواجهة التي ستواجهها فعلاً.'], ['خطة واضحة للنتيجة', 'نحوّل معايير المصححين إلى قرارات عملية قابلة للتكرار.'], ['نحو شهر', 'تدرّب على المهارات التي تحتاج إليها قبل الاختبار.']],
    begin: 'ابدأ الطلب', back: 'رجوع', next: 'التالي', submit: 'إرسال الطلب', pending: 'جارٍ الإرسال…', step: 'الخطوة {current} من {total}',
    sections: ['الهوية والاتصال', 'موعد الاختبار', 'الهدف والوجهة', 'التشخيص', 'الالتزام'],
    fullName: 'الاسم القانوني الكامل', phone: 'رقم واتساب', email: 'البريد الإلكتروني', discovery: 'كيف تعرفت علينا؟', discoveryOptions: [['google_search', 'بحث Google'], ['google_maps', 'خرائط Google / الملف التجاري'], ['poster', 'ملصق / رمز QR في وهران'], ['social_media', 'وسائل التواصل'], ['workshop', 'ورشاتنا'], ['friend', 'صديق'], ['other', 'أخرى']],
    booked: 'هل حجزت اختبار IELTS على الكمبيوتر؟', bookedDate: 'ما تاريخ الاختبار المحجوز؟', targetDate: 'ما التاريخ المستهدف لتحقيق هدفك؟', yes: 'نعم', no: 'لا',
    purpose: 'لماذا تحتاج إلى IELTS؟', purposeOptions: [['higher_education', 'الدراسة في الخارج'], ['immigration', 'الهجرة'], ['career', 'التقدم المهني'], ['other', 'سبب آخر']], admission: 'هل حصلت على قبول جامعي؟', country: 'ما البلد المستهدف؟', band: 'ما النتيجة المطلوبة؟',
    bandOptions: [['5.5', '5.5 — بعض برامج البكالوريوس والهجرة'], ['6.0', '6.0 — كثير من برامج البكالوريوس والتأشيرات'], ['6.5', '6.5 — الدراسات العليا ومسارات هجرة شائعة'], ['7.0', '7.0 — برامج تنافسية أو ترخيص مهني'], ['7.5', '7.5 — جامعات وهيئات انتقائية'], ['8.0', '8.0 — برامج شديدة الانتقائية'], ['8.5-9.0', '8.5–9.0 — مستوى شبه كامل ونادر الطلب']],
    taken: 'هل اجتزت IELTS من قبل؟', recentScore: 'ما أحدث نتيجة حصلت عليها؟', challenges: 'ما المهارات الأكثر صعوبة بالنسبة لك؟', modules: [['listening', 'الاستماع'], ['reading', 'القراءة'], ['writing', 'الكتابة'], ['speaking', 'المحادثة']],
    level: 'كيف تصف مستواك الحالي؟', levels: [['A1', 'مبتدئ (A1)'], ['A2', 'أساسي (A2)'], ['B1', 'متوسط (B1)'], ['B2', 'فوق المتوسط (B2)'], ['C1+', 'متقدم (C1+)']], levelHelp: 'لست متأكداً؟ يمكنك استخدام اختبار EF SET المجاني لتقدير مستوى CEFR.',
    urgency: 'اشرح مدى استعجالك وأكبر نقطة ضعف أو عائق لديك.', urgencyPlaceholder: 'مثال: ينفد وقتي في القراءة وأجد صعوبة في تنظيم أفكار الكتابة.', commitment: 'أفهم أن سعر المجموعة الحضورية الأولى 5,000 دج ومدتها نحو شهر. سأراجع الجدول المؤكد قبل التسجيل. إرسال الطلب لا يحجز مقعداً.',
    privacy: 'تُحفظ بياناتك لدراسة الطلب والمتابعة الضرورية. لا يتم فتح واتساب إلا بعد تأكيد حفظ الطلب.', requiredModules: 'اختر مهارة واحدة على الأقل.', successTitle: 'تم إرسال الطلب بنجاح.', success: 'تم حفظ طلبك لدراسة القبول ضمن المقاعد الثمانية (لا يحجز مقعداً تلقائياً). سيتم تحويلك الآن إلى واتساب لإكمال المتابعة.', handoff: 'مرحباً IELTS Lab Oran، أرسلت طلبي للتو. اسمي {name}.', whatsapp: 'فتح واتساب', error: 'تعذر إرسال الطلب. ستبقى إجاباتك محفوظة لتتمكن من المحاولة مجدداً.',
  },
} as const;

const fieldClass = 'min-w-0 h-12 w-full rounded-2xl border border-black/10 bg-black/[0.025] px-3 text-base text-charcoal outline-none transition focus:border-crimson/45 focus:bg-white focus:ring-4 focus:ring-crimson/[0.07] md:px-4';
const labelClass = 'grid min-w-0 gap-2 text-sm font-semibold text-black/70';

export default function ApplicationForm() {
  const locale = useLocale() as Locale;
  const text = copy[locale] ?? copy.en;
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState(0);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();
  const [complete, setComplete] = useState(false);
  const [bookedExam, setBookedExam] = useState<YesNo>('');
  const [takenIelts, setTakenIelts] = useState<YesNo>('');
  const [challengingModules, setChallengingModules] = useState<string[]>([]);
  const [whatsappUrl, setWhatsappUrl] = useState<string>();

  function validateStep(currentStep: number) {
    const fieldset = formRef.current?.querySelector<HTMLElement>(`[data-step="${currentStep}"]`);
    if (!fieldset) return true;
    const controls = fieldset.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea');
    for (const control of controls) {
      if (!control.reportValidity()) return false;
    }
    if (currentStep === 4 && challengingModules.length === 0) {
      setMessage(text.requiredModules);
      return false;
    }
    setMessage(undefined);
    return true;
  }

  function advance() {
    if (!validateStep(step)) return;
    setStep((current) => Math.min(5, current + 1));
  }

  function referrerHost() {
    if (!document.referrer) return null;
    try { return new URL(document.referrer).host; } catch { return null; }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateStep(5)) return;
    const form = new FormData(event.currentTarget);
    const query = new URLSearchParams(window.location.search);
    const utms = readActiveUtms();
    setPending(true);
    setMessage(undefined);

    try {
      const fullName = String(form.get('fullName') ?? '').trim();
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: form.get('phone'), email: form.get('email'), fullName,
          formName: 'IELTS Lab Oran Application', source: 'cohort_waitlist',
          utmSource: utms.utm_source, utmMedium: utms.utm_medium, utmCampaign: utms.utm_campaign, utmContent: utms.utm_content,
          application: {
            schemaVersion: 2,
            discoverySource: form.get('discoverySource'),
            bookedExam: bookedExam === 'yes',
            bookedExamDate: bookedExam === 'yes' ? form.get('bookedExamDate') : null,
            targetExamDate: bookedExam === 'no' ? form.get('targetExamDate') : null,
            purpose: form.get('purpose'),
            universityAdmission: form.get('universityAdmission') === 'yes',
            targetCountry: form.get('targetCountry'), targetBand: form.get('targetBand'),
            takenIelts: takenIelts === 'yes', recentScore: takenIelts === 'yes' ? form.get('recentScore') : null,
            challengingModules, englishLevel: form.get('englishLevel'), urgencyAndObstacles: form.get('urgencyAndObstacles'),
            commitmentAccepted: form.get('commitmentAccepted') === 'yes', locale,
            attribution: {
              utmTerm: utms.utm_term, utmContent: utms.utm_content, gclid: query.get('gclid'), fbclid: query.get('fbclid'),
              landingPath: `${window.location.pathname}${window.location.search}`, referrerHost: referrerHost(),
            },
          },
        }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? text.error);

      const number = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '213780343103').replace(/\D/gu, '');
      const handoff = `https://wa.me/${number}?text=${encodeURIComponent(text.handoff.replace('{name}', fullName))}`;
      setComplete(true);
      setWhatsappUrl(handoff);
      try { window.localStorage.setItem('ielts_cohort_signed_up', 'true'); } catch { /* optional */ }
      window.setTimeout(() => window.location.assign(handoff), 1_800);
    } catch (error) {
      setMessage(error instanceof Error && error.message !== 'Unable to save lead.' ? error.message : text.error);
    } finally {
      setPending(false);
    }
  }

  if (complete) {
    return (
      <div className="flex flex-col justify-center md:min-h-[30rem]">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-xl text-emerald-700">✓</div>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-[#b81428]">{text.eyebrow}</p>
        <h3 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-charcoal">{text.successTitle}</h3>
        <p className="mt-4 text-sm leading-6 text-gray-700">{text.success}</p>
        {whatsappUrl && <a href={whatsappUrl} className="mt-7 inline-flex h-12 items-center justify-center rounded-full bg-charcoal px-5 text-sm font-semibold text-white transition hover:bg-[#c4162c]">{text.whatsapp}</a>}
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="flex min-w-0 flex-col md:min-h-[34rem]">
      {step === 0 ? (
        <div className="flex flex-1 flex-col">
          <p className="hidden text-xs font-bold uppercase tracking-[0.18em] text-[#b81428] md:block">{text.eyebrow}</p>
          <h3 className="text-2xl font-bold leading-tight tracking-[-0.035em] text-charcoal md:mt-3 md:text-3xl">{text.title}</h3>
          <p className="mt-3 text-sm leading-6 text-gray-700">{text.intro}</p>
          <div className="mt-7 hidden gap-3 md:grid">
            {text.reasons.map(([title, description], index) => (
              <div key={title} className="flex gap-4 rounded-2xl bg-black/[0.025] p-4">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-crimson/[0.1] text-xs font-bold text-[#b81428]">{index + 1}</span>
                <div><p className="text-sm font-semibold text-charcoal">{title}</p><p className="mt-1 text-xs leading-5 text-gray-600">{description}</p></div>
              </div>
            ))}
          </div>
          <button type="button" onClick={advance} className="mt-4 min-h-12 w-full rounded-full bg-charcoal px-4 py-2 text-base font-bold text-white transition hover:bg-[#c4162c] md:mt-6">{text.begin}</button>
        </div>
      ) : (
        <>
          <div>
            <div className="flex items-center justify-between gap-4 text-xs font-bold uppercase tracking-[0.14em] text-gray-600"><span>{text.step.replace('{current}', String(step)).replace('{total}', '5')}</span><span className="text-[#b81428]">{text.sections[step - 1]}</span></div>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-black/[0.08]"><div className="h-full rounded-full bg-[#c4162c] transition-[width]" style={{ width: `${step * 20}%` }} /></div>
          </div>

          <fieldset data-step="1" className={step === 1 ? 'mt-8 grid gap-5' : 'hidden'}>
            <legend className="text-2xl font-semibold tracking-tight">{text.sections[0]}</legend>
            <label className={labelClass}>{text.fullName}<input className={fieldClass} name="fullName" autoComplete="name" minLength={2} maxLength={120} required /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={labelClass}>{text.phone}<input className={fieldClass} name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+213 555 00 00 00" minLength={8} maxLength={32} required /></label>
              <label className={labelClass}>{text.email}<input className={fieldClass} name="email" type="email" autoComplete="email" maxLength={320} required /></label>
            </div>
            <label className={labelClass}>{text.discovery}<select className={fieldClass} name="discoverySource" defaultValue="" required><option value="" disabled>—</option>{text.discoveryOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          </fieldset>

          <fieldset data-step="2" className={step === 2 ? 'mt-8 grid gap-5' : 'hidden'}>
            <legend className="text-2xl font-semibold tracking-tight">{text.sections[1]}</legend>
            <div className="grid gap-2"><span className="text-sm font-semibold text-black/70">{text.booked}</span><div className="grid grid-cols-2 gap-3">{([['yes', text.yes], ['no', text.no]] as const).map(([value, label]) => <label key={value} className={`cursor-pointer rounded-2xl border p-4 text-sm font-semibold transition ${bookedExam === value ? 'border-crimson bg-crimson/[0.055] text-[#b81428]' : 'border-black/10 hover:border-black/20'}`}><input className="sr-only" type="radio" name="bookedExam" value={value} checked={bookedExam === value} onChange={() => setBookedExam(value)} required />{label}</label>)}</div></div>
            {bookedExam === 'yes' && <label className={labelClass}>{text.bookedDate}<input className={fieldClass} name="bookedExamDate" type="date" required /></label>}
            {bookedExam === 'no' && <label className={labelClass}>{text.targetDate}<input className={fieldClass} name="targetExamDate" type="date" required /></label>}
          </fieldset>

          <fieldset data-step="3" className={step === 3 ? 'mt-8 grid gap-5' : 'hidden'}>
            <legend className="text-2xl font-semibold tracking-tight">{text.sections[2]}</legend>
            <label className={labelClass}>{text.purpose}<select className={fieldClass} name="purpose" defaultValue="" required><option value="" disabled>—</option>{text.purposeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className={labelClass}>{text.admission}<select className={fieldClass} name="universityAdmission" defaultValue="" required><option value="" disabled>—</option><option value="yes">{text.yes}</option><option value="no">{text.no}</option></select></label>
            <div className="grid gap-4 sm:grid-cols-2"><label className={labelClass}>{text.country}<input className={fieldClass} name="targetCountry" minLength={2} maxLength={100} required /></label><label className={labelClass}>{text.band}<select className={fieldClass} name="targetBand" defaultValue="" required><option value="" disabled>—</option>{text.bandOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
          </fieldset>

          <fieldset data-step="4" className={step === 4 ? 'mt-8 grid gap-5' : 'hidden'}>
            <legend className="text-2xl font-semibold tracking-tight">{text.sections[3]}</legend>
            <label className={labelClass}>{text.taken}<select className={fieldClass} name="takenIelts" value={takenIelts} onChange={(event) => setTakenIelts(event.target.value as YesNo)} required><option value="" disabled>—</option><option value="yes">{text.yes}</option><option value="no">{text.no}</option></select></label>
            {takenIelts === 'yes' && <label className={labelClass}>{text.recentScore}<input className={fieldClass} name="recentScore" maxLength={50} required /></label>}
            <div className="grid gap-2"><span className="text-sm font-semibold text-black/70">{text.challenges}</span><div className="grid grid-cols-2 gap-2">{text.modules.map(([value, label]) => { const checked = challengingModules.includes(value); return <label key={value} className={`cursor-pointer rounded-2xl border p-3 text-center text-sm font-semibold transition ${checked ? 'border-crimson bg-crimson/[0.055] text-[#b81428]' : 'border-black/10 hover:border-black/20'}`}><input className="sr-only" type="checkbox" name="challengingModules" value={value} checked={checked} onChange={() => setChallengingModules((current) => checked ? current.filter((item) => item !== value) : [...current, value])} />{label}</label>; })}</div></div>
            <label className={labelClass}>{text.level}<select className={fieldClass} name="englishLevel" defaultValue="" required><option value="" disabled>—</option>{text.levels.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><span className="text-xs font-normal leading-5 text-gray-600">{text.levelHelp}</span></label>
            <label className={labelClass}>{text.urgency}<textarea className="min-h-28 w-full resize-y rounded-2xl border border-black/10 bg-black/[0.025] px-4 py-3 text-[15px] outline-none transition focus:border-crimson/45 focus:bg-white focus:ring-4 focus:ring-crimson/[0.07]" name="urgencyAndObstacles" minLength={10} maxLength={1500} placeholder={text.urgencyPlaceholder} required /></label>
          </fieldset>

          <fieldset data-step="5" className={step === 5 ? 'mt-8 grid gap-5' : 'hidden'}>
            <legend className="text-2xl font-semibold tracking-tight">{text.sections[4]}</legend>
            <label className="flex cursor-pointer gap-4 rounded-2xl border border-black/10 bg-black/[0.025] p-5 text-sm font-medium leading-6 text-gray-800"><input className="mt-1 h-5 w-5 shrink-0 accent-crimson" type="checkbox" name="commitmentAccepted" value="yes" required /><span>{text.commitment}</span></label>
            <p className="text-xs leading-5 text-gray-600">{text.privacy}</p>
          </fieldset>

          <div className="mt-auto grid grid-cols-2 gap-3 pt-7">
            <button type="button" disabled={pending} onClick={() => { setMessage(undefined); setStep((current) => Math.max(0, current - 1)); }} className="h-12 rounded-full border border-black/10 px-5 text-sm font-semibold text-charcoal transition hover:border-black/20 hover:bg-black/[0.025] disabled:opacity-50">{text.back}</button>
            {step < 5 ? <button type="button" onClick={advance} className="h-12 rounded-full bg-charcoal px-5 text-sm font-semibold text-white transition hover:bg-crimson">{text.next}</button> : <button disabled={pending} className="h-12 rounded-full bg-charcoal px-5 text-sm font-semibold text-white transition hover:bg-crimson disabled:cursor-wait disabled:opacity-55">{pending ? text.pending : text.submit}</button>}
          </div>
          {message && <p role="alert" className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm leading-5 text-red-800">{message}</p>}
        </>
      )}
    </form>
  );
}
