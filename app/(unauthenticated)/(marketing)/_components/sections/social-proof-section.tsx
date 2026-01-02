"use client"

import { motion } from "framer-motion"
import { Star } from "lucide-react"
import { SectionWrapper } from "./section-wrapper"

const testimonials = [
  {
    name: "Lerato M.",
    role: "Johannesburg landlord (4 units)",
    content:
      "PropNxt.AI turned my messy bill spreadsheet into a clean monthly flow. I forward the municipality email and it does the rest—split bills, tenant invoices, everything.",
    rating: 5
  },
  {
    name: "Andile K.",
    role: "Boutique rental agency",
    content:
      "We manage properties for multiple owners. The ability to attach rules per property and still see one consolidated view of bills and invoices has been a game changer for our team.",
    rating: 5
  },
  {
    name: "Naomi P.",
    role: "First‑time landlord",
    content:
      "I used to dread bill time every month. Now I can see what’s due, what’s billed to tenants, and what’s been paid in one place. It feels like having an admin assistant on autopilot.",
    rating: 5
  }
]

export function SocialProofSection() {
  return (
    <SectionWrapper>
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-xl text-center">
          <motion.h2
            className="text-primary text-lg leading-8 font-semibold tracking-tight"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            Testimonials
          </motion.h2>
          <motion.p
            className="text-gray-900 dark:text-white mt-2 text-3xl font-bold tracking-tight sm:text-4xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Loved by landlords and rental teams
          </motion.p>
        </div>
        <div className="mx-auto mt-16 flow-root max-w-2xl sm:mt-20 lg:mx-0 lg:max-w-none">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                className="bg-white ring-gray-200 relative rounded-2xl p-8 shadow-md ring-1 dark:bg-gray-800 dark:ring-gray-700"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.1
                }}
                whileHover={{
                  y: -5,
                  boxShadow: "0 20px 40px rgba(0,0,0,0.1)"
                }}
              >
                <div className="flex items-center gap-x-1">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-5 w-5 fill-yellow-400 text-yellow-400"
                      aria-hidden="true"
                    />
                  ))}
                </div>
                <blockquote className="text-gray-600 dark:text-gray-300 mt-6 text-base leading-7">
                  <p>"{testimonial.content}"</p>
                </blockquote>
                <figcaption className="text-gray-900 dark:text-white mt-6 text-base font-semibold">
                  <div>{testimonial.name}</div>
                  <div className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
                    {testimonial.role}
                  </div>
                </figcaption>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </SectionWrapper>
  )
}
