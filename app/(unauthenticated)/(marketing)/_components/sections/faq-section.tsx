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
            Answers to the most common questions about PropNxt. If you'd like to go deeper,
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


