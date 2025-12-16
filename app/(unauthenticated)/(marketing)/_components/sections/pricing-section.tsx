"use client"

import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { Check, Home, Users } from "lucide-react"
import { SectionWrapper } from "./section-wrapper"

const pricing = [
  {
    name: "Solo Landlord",
    price: "R0",
    period: "/launch beta",
    description: "For owners managing up to 5 properties.",
    features: [
      "Email + manual PDF bill intake",
      "AI extraction for municipality & levy bills",
      "Automatic tenant invoices",
      "Basic payment tracking",
      "Property & tenant dashboard"
    ],
    icon: Home,
    highlight: false
  },
  {
    name: "Agency",
    price: "Let’s talk",
    period: "",
    description: "For agencies managing portfolios at scale.",
    features: [
      "Unlimited properties & landlords",
      "Team workspaces & permissions",
      "Bank integrations for payments & reconciliation",
      "Priority onboarding & support",
      "Custom workflows & reporting"
    ],
    icon: Users,
    highlight: true
  }
]

export function PricingSection() {
  return (
    <SectionWrapper id="pricing">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <motion.h2
            className="text-slate-50 text-3xl font-bold tracking-tight sm:text-4xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            Pricing for modern landlords and agencies
          </motion.h2>
          <motion.p
            className="text-slate-300 mt-4 text-lg leading-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Start in the free launch beta as a solo landlord. Talk to us when you're ready to roll
            out RentPilot AI across your agency.
          </motion.p>
        </div>

        <div className="mx-auto mt-16 grid max-w-lg grid-cols-1 gap-8 lg:max-w-none lg:grid-cols-2">
          {pricing.map((tier, index) => (
            <motion.div
              key={tier.name}
              className={`relative rounded-3xl p-8 ring-1 ${
                tier.highlight
                  ? "bg-gradient-to-br from-brand-primary to-brand-secondary text-white ring-brand-primary"
                  : "bg-slate-700/50 text-slate-50 ring-slate-600"
              }`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.5,
                delay: index * 0.1
              }}
            >
              {tier.highlight && (
                <motion.div
                  className="absolute -top-4 left-1/2 -translate-x-1/2"
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                >
                  <span className="bg-slate-50 text-slate-900 inline-flex items-center rounded-full px-4 py-1 text-xs font-semibold shadow-sm">
                    AGENCY READY
                  </span>
                </motion.div>
              )}

              <div className="flex items-center gap-4">
                <tier.icon
                  className={`h-8 w-8 ${
                    tier.highlight ? "text-white" : "text-brand-primary"
                  }`}
                />
                <h3
                  className={`text-lg leading-8 font-semibold ${
                    tier.highlight ? "text-primary-foreground" : "text-foreground"
                  }`}
                >
                  {tier.name}
                </h3>
              </div>

              <p
                className={`mt-4 text-sm leading-6 ${
                  tier.highlight ? "text-primary-foreground/90" : "text-muted-foreground"
                }`}
              >
                {tier.description}
              </p>

              <p className="mt-6 flex items-baseline gap-x-1">
                <span
                  className={`text-4xl font-bold tracking-tight ${
                    tier.highlight ? "text-primary-foreground" : "text-foreground"
                  }`}
                >
                  {tier.price}
                </span>
                {tier.period && (
                  <span
                    className={`text-sm leading-6 font-semibold ${
                      tier.highlight ? "text-primary-foreground/80" : "text-muted-foreground"
                    }`}
                  >
                    {tier.period}
                  </span>
                )}
              </p>

              <ul
                className={`mt-8 space-y-3 text-sm leading-6 ${
                  tier.highlight ? "text-white/90" : "text-slate-300"
                }`}
              >
                {tier.features.map(feature => (
                  <li key={feature} className="flex gap-x-3">
                    <Check
                      className={`h-6 w-5 flex-none ${
                        tier.highlight ? "text-white" : "text-brand-primary"
                      }`}
                      aria-hidden="true"
                    />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                className={`mt-8 w-full ${
                  tier.highlight
                    ? "bg-white text-slate-900 hover:bg-slate-100"
                    : "bg-slate-600 text-white hover:bg-slate-500"
                }`}
                variant={tier.highlight ? "default" : "default"}
              >
                {tier.highlight ? "Talk to sales" : "Join launch beta"}
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  )
}


