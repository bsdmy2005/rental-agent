"use client"

import { motion } from "framer-motion"
import {
  FileText,
  Mail,
  Receipt,
  CreditCard,
  Zap,
  Brain,
  TrendingUp,
  Calculator,
  AlertCircle,
  BarChart3,
  Shield,
  Sparkles
} from "lucide-react"
import { SectionWrapper } from "./section-wrapper"

const features = [
  {
    name: "AI-Powered Document Processing",
    description:
      "Automatically extract data from bills, receipts, and invoices using advanced AI. Process municipality bills, levy statements, and utility invoices with intelligent recognition.",
    icon: Brain,
    status: "available"
  },
  {
    name: "Automated Invoice & Payment Management",
    description:
      "Generate tenant invoices automatically and execute payments to municipalities and body corporates. Full payment tracking and reconciliation.",
    icon: CreditCard,
    status: "available"
  },
  {
    name: "Intelligent Expense Tracking",
    description:
      "Automatically categorize expenses, track tax-deductible items, and maintain organized records for seamless tax filing. Coming soon: Direct tax authority integration.",
    icon: Calculator,
    status: "coming-soon"
  },
  {
    name: "AI-Driven Late Payment Follow-Ups",
    description:
      "Intelligent agents automatically follow up on late payments, send reminders, and track delinquencies. Reduce manual work and improve collection rates.",
    icon: AlertCircle,
    status: "coming-soon"
  },
  {
    name: "Portfolio Performance Analytics",
    description:
      "Track ROI, NOI, cash flow, and other key metrics across your entire portfolio. AI-powered insights help optimize your investment strategy.",
    icon: TrendingUp,
    status: "coming-soon"
  },
  {
    name: "Cost Optimization Intelligence",
    description:
      "AI analyzes your expenses, identifies optimization opportunities, and provides recommendations to reduce costs and maximize profitability.",
    icon: BarChart3,
    status: "coming-soon"
  },
  {
    name: "Automated Tax Filing",
    description:
      "Generate tax reports automatically, pre-fill tax forms, and submit directly to tax authorities. Never miss a deadline with AI-powered compliance monitoring.",
    icon: Shield,
    status: "coming-soon"
  },
  {
    name: "Smart Property Discovery",
    description:
      "AI agents actively search for investment opportunities matching your criteria. Analyze properties, calculate returns, and streamline acquisition workflows.",
    icon: Sparkles,
    status: "coming-soon"
  },
  {
    name: "Email & Document Integration",
    description:
      "Receive bills via email forwarding. Our system automatically processes attachments, extracts information, and organizes documents intelligently.",
    icon: Mail,
    status: "available"
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
            Everything you need to automate rental management
          </motion.p>
          <motion.p
            className="text-gray-600 dark:text-gray-300 mt-6 text-lg leading-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            From day-to-day operations to portfolio optimization—AI agents handle everything. 
            Simplify workflows, optimize costs, and leverage intelligent automation to grow your rental investment portfolio.
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
                  <span className="flex items-center gap-2">
                    {feature.name}
                    {feature.status === "coming-soon" && (
                      <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                        Coming Soon
                      </span>
                    )}
                  </span>
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
