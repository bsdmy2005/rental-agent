# PropNxt Landing Page Rebrand Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Update the PropNxt landing page to reflect actual product capabilities with AI-first positioning and beta messaging.

**Architecture:** Modify existing section components, create 2 new sections (Vision, Coming Soon), update main page to remove placeholder sections. Keep existing framer-motion animation patterns.

**Tech Stack:** Next.js 15, React, TypeScript, Tailwind CSS, Framer Motion, Lucide icons

---

## Task 1: Update Hero Section

**Files:**
- Modify: `app/(unauthenticated)/(marketing)/_components/sections/hero-section.tsx`

**Step 1: Update hero copy and structure**

Replace the entire hero-section.tsx content:

```tsx
"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import { ArrowRight, Bot, Workflow, MessageSquare } from "lucide-react"
import Link from "next/link"
import { SectionWrapper } from "./section-wrapper"

export function HeroSection() {
  return (
    <SectionWrapper className="py-16 sm:py-32">
      <div className="mx-auto max-w-3xl text-center">
        {/* Beta Badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm font-medium">
            Now in Open Beta - Try Free
          </Badge>
        </motion.div>

        <motion.h1
          className="text-foreground text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          AI-Powered
          <motion.span
            className="from-[#1E40AF] to-[#3B82F6] block bg-gradient-to-r bg-clip-text pb-2 leading-tight text-transparent dark:from-[#3B82F6] dark:to-[#60A5FA]"
            animate={{
              backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
            }}
            transition={{
              duration: 5,
              ease: "linear",
              repeat: Infinity
            }}
            style={{
              backgroundSize: "200% 200%"
            }}
          >
            Property Management
          </motion.span>
          <span className="text-3xl sm:text-4xl lg:text-5xl font-medium text-gray-600 dark:text-gray-400">
            That Actually Works
          </span>
        </motion.h1>

        <motion.p
          className="mx-auto mt-6 max-w-2xl text-base leading-7 sm:text-lg sm:leading-8 text-gray-700 dark:text-gray-200"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          PropNxt automates the tedious work of rental management - from tenant onboarding
          to incident resolution. Built for rental agencies and property managers who want
          to scale without scaling headcount.
        </motion.p>

        {/* Trust Badges */}
        <motion.div
          className="mx-auto mt-8 max-w-2xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
        >
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm font-medium text-gray-600 dark:text-gray-300">
            <span className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-brand-primary" />
              AI Agents Handle the Busywork
            </span>
            <span className="flex items-center gap-2">
              <Workflow className="h-4 w-4 text-brand-primary" />
              End-to-End Integration
            </span>
            <span className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-brand-primary" />
              WhatsApp-Native
            </span>
          </div>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-x-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full sm:w-auto"
          >
            <Button
              size="lg"
              asChild
              className="group relative w-full overflow-hidden bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary-hover sm:w-auto"
            >
              <Link href="/signup">
                <motion.span
                  className="absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  initial={{ x: "-200%" }}
                  whileHover={{ x: "200%" }}
                  transition={{ duration: 0.6 }}
                />
                Start Free Beta
                <motion.div
                  className="ml-2 inline-block"
                  initial={{ x: 0 }}
                  whileHover={{ x: 4 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <ArrowRight className="h-4 w-4" />
                </motion.div>
              </Link>
            </Button>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full sm:w-auto"
          >
            <Button
              variant="outline"
              size="lg"
              asChild
              className="group w-full border-2 border-gray-300 bg-white text-gray-900 backdrop-blur-sm hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-100 dark:hover:bg-gray-700/50 sm:w-auto"
            >
              <Link href="#features">
                See How It Works
              </Link>
            </Button>
          </motion.div>
        </motion.div>

        {/* No credit card note */}
        <motion.p
          className="mt-4 text-sm text-gray-500 dark:text-gray-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          No credit card required. Set up in minutes.
        </motion.p>
      </div>
    </SectionWrapper>
  )
}
```

**Step 2: Verify the build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add app/(unauthenticated)/(marketing)/_components/sections/hero-section.tsx
git commit -m "feat(landing): update hero with AI-first messaging and beta badge"
```

---

## Task 2: Create New Features Section with 4 Categories

**Files:**
- Modify: `app/(unauthenticated)/(marketing)/_components/sections/features-section.tsx`

**Step 1: Replace features section with categorized layout**

```tsx
"use client"

import { motion } from "framer-motion"
import {
  Home,
  Users,
  FileText,
  FileSignature,
  PenTool,
  Brain,
  Receipt,
  CreditCard,
  Wallet,
  Building2,
  AlertTriangle,
  Hammer,
  ClipboardList,
  Camera,
  Sparkles,
  MessageSquare,
  Mail,
  Workflow
} from "lucide-react"
import { SectionWrapper } from "./section-wrapper"

