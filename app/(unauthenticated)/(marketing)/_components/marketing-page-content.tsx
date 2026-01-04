"use client"

import { ComingSoonSection } from "./sections/coming-soon-section"
import { CTASection } from "./sections/cta-section"
import { FAQSection } from "./sections/faq-section"
import { FeaturesSection } from "./sections/features-section"
import { HeroSection } from "./sections/hero-section"
import { VisionSection } from "./sections/vision-section"

export function MarketingPageContent() {
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
