import { Link } from '@/i18n/routing';
import { COURSE_PRICE_LABEL } from '@/lib/seo';

export default function ArticleMobileCta() {
  return (
    <div className="md:hidden fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-lg border-t border-gray-200 p-4 z-50 shadow-up flex justify-between items-center">
      <div>
        <div className="text-sm font-bold text-charcoal">IELTS Lab Oran</div>
        <div className="text-xs text-crimson font-semibold">{COURSE_PRICE_LABEL}</div>
      </div>
      <Link
        href="/#intake"
        className="bg-crimson text-white px-6 py-3 rounded-full font-bold text-sm shadow-glow active:scale-95 transition-transform"
      >
        APPLY NOW
      </Link>
    </div>
  );
}
