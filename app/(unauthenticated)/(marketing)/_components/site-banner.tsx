"use client"

import { AnimatePresence, motion } from "framer-motion"
import { ArrowRight, X } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

export function SiteBanner() {
  const [isVisible, setIsVisible] = useState(true)

  const handleDismiss = () => {
    setIsVisible(false)
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          exit={{ y: -100 }}
          transition={{ duration: 0.2 }}
          className="bg-white text-gray-900 relative dark:bg-gray-900 dark:text-white"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="relative flex items-center justify-center py-3">
              <div className="flex items-center gap-3 text-sm">
                <span className="rounded-full bg-gray-100 text-gray-800 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide dark:bg-gray-700 dark:text-gray-300">
                  Launch beta
                </span>
                <span>
                  PropNxt.AI is in active development for early landlords and agencies.
                </span>
              </div>
              <button
                onClick={handleDismiss}
                className="absolute right-0 rounded p-1 transition-colors hover:bg-gray-200 dark:hover:bg-white/10"
                aria-label="Dismiss banner"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