const featureCategories = [
  {
    name: "Portfolio Management",
    description: "Everything you need to manage properties, tenants, and leases",
    features: [
      {
        name: "Properties",
        description: "Manage your entire portfolio - units, addresses, landlord assignments",
        icon: Home
      },
      {
        name: "Tenants",
        description: "Full tenant records with documents, contact details, lease history",
        icon: Users
      },
      {
        name: "Leases",
        description: "Create, track, and manage lease agreements with renewal reminders",
        icon: FileText
      },
      {
        name: "AI Lease Templates",
        description: "Generate customized lease documents with AI - adapts to your requirements",
        icon: FileSignature
      },
      {
        name: "E-Signatures",
        description: "Digital signing with real-time signature tracking",
        icon: PenTool
      }
    ]
  },
  {
    name: "Financial Operations",
    description: "Automate billing, invoicing, and payment reconciliation",
    features: [
      {
        name: "AI Bill Extraction",
        description: "Upload municipality bills, levies, utilities - AI extracts the data automatically",
        icon: Brain
      },
      {
        name: "Rental Invoices",
        description: "Auto-generate tenant invoices based on lease terms and extracted bills",
        icon: Receipt
      },
      {
        name: "Payment Tracking",
        description: "Track incoming payments and match to invoices",
        icon: CreditCard
      },
      {
        name: "Expenses",
        description: "Log and categorize property expenses for reporting",
        icon: Wallet
      },
      {
        name: "Investec Integration",
        description: "Live bank feed for payment reconciliation",
        icon: Building2
      }
    ]
  },
  {
    name: "Maintenance & Inspections",
    description: "AI-powered incident resolution and inspection workflows",
    features: [
      {
        name: "Incident Management",
        description: "Tenants report issues via WhatsApp - automatically logged and tracked",
        icon: AlertTriangle
      },
      {
        name: "Service Providers",
        description: "Directory of vetted contractors, plumbers, electricians",
        icon: Hammer
      },
      {
        name: "AI-Coordinated RFQs",
        description: "AI transforms incidents into quotes - automatically reaches out to service providers",
        icon: ClipboardList
      },
      {
        name: "Moving Inspections",
        description: "Digital move-in/move-out inspections with photo documentation",
        icon: Camera
      },
      {
        name: "AI Fault Detection",
        description: "AI analyzes inspection photos to identify defects and damage",
        icon: Sparkles
      }
    ]
  },
  {
    name: "Communication & Integration",
    description: "Connect with tenants and automate workflows",
    features: [
      {
        name: "WhatsApp Integration",
        description: "Tenants communicate naturally via WhatsApp - AI handles routing and responses",
        icon: MessageSquare
      },
      {
        name: "Email Integration",
        description: "Forward bills and documents via email - automatically processed",
        icon: Mail
      },
      {
        name: "Workflow Automation",
        description: "End-to-end processes that connect everything - no manual handoffs",
        icon: Workflow
      }
    ]
  }
]

