import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"])
const isPublicApiRoute = createRouteMatcher([
  "/api/webhooks(.*)", // Webhook routes don't need auth
  "/api/test(.*)" // Test routes don't need auth
])

export default clerkMiddleware(async (auth, req) => {
  // Skip auth for public API routes (webhooks, test endpoints)
  if (isPublicApiRoute(req)) {
    return NextResponse.next()
  }

  const { userId, redirectToSignIn } = await auth()

  if (!userId && isProtectedRoute(req)) {
    return redirectToSignIn()
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)"
  ]
}
