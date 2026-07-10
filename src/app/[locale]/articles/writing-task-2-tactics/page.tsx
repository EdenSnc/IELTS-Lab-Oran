import Navbar from '@/components/Navbar';
import { Link } from '@/i18n/routing';
import { getLocale } from 'next-intl/server';
import { getWritingTask2Content, ArticleLocale } from '@/lib/articleContent';
import { buildAlternates } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return {
    title: 'IELTS Writing Task 2 Tactics | IELTS Lab Oran',
    description: 'Learn exactly how to structure an IELTS Writing Task 2 essay to achieve a Band 7.0 or higher.',
    alternates: buildAlternates('articles/writing-task-2-tactics'),
  };
}

export default async function ArticlePage() {
  const locale = (await getLocale()) as ArticleLocale;
  const c = getWritingTask2Content(locale);
  const isRtl = locale === 'ar';

  const sections = [
    {
      title: locale === 'ar' ? 'النهج الخوارزمي' : locale === 'fr' ? 'L\'Approche Algorithmique' : 'The Algorithmic Approach',
      body: locale === 'ar' ? 'يُقيِّم المحكم مقالتك وفق أربعة معايير صارمة: الاستجابة للمهمة، التماسك والترابط، الثروة المعجمية، والدقة النحوية. إذا لم تُقدم له بالضبط ما يبحث عنه بترتيب منطقي، ستخسر نقاطاً.' : locale === 'fr' ? "L'examinateur note votre essai selon quatre critères stricts : Réponse à la tâche, Cohérence et Cohésion, Ressources lexicales, et Précision grammaticale. Si vous ne lui donnez pas exactement ce qu'il cherche dans un ordre logique, vous perdrez des points." : 'The examiner is marking your essay against four strict criteria: Task Response, Coherence & Cohesion, Lexical Resource, and Grammatical Range & Accuracy. If you don\'t give them exactly what they are looking for in a logical order, you will lose points.',
    },
    {
      title: locale === 'ar' ? 'هيكل الأربع فقرات' : locale === 'fr' ? 'La Structure en 4 Paragraphes' : 'The 4-Paragraph Structure',
      body: locale === 'ar' ? 'لا تكتب 3 فقرات أبداً، ولا 6. مقال Band 7.0+ مُنظَّم دائماً تقريباً في أربع فقرات بالضبط: مقدمة (أعد صياغة الموضوع وأعطِ أطروحة واضحة) — فقرة جسد 1 (جملة موضوع، شرح، مثال محدد، جملة ختامية) — فقرة جسد 2 (نفس الهيكل) — خاتمة (أعد صياغة أطروحتك ولخِّص النقاط الرئيسية. لا أفكار جديدة هنا).' : locale === 'fr' ? "N'écrivez jamais 3 paragraphes, et jamais 6. Un essai Band 7.0+ est presque toujours structuré en exactement 4 paragraphes : Introduction (paraphrasez le sujet et donnez une thèse claire) — Corps 1 (phrase d'accroche, explication, exemple précis, phrase de clôture) — Corps 2 (même structure) — Conclusion (réitérez votre thèse et résumez. Aucune nouvelle idée ici)." : "Never write 3 paragraphs, and never write 6. A Band 7.0+ essay is almost always structured in exactly 4 paragraphs: Introduction (paraphrase the prompt, clear thesis) — Body 1 (topic sentence, explanation, specific example, closing sentence) — Body 2 (same structure) — Conclusion (reiterate thesis, summarize. No new ideas).",
    },
    {
      title: locale === 'ar' ? 'قوة التنازل' : locale === 'fr' ? 'La Puissance de la Concession' : 'The Power of Concession',
      body: locale === 'ar' ? 'للحصول على Band 7.0 في الاستجابة للمهمة، يجب تقديم وجهة نظر دقيقة. في مقالات "ناقش وجهتَي النظر"، يجب استكشاف الجانب المعارض بشكل عادل قبل التحقق من أطروحتك. الحجج أحادية الجانب نادراً ما تحصل على أكثر من 6.5.' : locale === 'fr' ? "Pour atteindre Band 7.0 en Task Response, vous devez présenter un point de vue nuancé. Dans les essais «Discuss Both Views», vous devez explorer équitablement le côté opposé avant de valider votre propre thèse. Les arguments d'un seul côté dépassent rarement 6.5." : "To hit a Band 7.0 in Task Response, you must present a nuanced view. In \"Discuss Both Views\" essays, you must fairly explore the opposing side before validating your own thesis. Simple, one-sided arguments rarely score above 6.5.",
    },
  ];

  return (
    <>
      <Navbar />
      <article className={`pt-32 pb-32 px-6 max-w-3xl mx-auto ${isRtl ? 'font-cairo' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-8 leading-tight">{c.title}</h1>
          
          <div className="prose prose-lg prose-gray max-w-none text-gray-700 leading-relaxed">
              <p className="lead text-xl text-gray-600 mb-8 font-medium">
                  {c.lead} <Link href="/" className="text-crimson font-bold hover:underline">{locale === 'ar' ? 'التحضير للايلتس في وهران' : locale === 'fr' ? 'préparation IELTS à Oran' : 'IELTS preparation in Oran'}</Link>.
              </p>
              
              {sections.map((section, i) => (
                <div key={i}>
                  <h2 className="text-3xl font-extrabold mt-16 mb-6 text-charcoal tracking-tight">{section.title}</h2>
                  <p>{section.body}</p>
                </div>
              ))}
          
              <div className="bg-white p-8 md:p-10 rounded-[2.5rem] mt-16 border border-gray-200 shadow-xl shadow-gray-200/50 flex flex-col md:flex-row items-center gap-8 justify-between relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-crimson/5 rounded-full blur-3xl -mr-10 -mt-10 transition-all duration-500 group-hover:bg-crimson/10 pointer-events-none"></div>
                  <div className="relative z-10 md:w-2/3">
                      <h3 className="text-2xl font-extrabold mb-3 text-charcoal">{c.ctaTitle}</h3>
                      <p className="text-gray-600 leading-relaxed m-0">{c.ctaDesc}</p>
                  </div>
                  <div className="relative z-10 md:w-1/3 w-full flex flex-col gap-3 items-end">
                      <Link href="/#intake" className="w-full md:w-auto text-center inline-flex justify-center items-center gap-2 bg-charcoal text-white px-8 py-4 rounded-full font-bold hover:bg-crimson transition-colors shadow-soft">
                          {c.ctaBtn} <span aria-hidden="true">&rarr;</span>
                      </Link>
                  </div>
              </div>
          </div>
      </article>
      
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-lg border-t border-gray-200 p-4 z-50 shadow-up flex justify-between items-center">
        <div>
            <div className="text-sm font-bold text-charcoal">IELTS Lab Oran</div>
            <div className="text-xs text-crimson font-semibold">32,000 DA</div>
        </div>
        <Link href="/#intake" className="bg-crimson text-white px-6 py-3 rounded-full font-bold text-sm shadow-glow active:scale-95 transition-transform">
            APPLY NOW
        </Link>
      </div>
    </>
  );
}