export function FeaturesSection() {
  return (
    <SectionWrapper className="relative" id="features">
      <div className="bg-[radial-gradient(45%_45%_at_50%_50%,theme(colors.brand-primary/20),transparent)] absolute inset-0 -z-10 opacity-0 dark:opacity-40" />

      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <motion.h2
            id="features-heading"
            className="text-primary text-base leading-7 font-semibold"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            Powerful Features
          </motion.h2>
          <motion.p
            className="text-gray-900 dark:text-white mt-2 text-3xl font-bold tracking-tight sm:text-4xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Everything You Need to Manage Properties End-to-End
          </motion.p>
          <motion.p
            className="text-gray-600 dark:text-gray-300 mt-6 text-lg leading-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            All features are live and included in the beta. One platform for the entire property management workflow.
          </motion.p>
        </div>

        <div className="mx-auto mt-16 space-y-20 sm:mt-20 lg:mt-24">
          {featureCategories.map((category, categoryIndex) => (
            <motion.div
              key={category.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.5, delay: categoryIndex * 0.1 }}
            >
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {category.name}
                </h3>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  {category.description}
                </p>
              </div>

              <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {category.features.map((feature, featureIndex) => (
                  <motion.div
                    key={feature.name}
                    className="group relative rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-brand-primary/50 hover:shadow-md dark:border-gray-700 dark:bg-gray-800/50"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{
                      duration: 0.4,
                      delay: featureIndex * 0.05
                    }}
                    whileHover={{ y: -2 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-primary/10">
                        <feature.icon className="h-5 w-5 text-brand-primary" aria-hidden="true" />
                      </div>
                      <dt className="text-base font-semibold text-gray-900 dark:text-white">
                        {feature.name}
                      </dt>
                    </div>
                    <dd className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                      {feature.description}
                    </dd>
                  </motion.div>
                ))}
              </dl>
            </motion.div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  )
}
```

**Step 2: Verify the build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add app/(unauthenticated)/(marketing)/_components/sections/features-section.tsx
git commit -m "feat(landing): reorganize features into 4 categories with all active features"
```

---

## Task 3: Create Coming Soon Section

**Files:**
- Create: `app/(unauthenticated)/(marketing)/_components/sections/coming-soon-section.tsx`

**Step 1: Create the coming soon section**

```tsx
"use client"

import { motion } from "framer-motion"
import { Building2, Search } from "lucide-react"
import { SectionWrapper } from "./section-wrapper"

const upcomingFeatures = [
  {
    name: "More Bank Integrations",
    description: "Beyond Investec - connecting to major SA banks for seamless payment reconciliation",
    icon: Building2
  },
  {
    name: "AI Property Research",
    description: "AI agents that find investment opportunities matching your criteria and analyze potential returns",
    icon: Search
  }
]

export function ComingSoonSection() {
  return (
    <SectionWrapper className="relative">
      <div className="mx-auto max-w-4xl">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            On the Roadmap
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            What we're building next
          </p>
        </motion.div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {upcomingFeatures.map((feature, index) => (
            <motion.div
              key={feature.name}
              className="relative rounded-xl border border-dashed border-gray-300 bg-gray-50/50 p-6 dark:border-gray-600 dark:bg-gray-800/30"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-700">
                  <feature.icon className="h-5 w-5 text-gray-500 dark:text-gray-400" aria-hidden="true" />
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300">
                    {feature.name}
                  </h3>
                  <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                    Coming Soon
                  </span>
                </div>
              </div>
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  )
}
```

**Step 2: Verify the build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add app/(unauthenticated)/(marketing)/_components/sections/coming-soon-section.tsx
git commit -m "feat(landing): add coming soon section for roadmap features"
```

---

## Task 4: Create Vision Section

**Files:**
- Create: `app/(unauthenticated)/(marketing)/_components/sections/vision-section.tsx`

**Step 1: Create the vision section**

```tsx
"use client"

import { motion } from "framer-motion"
import { Cpu } from "lucide-react"
import { SectionWrapper } from "./section-wrapper"

export function VisionSection() {
  return (
    <SectionWrapper className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-primary/5 to-transparent dark:from-brand-primary/10" />

      <div className="mx-auto max-w-3xl text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-brand-primary/10"
        >
          <Cpu className="h-8 w-8 text-brand-primary" />
        </motion.div>

        <motion.h2
          className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          The Future: AI That Runs Your Portfolio
        </motion.h2>

        <motion.p
          className="mt-6 text-lg leading-8 text-gray-600 dark:text-gray-300"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          We're building toward a world where AI handles 80% of property management tasks
          without human intervention.
        </motion.p>

        <motion.div
          className="mt-8 grid gap-4 text-left sm:grid-cols-2"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {[
            "Tenant onboarding",
            "Bill processing",
            "Incident resolution",
            "Payment follow-ups"
          ].map((item, index) => (
            <motion.div
              key={item}
              className="flex items-center gap-2 text-gray-700 dark:text-gray-300"
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: 0.4 + index * 0.1 }}
            >
              <span className="text-brand-primary">&#10003;</span>
              {item}
            </motion.div>
          ))}
        </motion.div>

        <motion.p
          className="mt-8 text-base text-gray-600 dark:text-gray-400"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          All running autonomously while you focus on growing your business.
          <br />
          <span className="font-medium text-brand-primary">
            Join the beta and help shape what comes next.
          </span>
        </motion.p>
      </div>
    </SectionWrapper>
  )
}
```

**Step 2: Verify the build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add app/(unauthenticated)/(marketing)/_components/sections/vision-section.tsx
git commit -m "feat(landing): add vision section for AI autonomy roadmap"
```

---

## Task 5: Update CTA Section

**Files:**
- Modify: `app/(unauthenticated)/(marketing)/_components/sections/cta-section.tsx`

**Step 1: Update CTA with beta messaging**

```tsx
"use client"

import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { SectionWrapper } from "./section-wrapper"

export function CTASection() {
  return (
    <SectionWrapper>
      <div className="mx-auto max-w-2xl text-center">
        <motion.h2
          className="text-gray-900 dark:text-white text-3xl font-bold tracking-tight sm:text-4xl"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          Ready to Automate Your Property Management?
        </motion.h2>
        <motion.p
          className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-600 dark:text-gray-300"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          PropNxt is in open beta. All features included. Free to try.
        </motion.p>
        <motion.div
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-x-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Button
            size="lg"
            className="w-full bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary-hover dark:bg-brand-primary dark:text-brand-primary-foreground dark:hover:bg-brand-primary-hover sm:w-auto"
            asChild
          >
            <Link href="/signup">
              Start Free Beta
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
        <motion.p
          className="mt-4 text-sm text-gray-500 dark:text-gray-400"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          No credit card required. Set up in minutes.
        </motion.p>
      </div>
    </SectionWrapper>
  )
}
```

**Step 2: Verify the build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add app/(unauthenticated)/(marketing)/_components/sections/cta-section.tsx
git commit -m "feat(landing): update CTA section with beta messaging"
```

---

## Task 6: Update FAQ Section

**Files:**
- Modify: `app/(unauthenticated)/(marketing)/_components/sections/faq-section.tsx`

**Step 1: Update FAQ questions for beta positioning**

Replace the `faqs` array (lines 13-54) with:

```tsx
const faqs = [
  {
    question: "What is PropNxt?",
    answer:
      "PropNxt is an AI-powered property management platform that automates the tedious work of rental management. From tenant onboarding to incident resolution, AI agents handle the coordination so you can focus on growing your portfolio."
  },
  {
    question: "Who is PropNxt built for?",
    answer:
      "PropNxt is built for rental agencies and property managers who want to automate their workflows and scale without adding headcount. Whether you manage 10 or 100+ properties, our AI handles the complexity."
  },
  {
    question: "Is PropNxt free during beta?",
    answer:
      "Yes! All features are included free during the beta period. No credit card required. We're actively working with early users to refine the product."
  },
  {
    question: "What features are currently available?",
    answer:
      "All core features are live: property and tenant management, AI lease templates with e-signatures, AI bill extraction, rental invoicing, payment tracking, expense management, incident management, AI-coordinated RFQs, moving inspections with AI fault detection, WhatsApp and email integration, and Investec bank integration."
  },
  {
    question: "How does the AI actually work?",
    answer:
      "Our AI agents process documents (extracting data from bills, leases, and receipts), coordinate workflows (routing incidents to service providers, generating RFQs), and communicate with tenants via WhatsApp. You set up the rules once, and the system handles everything automatically."
  },
  {
    question: "What makes PropNxt different from other property management software?",
    answer:
      "Unlike traditional software that just automates workflows, PropNxt uses true AI agents that understand context and make decisions. Our AI extracts data from any document format, coordinates between tenants and service providers, and detects faults in inspection photos - all without manual intervention."
  },
  {
    question: "What happens after the beta?",
    answer:
      "We'll introduce pricing plans after beta. Early adopters will receive special benefits for helping us shape the product. We're committed to building something that genuinely solves property management pain points."
  },
  {
    question: "How do I get started?",
    answer:
      "Sign up for free, add your first property, and start exploring. You can upload a bill to see AI extraction in action, connect WhatsApp for tenant communication, or set up a moving inspection. We're here to help if you have questions."
  }
]
```

**Step 2: Verify the build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add app/(unauthenticated)/(marketing)/_components/sections/faq-section.tsx
git commit -m "feat(landing): update FAQ with beta-focused questions and answers"
```

---

## Task 7: Update Main Page Structure

**Files:**
- Modify: `app/(unauthenticated)/(marketing)/page.tsx`

**Step 1: Update page to use new sections and remove placeholders**

```tsx
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
```

**Step 2: Verify the build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add app/(unauthenticated)/(marketing)/page.tsx
git commit -m "feat(landing): update page structure with new sections, remove placeholders"
```

---

## Task 8: Final Verification

**Step 1: Run full build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 2: Run linter**

Run: `npm run lint`
Expected: No linting errors

**Step 3: Manual visual check**

Run: `npm run dev`
- Open http://localhost:3000
- Verify hero shows beta badge and new copy
- Verify 4 feature categories display correctly
- Verify coming soon section shows 2 items
- Verify vision section displays
- Verify FAQ has updated questions
- Verify CTA has beta messaging
- Check dark mode toggle works
- Check mobile responsiveness

**Step 4: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix(landing): address any final issues from visual review"
```

---

## Summary

| Task | Files | Description |
|------|-------|-------------|
| 1 | hero-section.tsx | Update hero with AI-first messaging, beta badge |
| 2 | features-section.tsx | 4 categories, 18 active features |
| 3 | coming-soon-section.tsx (new) | Roadmap items |
| 4 | vision-section.tsx (new) | 80% autonomy vision |
| 5 | cta-section.tsx | Beta CTA messaging |
| 6 | faq-section.tsx | Updated questions for beta |
| 7 | page.tsx | New section order, remove placeholders |
| 8 | - | Final verification |
