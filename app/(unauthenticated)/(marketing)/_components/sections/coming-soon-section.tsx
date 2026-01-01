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
