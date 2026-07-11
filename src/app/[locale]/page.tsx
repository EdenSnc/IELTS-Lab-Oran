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
import { getFoundingCohortStatus } from '@/lib/cohort';

export default async function Home() {
  const cohortStatus = await getFoundingCohortStatus();

  return (
    <>
      <Navbar />
      <main className="flex flex-col">
        <Hero cohortStatus={cohortStatus} />
        <Methodology />
        <StopTraining />
        <Compare />
        <Testimonials />
        <Intake cohortStatus={cohortStatus} />
        <About />
        <FAQ />
        <LeadMagnet />
        <Facility />
      </main>
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-lg border-t border-gray-200 p-4 z-50 shadow-up flex justify-between items-center">
        <div>
            <div className="text-sm font-bold text-charcoal">IELTS Lab Oran</div>
            <div className="text-xs text-crimson font-semibold">32,000 DA</div>
        </div>
        <a href="#intake" className="bg-crimson text-white px-6 py-3 rounded-full font-bold text-sm shadow-glow active:scale-95 transition-transform">
            APPLY NOW
        </a>
      </div>
    </>
  );
}

