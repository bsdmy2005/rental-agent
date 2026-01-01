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
