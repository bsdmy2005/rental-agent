"use client"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible"
import { motion } from "framer-motion"
import { Plus } from "lucide-react"
import { useState } from "react"
import { SectionWrapper } from "./section-wrapper"

const faqs = [
  {
    question: "What is Rental Agent AI?",
    answer:
      "Rental Agent AI is an AI-driven rental investment management platform that simplifies, optimizes, and leverages AI to streamline property management end-to-end. From day-to-day operations to cost optimization, tax filing, late payment follow-ups, and delinquency management—all powered by intelligent AI agents."
  },
  {
    question: "Who is this for?",
    answer:
      "We designed Rental Agent AI for property investors, landlords, and rental agencies who want to automate their entire rental investment workflow. Whether you manage one property or a large portfolio, our AI agents handle the complexity so you can focus on growth and optimization."
  },
  {
    question: "What features are currently available?",
    answer:
      "Currently available: AI-powered document processing, automated invoice generation, payment automation, payment reconciliation, and email integration. Coming soon: Intelligent expense tracking, AI-driven late payment follow-ups, portfolio performance analytics, cost optimization intelligence, automated tax filing, and smart property discovery."
  },
  {
    question: "How does the AI automation work?",
    answer:
      "Our AI agents automatically process bills, extract data, generate invoices, execute payments, track expenses, and manage compliance. You configure extraction rules once, and the system handles everything—from bill processing to tax preparation. Intelligent agents also proactively follow up on late payments and identify optimization opportunities."
  },
  {
    question: "Will this help with tax filing?",
    answer:
      "Yes! Coming soon, our platform will automatically track and categorize expenses, identify tax-deductible items, generate tax reports, and even submit directly to tax authorities. You'll have organized records and automated compliance monitoring, making tax season stress-free."
  },
  {
    question: "How does cost optimization work?",
    answer:
      "Our AI analyzes your expenses across properties, identifies patterns, and provides recommendations to reduce costs. It tracks operating expenses, compares against benchmarks, and suggests optimization opportunities—helping you maximize profitability across your portfolio."
  },
  {
    question: "Is my data secure?",
    answer:
      "Absolutely. We use enterprise-grade security infrastructure with encryption at rest and in transit. Bank connections use regulated open-banking providers, and we follow best practices for access control and data protection. Your financial data is never exposed to third parties."
  },
  {
    question: "How do I get started?",
    answer:
      "Sign up, complete onboarding for your landlord or agency profile, add your first property, and configure billing schedules. Forward a test bill or upload manually, and we'll guide you through creating extraction rules. You'll see end-to-end automation in action immediately."
  }
]

export function FAQSection() {
  const [openItems, setOpenItems] = useState<string[]>([])

  const toggleItem = (question: string) => {
    setOpenItems(prev =>
      prev.includes(question) ? prev.filter(item => item !== question) : [...prev, question]
    )
  }

  return (
    <SectionWrapper id="faq">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-4xl">
          <motion.h2
            className="text-gray-900 dark:text-white text-2xl leading-10 font-bold tracking-tight"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            Frequently asked questions
          </motion.h2>
          <motion.p
            className="text-gray-600 dark:text-gray-300 mt-6 text-base leading-7"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Answers to the most common questions about RentPilot AI. If you'd like to go deeper,
            reach out and we'll walk you through a live demo.
          </motion.p>
          <dl className="mt-10 space-y-6">
            {faqs.map((faq, index) => (
              <motion.div
                key={faq.question}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Collapsible
                  open={openItems.includes(faq.question)}
                  onOpenChange={() => toggleItem(faq.question)}
                >
                  <CollapsibleTrigger className="flex w-full items-start justify-between text-left">
                    <span className="text-gray-900 dark:text-white text-base leading-7 font-semibold">
                      {faq.question}
                    </span>
                    <motion.span
                      className="ml-6 flex h-7 items-center"
                      animate={{
                        rotate: openItems.includes(faq.question) ? 45 : 0
                      }}
                      transition={{ duration: 0.2 }}
                    >
                      <Plus className="text-gray-500 dark:text-gray-400 h-6 w-6" aria-hidden="true" />
                    </motion.span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 pr-12">
                    <motion.p
                      className="text-gray-600 dark:text-gray-300 text-base leading-7"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      {faq.answer}
                    </motion.p>
                  </CollapsibleContent>
                </Collapsible>
              </motion.div>
            ))}
          </dl>
        </div>
      </div>
    </SectionWrapper>
  )
}


