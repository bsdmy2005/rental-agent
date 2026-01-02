"use client"

import { motion } from "framer-motion"
import { SectionWrapper } from "./section-wrapper"

const stats = [
  { label: "Bills processed in tests", value: "1,000+" },
  { label: "Properties modelled", value: "100+" },
  { label: "Countries supported", value: "2" }
]

const valuePoints = [
  "Built for African municipalities & levies first",
  "Works with single owners and multi‑landlord agencies",
  "Designed for real‑world bill quirks and edge cases",
  "Extensible rules for new bill formats over time"
]

export function CompaniesSection() {
  return (
    <SectionWrapper>
      <div className="mx-auto max-w-7xl">
        <motion.div
          className="mx-auto max-w-2xl text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-gray-900 dark:text-white text-3xl font-bold tracking-tight sm:text-4xl">
            Designed for real rental operations
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mt-4 text-lg leading-8">
            PropNxt.AI focuses on the boring but critical parts of being a landlord or agency:
            bills in, clear invoices out, and tenants always in the loop.
          </p>
        </motion.div>

        {/* Why it works */}
        <div className="mx-auto mt-12 max-w-3xl">
          <ul className="grid gap-4 text-left sm:grid-cols-2">
            {valuePoints.map(point => (
              <li
                key={point}
                className="bg-white text-gray-900 flex items-start gap-3 rounded-lg px-4 py-3 text-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:text-white dark:ring-gray-700"
              >
                <span className="mt-1 h-2 w-2 rounded-full bg-brand-primary" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Stats */}
        <motion.dl
          className="mx-auto mt-12 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-10 text-center sm:mt-16 sm:grid-cols-3 sm:gap-y-16 lg:mx-0 lg:max-w-none"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              className="mx-auto flex max-w-xs flex-col gap-y-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
            >
              <dt className="text-gray-600 dark:text-gray-300 text-base leading-7">
                {stat.label}
              </dt>
              <dd className="text-gray-900 dark:text-white order-first text-3xl font-semibold tracking-tight sm:text-5xl">
                <motion.span
                  initial={{ opacity: 0, scale: 0.5 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.5,
                    delay: 0.4 + index * 0.1,
                    type: "spring",
                    stiffness: 100
                  }}
                  className="inline-block"
                >
                  {stat.value}
                </motion.span>
              </dd>
            </motion.div>
          ))}
        </motion.dl>
      </div>
    </SectionWrapper>
  )
}
