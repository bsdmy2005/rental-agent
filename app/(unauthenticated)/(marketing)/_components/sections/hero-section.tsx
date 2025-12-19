"use client"

import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { ArrowRight, Star } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { SectionWrapper } from "./section-wrapper"

export function HeroSection() {
  const [starHovered, setStarHovered] = useState(false)
  return (
    <SectionWrapper className="py-16 sm:py-32">
      {/* Animated gradient background */}

      <div className="mx-auto max-w-3xl text-center">
        <motion.h1
          className="text-foreground text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          AI-Driven
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
            Rental Investment Management
          </motion.span>
        </motion.h1>
        <motion.p
          className="mx-auto mt-4 max-w-2xl text-base leading-7 sm:text-lg sm:leading-8 text-gray-700 dark:text-gray-200"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Simplify, optimize, and leverage AI to streamline rental investment management end-to-end. 
          From day-to-day operations to cost optimization, tax filing, late payment follow-ups, and 
          delinquency management—all driven by intelligent AI agents.
        </motion.p>
        <motion.div
          className="mx-auto mt-6 max-w-2xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
        >
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm font-semibold text-gray-600 dark:text-gray-300">
            <span className="flex items-center gap-2">
              <span className="text-brand-primary">✓</span>
              Simplify
            </span>
            <span className="flex items-center gap-2">
              <span className="text-brand-primary">✓</span>
              Optimize
            </span>
            <span className="flex items-center gap-2">
              <span className="text-brand-primary">✓</span>
              Leverage AI
            </span>
          </div>
        </motion.div>
        <motion.div
          className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-x-6"
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
                Get Started Free
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
              <Link href="/login">
                Sign In
              </Link>
            </Button>
          </motion.div>
        </motion.div>

        {/* Trust indicators */}
        <motion.div
          className="mt-8 flex flex-col items-center justify-center gap-4 sm:mt-10 sm:flex-row sm:gap-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          {["End-to-End Automation", "AI-Powered Intelligence", "Portfolio Optimization"].map(
            (text, i) => (
              <motion.div
                key={text}
                className="flex w-full items-center justify-center gap-2 sm:w-auto"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.7 + i * 0.1 }}
              >
                <motion.span
                  className="text-brand-primary"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 15,
                    delay: 0.8 + i * 0.1
                  }}
                >
                  ✓
                </motion.span>
                <span className="text-gray-700 dark:text-gray-200">{text}</span>
              </motion.div>
            )
          )}
        </motion.div>
      </div>
    </SectionWrapper>
  )
}
