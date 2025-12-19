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
          className="bg-[#1F2937] text-white relative dark:bg-gray-900"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="relative flex items-center justify-center py-3">
              <div className="flex items-center gap-3 text-sm">
                <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide dark:bg-gray-700">
                  Launch beta
                </span>
                <span>
                  RentPilot AI is in active development for early landlords and agencies.
                </span>
              </div>
              <button
                onClick={handleDismiss}
                className="absolute right-0 rounded p-1 transition-colors hover:bg-white/10"
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
