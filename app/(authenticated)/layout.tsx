import type React from "react"

// Prevent static generation for all authenticated routes
// All authenticated pages require database access and user authentication
export const dynamic = "force-dynamic"

export default function AuthenticatedLayout({
  children
}: {
  children: React.ReactNode
}) {
  return children
}
