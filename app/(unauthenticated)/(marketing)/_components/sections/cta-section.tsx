"use client"

import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { ArrowRight, Sparkles } from "lucide-react"
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
          Ready to retire your rental agent?
        </motion.h2>
        <motion.p
          className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-600 dark:text-gray-300"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          RentPilot AI automates billing, invoices, and tenant admin so you can
          focus on growing your portfolio instead of chasing paperwork.
        </motion.p>
        <motion.div
          className="mt-10 flex items-center justify-center gap-x-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Button
            size="lg"
            className="bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary-hover dark:bg-brand-primary dark:text-brand-primary-foreground dark:hover:bg-brand-primary-hover"
            asChild
          >
            <Link href="/signup">
              <Sparkles className="mr-2 h-4 w-4" />
              Start automating
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="link"
            className="text-brand-primary hover:text-brand-primary-hover dark:text-brand-primary dark:hover:text-brand-primary-hover"
            asChild
          >
            <Link href="#pricing">
              View pricing <span aria-hidden="true">→</span>
            </Link>
          </Button>
        </motion.div>

        {/* Stats */}
        <motion.div
          className="mt-16 grid grid-cols-3 gap-8 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {[
            { label: "Admin Time Saved", value: "10+ hrs/mo" },
            { label: "Manual Errors Reduced", value: "90%" },
            { label: "Properties Supported", value: "1 → 100+" }
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
            >
              <dt className="text-gray-600 dark:text-gray-300 text-sm font-medium">
                {stat.label}
              </dt>
              <dd className="from-[#1E40AF] to-[#3B82F6] mt-2 bg-gradient-to-r bg-clip-text text-2xl font-bold text-transparent dark:from-[#3B82F6] dark:to-[#60A5FA]">
                {stat.value}
              </dd>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </SectionWrapper>
  )
}
