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
    question: "What is RentPilot AI?",
    answer:
      "RentPilot AI is an automated rental agent for landlords and agencies. It ingests municipality bills and levy statements, extracts the key charges, and prepares tenant-ready invoices for you."
  },
  {
    question: "Who is this for?",
    answer:
      "We designed RentPilot AI for individual property owners and rental agencies who want to remove manual billing admin, reduce errors, and get a clear view of cash flow across properties."
  },
  {
    question: "How does billing and invoicing work?",
    answer:
      "You connect your bill sources (email forwarding or manual uploads), configure extraction rules once, and RentPilot AI automatically turns each new bill into tenant invoices with the right splits for rent, water, electricity, and levies."
  },
  {
    question: "Do tenants get access?",
    answer:
      "Yes. Tenants can be invited to a portal where they can view invoices, see payment history, and log maintenance issues. You stay in control of which properties and tenants are enabled."
  },
  {
    question: "Is my data and banking information secure?",
    answer:
      "We use battle-tested infrastructure and follow best practices for encryption and access control. Bank connections, when enabled, will use regulated open‑banking providers and never expose raw credentials to third parties."
  },
  {
    question: "How do I get started?",
    answer:
      "Sign up, complete a short onboarding for your landlord or agency profile, add your first property, and forward a test bill. We’ll guide you through creating your first extraction rule so you can see an end‑to‑end invoice flow."
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
            className="text-slate-50 text-2xl leading-10 font-bold tracking-tight"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            Frequently asked questions
          </motion.h2>
          <motion.p
            className="text-slate-300 mt-6 text-base leading-7"
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
                    <span className="text-slate-50 text-base leading-7 font-semibold">
                      {faq.question}
                    </span>
                    <motion.span
                      className="ml-6 flex h-7 items-center"
                      animate={{
                        rotate: openItems.includes(faq.question) ? 45 : 0
                      }}
                      transition={{ duration: 0.2 }}
                    >
                      <Plus className="text-slate-400 h-6 w-6" aria-hidden="true" />
                    </motion.span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 pr-12">
                    <motion.p
                      className="text-slate-300 text-base leading-7"
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


