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
