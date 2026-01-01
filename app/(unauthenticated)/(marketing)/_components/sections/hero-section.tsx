"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"
import { ArrowRight, Bot, Workflow, MessageSquare } from "lucide-react"
import Link from "next/link"
import { SectionWrapper } from "./section-wrapper"

export function HeroSection() {
  return (
    <SectionWrapper className="py-16 sm:py-32">
      <div className="mx-auto max-w-3xl text-center">
        {/* Beta Badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm font-medium">
            Now in Open Beta - Try Free
          </Badge>
        </motion.div>

        <motion.h1
          className="text-foreground text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          AI-Powered
          <motion.span
            className="from-[#1E40AF] to-[#3B82F6] block bg-gradient-to-r bg-clip-text pb-2 leading-tight text-transparent dark:from-[#3B82F6] dark:to-[#60A5FA]"
            animate={{
              backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
            }}
            transition={{
              duration: 5,
              ease: "linear",
              repeat: Infinity
            }}
            style={{
              backgroundSize: "200% 200%"
            }}
          >
            Property Management
          </motion.span>
          <span className="text-3xl sm:text-4xl lg:text-5xl font-medium text-gray-600 dark:text-gray-400">
            That Actually Works
          </span>
        </motion.h1>

        <motion.p
          className="mx-auto mt-6 max-w-2xl text-base leading-7 sm:text-lg sm:leading-8 text-gray-700 dark:text-gray-200"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          PropNxt automates the tedious work of rental management - from tenant onboarding
          to incident resolution. Built for rental agencies and property managers who want
          to scale without scaling headcount.
        </motion.p>

        {/* Trust Badges */}
        <motion.div
          className="mx-auto mt-8 max-w-2xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
        >
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm font-medium text-gray-600 dark:text-gray-300">
            <span className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-brand-primary" />
              AI Agents Handle the Busywork
            </span>
            <span className="flex items-center gap-2">
              <Workflow className="h-4 w-4 text-brand-primary" />
              End-to-End Integration
            </span>
            <span className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-brand-primary" />
              WhatsApp-Native
            </span>
          </div>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-x-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full sm:w-auto"
          >
            <Button
              size="lg"
              asChild
              className="group relative w-full overflow-hidden bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary-hover sm:w-auto"
            >
              <Link href="/signup">
                <motion.span
                  className="absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  initial={{ x: "-200%" }}
                  whileHover={{ x: "200%" }}
                  transition={{ duration: 0.6 }}
                />
                Start Free Beta
                <motion.div
                  className="ml-2 inline-block"
                  initial={{ x: 0 }}
                  whileHover={{ x: 4 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <ArrowRight className="h-4 w-4" />
                </motion.div>
              </Link>
            </Button>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-full sm:w-auto"
          >
            <Button
              variant="outline"
              size="lg"
              asChild
              className="group w-full border-2 border-gray-300 bg-white text-gray-900 backdrop-blur-sm hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-100 dark:hover:bg-gray-700/50 sm:w-auto"
            >
              <Link href="#features">
                See How It Works
              </Link>
            </Button>
          </motion.div>
        </motion.div>

        {/* No credit card note */}
        <motion.p
          className="mt-4 text-sm text-gray-500 dark:text-gray-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          No credit card required. Set up in minutes.
        </motion.p>
      </div>
    </SectionWrapper>
  )
}
