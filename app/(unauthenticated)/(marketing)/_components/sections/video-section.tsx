"use client"

import { motion } from "framer-motion"
import { Play, Timer, Zap } from "lucide-react"
import { useState } from "react"
import { SectionWrapper } from "./section-wrapper"

export function VideoSection() {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <SectionWrapper id="how-it-works">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <motion.h2
            className="text-gray-900 dark:text-white text-3xl font-bold tracking-tight sm:text-4xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            See it in action
          </motion.h2>
          <motion.p
            className="text-gray-600 dark:text-gray-300 mt-4 text-lg leading-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Watch how RentPilot AI ingests bills, extracts charges, and prepares
            tenant invoices in minutes.
          </motion.p>
        </div>

        <motion.div
          className="mx-auto mt-16 max-w-4xl"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div
            className="group bg-white dark:bg-foreground relative aspect-video cursor-pointer overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* Video Preview Background */}
            <div className="from-brand-primary via-brand-secondary to-brand-accent absolute inset-0 bg-gradient-to-br opacity-0 dark:opacity-20" />

            {/* Flow Animation */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                className="text-gray-400 dark:text-muted-foreground text-left text-sm select-none"
                animate={{
                  opacity: isHovered ? 0.3 : 0.6
                }}
                transition={{ duration: 0.3 }}
              >
                <pre className="overflow-hidden">
                  <code>{`1. Email received from municipality
2. PDF bill detected and stored
3. AI extracts water, electricity, levies
4. Tenant invoices generated automatically
5. Payments scheduled for municipality & body corporate`}</code>
                </pre>
              </motion.div>
            </div>

            {/* Play Button */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <motion.button
                className="bg-white/90 text-gray-900 dark:bg-background/90 dark:text-foreground flex h-20 w-20 items-center justify-center rounded-full shadow-2xl backdrop-blur-sm"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Play className="ml-1 h-8 w-8" fill="currentColor" />
              </motion.button>
            </motion.div>

            {/* Video Stats */}
            <div className="from-gray-900 dark:from-foreground absolute right-0 bottom-0 left-0 bg-gradient-to-t to-transparent p-6">
              <div className="text-white dark:text-background flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">
                    Rental Agent Automation Demo
                  </h3>
                  <p className="text-white/80 dark:text-background/80 mt-1 text-sm">
                    From raw bills to ready-to-send invoices in a single flow
                  </p>
                </div>
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Timer className="h-4 w-4" />
                    <span>5 min</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Zap className="h-4 w-4" />
                    <span>Fast</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </SectionWrapper>
  )
}
