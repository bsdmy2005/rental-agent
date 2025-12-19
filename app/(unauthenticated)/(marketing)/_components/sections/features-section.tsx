"use client"

import { motion } from "framer-motion"
import {
  FileText,
  Mail,
  Receipt,
  CreditCard,
  Zap,
  Brain
} from "lucide-react"
import { SectionWrapper } from "./section-wrapper"

const features = [
  {
    name: "AI-Powered PDF Processing",
    description:
      "Automatically extract data from municipality bills, levy statements, and utility invoices using OpenAI GPT-4 Vision.",
    icon: Brain
  },
  {
    name: "Email Integration",
    description:
      "Receive bills via email forwarding. Our system automatically processes attachments and extracts relevant information.",
    icon: Mail
  },
  {
    name: "Automated Invoice Generation",
    description:
      "Generate tenant invoices automatically from processed bills. Include rental amounts, water, electricity, and levies.",
    icon: Receipt
  },
  {
    name: "Payment Automation",
    description:
      "Execute EFT payments to municipalities and body corporates on behalf of property owners. Track all payments.",
    icon: CreditCard
  },
  {
    name: "Payment Reconciliation",
    description:
      "Automatically reconcile tenant payments with bank statements. Match transactions and track outstanding balances.",
    icon: FileText
  },
  {
    name: "Smart Extraction Rules",
    description:
      "Configure custom extraction rules for different bill types. Train the system to recognize your specific invoice formats.",
    icon: Zap
  }
]

export function FeaturesSection() {
  return (
    <SectionWrapper className="relative" id="features">
      <div className="bg-[radial-gradient(45%_45%_at_50%_50%,theme(colors.brand-primary/20),transparent)] absolute inset-0 -z-10 opacity-20 dark:opacity-40" />

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
            Everything you need to automate rental management
          </motion.p>
          <motion.p
            className="text-gray-600 dark:text-gray-300 mt-6 text-lg leading-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Replace manual processes with intelligent automation. Save time, reduce errors, and
            focus on growing your property portfolio.
          </motion.p>
        </div>

        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
            {features.map((feature, index) => (
              <motion.div
                key={feature.name}
                className="group relative flex flex-col"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.1,
                  ease: "easeOut"
                }}
              >
                <motion.div
                  className="bg-card ring-border w-fit rounded-lg p-2 ring-1"
                  whileHover={{
                    scale: 1.05,
                    boxShadow: "0 10px 30px -10px rgba(0,0,0,0.3)"
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <feature.icon
                    className="text-primary h-6 w-6"
                    aria-hidden="true"
                  />
                </motion.div>

                <dt className="text-gray-900 dark:text-white mt-4 flex items-center gap-x-3 text-base leading-7 font-semibold">
                  {feature.name}
                  <motion.div
                    className="from-[#1E40AF]/50 h-px flex-1 bg-gradient-to-r to-transparent dark:from-[#3B82F6]/50"
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.3 + index * 0.1 }}
                    style={{ transformOrigin: "left" }}
                  />
                </dt>

                <dd className="text-gray-600 dark:text-gray-300 mt-4 flex flex-auto flex-col text-base leading-7">
                  <p className="flex-auto">{feature.description}</p>
                </dd>

                <motion.div
                  className="bg-accent/50 absolute -inset-x-4 -inset-y-2 scale-95 rounded-2xl opacity-0"
                  whileHover={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                />
              </motion.div>
            ))}
          </dl>
        </div>
      </div>
    </SectionWrapper>
  )
}
