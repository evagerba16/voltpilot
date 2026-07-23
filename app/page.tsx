import { Features } from "@/components/landing/features";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { Navbar } from "@/components/landing/navbar";
import { Pricing } from "@/components/landing/pricing";
import { WhyVoltPilot } from "@/components/landing/why-voltpilot";

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <WhyVoltPilot />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
}
