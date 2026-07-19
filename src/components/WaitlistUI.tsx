'use client';

import { useState } from 'react';

const copy = {
  en: {
    eyebrow: 'The founding cohort is full.',
    headline: 'You missed it.\nDon\'t miss the next one.',
    sub: 'Seats go in hours. Get priority access before we open publicly.',
    form_label: 'Your WhatsApp number',
    form_placeholder: '+ 213 7XX XXX XXX',
    form_cta: 'Reserve my spot',
    disclaimer: 'No spam. No cold calls. Just a single message when the next cohort opens.',
    whatsapp_label: 'Prefer to reach out directly?',
    whatsapp_cta: 'Message on WhatsApp',
    whatsapp_msg: 'Hi Mr.Senouci, I want to join the waitlist for the next IELTS Lab Oran cohort. Please notify me when seats open.',
    proof: [
      { n: '8', label: 'seats per cohort' },
      { n: '100%', label: 'computer-delivered' },
      { n: 'Band 8.0', label: 'certified instructor' },
    ],
    or: 'or',
  },
  fr: {
    eyebrow: 'La cohorte inaugurale est complète.',
    headline: 'Vous l\'avez raté.\nNe ratez pas la prochaine.',
    sub: 'Les places partent en quelques heures. Accès prioritaire avant l\'ouverture publique.',
    form_label: 'Votre numéro WhatsApp',
    form_placeholder: '+ 213 7XX XXX XXX',
    form_cta: 'Réserver ma place',
    disclaimer: 'Pas de spam. Pas d\'appels. Un seul message quand la prochaine cohorte ouvre.',
    whatsapp_label: 'Vous préférez contacter directement ?',
    whatsapp_cta: 'Message sur WhatsApp',
    whatsapp_msg: 'Bonjour Mr.Senouci, je souhaite rejoindre la liste d\'attente pour la prochaine cohorte d\'IELTS Lab Oran. Merci de me prévenir quand les places sont disponibles.',
    proof: [
      { n: '8', label: 'places par cohorte' },
      { n: '100%', label: 'sur ordinateur' },
      { n: 'Band 8.0', label: 'formateur certifié' },
    ],
    or: 'ou',
  },
  ar: {
    eyebrow: 'المجموعة التأسيسية اكتملت.',
    headline: 'فاتتك.\nلا تفوّت الدفعة القادمة.',
    sub: 'المقاعد تُحجز في ساعات. احصل على الأولوية قبل الإعلان العام.',
    form_label: 'رقم واتساب',
    form_placeholder: '+ 213 7XX XXX XXX',
    form_cta: 'احجز مقعدي',
    disclaimer: 'لا رسائل مزعجة. لا اتصالات. فقط رسالة واحدة عند فتح الدفعة التالية.',
    whatsapp_label: 'تفضّل التواصل المباشر؟',
    whatsapp_cta: 'راسل على واتساب',
    whatsapp_msg: 'السلام عليكم سنوسي، أريد الانضمام إلى قائمة الانتظار للدفعة القادمة من IELTS Lab Oran. أرجو إخباري عند فتح المقاعد.',
    proof: [
      { n: '8', label: 'مقاعد لكل دفعة' },
      { n: '100%', label: 'اختبار رقمي' },
      { n: 'Band 8.0', label: 'مدرب معتمد' },
    ],
    or: 'أو',
  },
};

interface WaitlistUIProps {
  locale: string;
}

export default function WaitlistUI({ locale }: WaitlistUIProps) {
  const c = copy[locale as keyof typeof copy] ?? copy.en;
  const isRtl = locale === 'ar';
  const waNumber = '213780343103';
  const [phone, setPhone] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const msg = encodeURIComponent(
      `${c.whatsapp_msg}${phone ? ` - My number: ${phone}` : ''}`
    );
    window.open(`https://wa.me/${waNumber}?text=${msg}`, '_blank', 'noopener,noreferrer');
  }

  return (
    <main
      className={`min-h-screen bg-charcoal flex flex-col items-center justify-center relative overflow-hidden ${isRtl ? 'font-cairo' : ''}`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Background Accents */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-crimson/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-orange-500/5 rounded-full blur-[100px]" />
        <div className="absolute top-1/3 right-0 w-[300px] h-[300px] bg-white/[0.02] rounded-full blur-[80px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center px-6 pt-16 pb-12 w-full max-w-lg mx-auto">

        {/* Eyebrow pill */}
        <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full mb-8 backdrop-blur-sm">
          <span className="w-2 h-2 rounded-full bg-crimson animate-pulse shrink-0" />
          <span className="text-white/60 text-xs font-bold tracking-widest uppercase">{c.eyebrow}</span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-6xl font-black text-white leading-[1.05] tracking-tight whitespace-pre-line mb-5">
          {c.headline}
        </h1>

        {/* Sub-headline */}
        <p className="text-white/55 text-lg leading-relaxed mb-10 max-w-sm">
          {c.sub}
        </p>

        {/* Social Proof Pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {c.proof.map((p) => (
            <div
              key={p.label}
              className="bg-white/5 border border-white/10 rounded-full px-5 py-2 flex items-center gap-2 backdrop-blur-sm"
            >
              <span className="text-crimson font-black text-sm">{p.n}</span>
              <span className="text-white/60 text-xs">{p.label}</span>
            </div>
          ))}
        </div>

        {/* Form Card */}
        <div className="w-full bg-white/[0.04] border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-md mb-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label htmlFor="wl-phone" className="text-white/80 text-sm font-semibold text-left block">
              {c.form_label}
            </label>
            <div className="flex gap-3">
              <input
                id="wl-phone"
                name="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={c.form_placeholder}
                className="flex-1 bg-white/10 border border-white/15 text-white placeholder:text-white/30 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-crimson/60 focus:border-crimson/60 transition-all min-w-0"
              />
              <button
                type="submit"
                className="shrink-0 bg-crimson hover:bg-red-700 active:scale-95 text-white font-bold px-5 py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(192,16,32,0.4)] text-sm whitespace-nowrap"
              >
                {c.form_cta}
              </button>
            </div>
          </form>
        </div>

        <p className="text-white/25 text-xs mb-10 leading-relaxed px-4">
          {c.disclaimer}
        </p>

        {/* Divider */}
        <div className="flex items-center gap-4 w-full mb-8">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-white/25 text-xs uppercase tracking-widest">{c.or}</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Direct WhatsApp Link */}
        <p className="text-white/40 text-sm mb-4">{c.whatsapp_label}</p>
        <a
          href={`https://wa.me/${waNumber}?text=${encodeURIComponent(c.whatsapp_msg)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 bg-white/[0.06] hover:bg-white/10 border border-white/15 text-white font-semibold px-7 py-3.5 rounded-full transition-all duration-200 text-sm group"
        >
          {/* WhatsApp Icon */}
          <svg className="w-5 h-5 text-green-400 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.113.549 4.099 1.51 5.827L0 24l6.335-1.484A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.804 9.804 0 01-5.003-1.366l-.36-.214-3.76.882.924-3.658-.234-.376A9.818 9.818 0 012.182 12C2.182 6.58 6.58 2.182 12 2.182c5.42 0 9.818 4.398 9.818 9.818 0 5.42-4.398 9.818-9.818 9.818z" />
          </svg>
          {c.whatsapp_cta}
          <svg
            className={`w-3.5 h-3.5 opacity-50 group-hover:translate-x-0.5 transition-transform ${isRtl ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </a>

        {/* Footer */}
        <p className="text-white/15 text-xs mt-16 pb-4">
          © IELTS Lab Oran · Oran, Algeria
        </p>
      </div>
    </main>
  );
}
