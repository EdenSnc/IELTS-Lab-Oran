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
import { getFoundingCohortStatus } from '@/lib/cohort';

export default function Home() {
  const cohortStatus = getFoundingCohortStatus();

  return (
    <>
      <Navbar />
      <main className="flex flex-col">
        <Hero cohortStatus={cohortStatus} />
        <MockTestOffer />
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
    </>
  );
}

