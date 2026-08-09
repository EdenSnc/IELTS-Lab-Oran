import Navbar from '@/components/Navbar';
import { Link } from '@/i18n/routing';
import { getLocale } from 'next-intl/server';
import { getHowToRegisterContent, ArticleLocale } from '@/lib/articleContent';
import ArticleMobileCta from '@/components/ArticleMobileCta';
import ArticleTrust from '@/components/ArticleTrust';
import { articleDescription, articleSeoTitle, buildArticleMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: ArticleLocale }> }) {
  const { locale } = await params;
  return buildArticleMetadata({
    locale,
    slug: 'how-to-register-algeria',
    title: articleSeoTitle(locale, 'how-to-register-algeria'),
    description: articleDescription(locale, 'how-to-register-algeria'),
  });
}

export default async function ArticlePage() {
  const locale = (await getLocale()) as ArticleLocale;
  const c = getHowToRegisterContent(locale);
  const isRtl = locale === 'ar';
  const paymentNote = {
    en: {
      title: 'Can IELTS Lab pay for a candidate?',
      body: 'Yes, the official payment-proof instructions allow the payer name to differ from the candidate name. The candidate must still register with their own details and bring the same original identity document used during registration. For cash or bank-deposit instructions, confirm the current route in the booking email or directly with British Council before travelling, because branch availability can change.',
    },
    fr: {
      title: 'IELTS Lab peut-il payer pour un candidat ?',
      body: 'Oui. Les instructions officielles relatives à la preuve de paiement prévoient que le nom du payeur puisse être différent de celui du candidat. Le candidat doit toutefois s’inscrire avec ses propres informations et présenter le même document d’identité original le jour du test. Pour un paiement en espèces ou un dépôt bancaire, confirmez le circuit actuel dans l’e-mail de réservation ou auprès du British Council avant de vous déplacer, car la disponibilité des agences peut changer.',
    },
    ar: {
      title: 'هل يمكن لمختبر IELTS Lab الدفع نيابة عن المترشح؟',
      body: 'نعم. تسمح تعليمات إثبات الدفع الرسمية بأن يختلف اسم الدافع عن اسم المترشح. لكن يجب أن يسجل المترشح ببياناته الشخصية وأن يحضر يوم الاختبار نفس وثيقة الهوية الأصلية المستخدمة في التسجيل. بالنسبة للدفع النقدي أو الإيداع البنكي، تحقق من الطريقة الحالية في رسالة تأكيد الحجز أو مباشرة مع المجلس الثقافي البريطاني قبل التنقل، لأن توفر الفروع قد يتغير.',
    },
  }[locale];

  return (
    <>
      <Navbar />
      <article className={`pt-32 pb-32 px-6 max-w-3xl mx-auto ${isRtl ? 'font-cairo' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-8 leading-tight">{c.title}</h1>
          <div className="bg-white border-l-4 border-crimson p-6 rounded-r-2xl shadow-sm mb-10">
              <p className="text-charcoal font-bold text-lg mb-2">{c.summaryTitle}</p>
              <p className="text-gray-600 m-0" dangerouslySetInnerHTML={{ __html: c.summaryText }} />
          </div>

          <div className="prose prose-lg prose-gray max-w-none text-gray-700 leading-relaxed">
              <p>{c.intro}</p>
              
              <h2 className="text-3xl font-extrabold mt-16 mb-6 text-charcoal tracking-tight">{c.h2_1}</h2>
              
              {/* Visual Infographic: Timeline Flowchart */}
              <div className="my-10 not-prose relative">
                  {/* Connecting vertical line */}
                  <div className={`absolute top-0 bottom-0 w-0.5 bg-gray-200 ${isRtl ? 'right-6' : 'left-6'} transform ${isRtl ? 'translate-x-1/2' : '-translate-x-1/2'} z-0`}></div>
                  
                  <div className="space-y-8 relative z-10">
                    {c.steps.map((step, i) => (
                      <div key={i} className="flex gap-6 items-start group">
                          <div className="w-12 h-12 bg-charcoal text-white rounded-full flex items-center justify-center font-bold text-xl shrink-0 shadow-[0_0_0_4px_white] group-hover:bg-crimson group-hover:scale-110 transition-all z-10">
                            {i + 1}
                          </div>
                          <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm flex-1 group-hover:shadow-md transition-shadow">
                              <h4 className="font-bold text-charcoal text-xl mb-2">{step.title}</h4>
                              <p className="text-gray-600 leading-relaxed text-sm" dangerouslySetInnerHTML={{ __html: step.desc }} />
                          </div>
                      </div>
                    ))}
                  </div>
              </div>

              <aside className="not-prose my-10 rounded-2xl border border-amber-200 bg-amber-50 p-6">
                <h2 className="mb-2 text-xl font-extrabold text-charcoal">{paymentNote.title}</h2>
                <p className="m-0 text-sm leading-relaxed text-gray-700">{paymentNote.body}</p>
              </aside>

              <h2 className="text-3xl font-extrabold mt-16 mb-6 text-charcoal tracking-tight">{c.h2_2}</h2>
              <p dangerouslySetInnerHTML={{ __html: c.compIntro }} />

              <ul className="list-disc pl-5 my-4 space-y-2">
                  {c.compBullets.map((b, i) => (
                    <li key={i} dangerouslySetInnerHTML={{ __html: b }} />
                  ))}
              </ul>

              <div className="bg-white p-8 md:p-10 rounded-[2.5rem] mt-16 border border-gray-200 shadow-xl shadow-gray-200/50 flex flex-col md:flex-row items-center gap-8 justify-between relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-crimson/5 rounded-full blur-3xl -mr-10 -mt-10 transition-all duration-500 group-hover:bg-crimson/10 pointer-events-none"></div>
                  <div className="relative z-10 md:w-2/3">
                      <h3 className="text-2xl font-extrabold mb-3 text-charcoal">{c.ctaTitle}</h3>
                      <p className="text-gray-600 leading-relaxed m-0">{c.ctaDesc}</p>
                  </div>
                  <div className="relative z-10 md:w-1/3 w-full flex justify-end">
                      <Link href="/#intake" className="w-full md:w-auto text-center inline-flex justify-center items-center gap-2 bg-charcoal text-white px-8 py-4 rounded-full font-bold hover:bg-crimson transition-colors shadow-soft">
                          {c.ctaBtn} <span aria-hidden="true">&rarr;</span>
                      </Link>
                  </div>
              </div>
          </div>
          <div className="mt-16">
            <ArticleTrust
              locale={locale}
              slug="how-to-register-algeria"
              title={c.title}
              description={articleDescription(locale, 'how-to-register-algeria')}
              sources={[
                {
                  label: 'British Council Algeria: book IELTS, fees, ID, and payment',
                  href: 'https://www.britishcouncil.dz/en/exam/ielts/book-test',
                },
              ]}
            />
          </div>
      </article>
      
      <ArticleMobileCta />
    </>
  );
}
