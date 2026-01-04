import { HeaderWrapper } from "./(unauthenticated)/(marketing)/_components/header-wrapper"
import { Footer } from "./(unauthenticated)/(marketing)/_components/footer"
import { SiteBanner } from "./(unauthenticated)/(marketing)/_components/site-banner"
import { StickyCTA } from "./(unauthenticated)/(marketing)/_components/sticky-cta"
import { ScrollIndicator } from "./(unauthenticated)/(marketing)/_components/scroll-indicator"
import { HeroSection } from "./(unauthenticated)/(marketing)/_components/sections/hero-section"
import { CompaniesSection } from "./(unauthenticated)/(marketing)/_components/sections/companies-section"
import { VideoSection } from "./(unauthenticated)/(marketing)/_components/sections/video-section"
import { FeaturesSection } from "./(unauthenticated)/(marketing)/_components/sections/features-section"
import { SocialProofSection } from "./(unauthenticated)/(marketing)/_components/sections/social-proof-section"
import { PricingSection } from "./(unauthenticated)/(marketing)/_components/sections/pricing-section"
import { FAQSection } from "./(unauthenticated)/(marketing)/_components/sections/faq-section"
import { CTASection } from "./(unauthenticated)/(marketing)/_components/sections/cta-section"

export default async function HomePage() {
  return (
    <>
      <SiteBanner />
      <HeaderWrapper />
      <main className="min-h-screen bg-white text-gray-900 dark:bg-slate-800 dark:text-slate-50">
        <HeroSection />
        <CompaniesSection />
        <VideoSection />
        <FeaturesSection />
        <SocialProofSection />
        <PricingSection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
      <StickyCTA />
      <ScrollIndicator />
    </>
  )
}


