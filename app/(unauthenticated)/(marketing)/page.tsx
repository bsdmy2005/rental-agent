import { ComingSoonSection } from "./_components/sections/coming-soon-section"
import { CTASection } from "./_components/sections/cta-section"
import { FAQSection } from "./_components/sections/faq-section"
import { FeaturesSection } from "./_components/sections/features-section"
import { HeroSection } from "./_components/sections/hero-section"
import { VisionSection } from "./_components/sections/vision-section"

export default function MarketingPage() {
  return (
    <main className="min-h-screen bg-white dark:bg-[#1F2937]">
      <HeroSection />
      <FeaturesSection />
      <ComingSoonSection />
      <VisionSection />
      <FAQSection />
      <CTASection />
    </main>
  )
}
