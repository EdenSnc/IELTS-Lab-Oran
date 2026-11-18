import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import Methodology from '@/components/Methodology';
import StopTraining from '@/components/StopTraining';
import Compare from '@/components/Compare';
import Testimonials from '@/components/Testimonials';
import Facility from '@/components/Facility';
import About from '@/components/About';
import FAQ from '@/components/FAQ';
import Intake from '@/components/Intake';
import LeadMagnet from '@/components/LeadMagnet';
import MockTestOffer from '@/components/MockTestOffer';
import FeaturedGuides from '@/components/FeaturedGuides';
import LocalSchema from '@/components/LocalSchema';
import SiteFooter from '@/components/SiteFooter';
import { getFoundingCohortStatus } from '@/lib/cohort';
import { Locale } from '@/lib/seo';

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const safeLocale: Locale = locale === 'fr' || locale === 'ar' ? locale : 'en';
  const cohortStatus = getFoundingCohortStatus();

  return (
    <>
      <LocalSchema locale={safeLocale} />
      <Navbar />
      <main id="main-content" className="flex flex-col">
        <Hero cohortStatus={cohortStatus} />
        <MockTestOffer />
        <Methodology />
        <StopTraining />
        <Compare />
        <Testimonials />
        <Intake cohortStatus={cohortStatus} />
        <About />
        <FAQ />
        <FeaturedGuides locale={safeLocale} />
        <LeadMagnet />
        <Facility />
      </main>
      <SiteFooter locale={safeLocale} />
    </>
  );
}
