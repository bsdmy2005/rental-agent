"use client"

import { Button } from "@/components/ui/button"
import { SelectCustomer } from "@/db/schema/customers"
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs"
import { Menu, Moon, Sun, X, Sparkles } from "lucide-react"
import { useTheme } from "next-themes"
import Link from "next/link"
import { useEffect, useState } from "react"

interface HeaderProps {
  userMembership: SelectCustomer["membership"] | null
}

export function Header({ userMembership }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  const navigation = [
    { name: "Product", href: "#features" },
    { name: "How it works", href: "#how-it-works" },
    { name: "Pricing", href: "#pricing" },
    { name: "FAQ", href: "#faq" }
  ]

  return (
    <>
      <header className="bg-gradient-to-r from-[#1F2937] via-[#374151] to-[#1F2937]/95 sticky top-0 z-50 w-full border-b border-gray-700/50 text-white backdrop-blur dark:from-[#111827] dark:via-[#1F2937] dark:to-[#111827]/95">
        <nav
          className="mx-auto flex max-w-7xl items-center justify-between p-4 lg:px-8"
          aria-label="Global"
        >
          <div className="flex items-center gap-2 lg:flex-1">
            <Link href="/" className="-m-1.5 flex items-center gap-2 p-1.5">
              <span className="bg-brand-primary/10 text-brand-primary flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold">
                RP
              </span>
              <span className="text-xl font-semibold tracking-tight">RentPilot AI</span>
            </Link>
          </div>
          <div className="flex lg:hidden">
            <button
              type="button"
              className="text-gray-200 dark:text-gray-300 -m-2.5 inline-flex items-center justify-center rounded-md p-2.5"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? (
                <X className="h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
          <div className="hidden lg:flex lg:items-center lg:gap-x-8">
            <div className="bg-gray-700/40 ring-gray-600/80 flex items-center gap-x-4 rounded-full px-4 py-1.5 text-sm font-medium ring-1 dark:bg-gray-800/40 dark:ring-gray-700/80">
              {navigation.map(item => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-gray-200 hover:text-white transition-colors dark:text-gray-300 dark:hover:text-white"
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
          <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:gap-x-3">
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-200 hover:bg-gray-800/70 dark:text-gray-300 dark:hover:bg-gray-700/70"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
          )}
          <SignedOut>
              <Button
                variant="outline"
                asChild
                className="border-gray-700 bg-transparent text-gray-100 hover:bg-gray-800/60 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700/60"
              >
                <Link href="/login">Log in</Link>
              </Button>
              <Button className="bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary-hover dark:bg-brand-primary dark:text-brand-primary-foreground dark:hover:bg-brand-primary-hover">
                <Link href="/signup" className="flex items-center gap-1">
                  <Sparkles className="h-4 w-4" />
                  Get started
                </Link>
              </Button>
            </SignedOut>
            <SignedIn>
              {userMembership === "pro" ? (
                <Button className="bg-white text-gray-900 hover:bg-gray-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white" asChild>
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
              ) : (
                <Button
                  asChild
                  className="bg-white text-gray-900 hover:bg-gray-50 gap-2 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
                >
                  <Link href="/#pricing">
                    <Sparkles className="h-4 w-4" />
                    Upgrade
                  </Link>
                </Button>
              )}
              <UserButton />
            </SignedIn>
          </div>
        </nav>
      </header>

      {/* Mobile menu */}
      {mounted && mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="bg-black/40 fixed inset-0 z-[60] backdrop-blur-sm lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Menu panel */}
          <div className="bg-[#1F2937] sm:ring-border fixed inset-y-0 right-0 z-[70] w-full overflow-y-auto px-6 py-6 shadow-2xl sm:max-w-sm sm:ring-1 dark:bg-gray-900 lg:hidden">
            <div className="flex items-center justify-between">
              <Link
                href="/"
                className="-m-1.5 p-1.5"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="text-xl font-semibold tracking-tight">RentPilot AI</span>
              </Link>
              <button
                type="button"
                className="text-gray-200 dark:text-gray-300 -m-2.5 rounded-md p-2.5"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="sr-only">Close menu</span>
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-6 flow-root">
              <div className="divide-slate-700 -my-6 divide-y">
                <div className="space-y-2 py-6">
                  {navigation.map(item => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="text-gray-100 hover:bg-gray-800 hover:text-white dark:text-gray-200 dark:hover:bg-gray-700 -mx-3 block rounded-lg px-3 py-2 text-base leading-7 font-semibold"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
                <div className="space-y-3 py-6">
                  {mounted && (
                    <Button
                      variant="outline"
                      className="w-full justify-start border-gray-700 text-gray-100 hover:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                      onClick={() => {
                        setTheme(theme === "dark" ? "light" : "dark")
                        setMobileMenuOpen(false)
                      }}
                    >
                      {theme === "dark" ? (
                        <Sun className="mr-2 h-4 w-4" />
                      ) : (
                        <Moon className="mr-2 h-4 w-4" />
                      )}
                      {theme === "dark" ? "Light Mode" : "Dark Mode"}
                    </Button>
                  )}
                  <SignedOut>
                    <Button
                      variant="outline"
                      className="w-full border-gray-700 text-gray-100 hover:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                      asChild
                    >
                      <Link
                        href="/login"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Log in
                      </Link>
                    </Button>
                    <Button
                      className="w-full bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary-hover"
                      asChild
                    >
                      <Link
                        href="/signup"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Get started
                      </Link>
                    </Button>
                  </SignedOut>
                  <SignedIn>
                    {userMembership === "pro" ? (
                      <Button
                        className="w-full bg-white text-gray-900 hover:bg-gray-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
                        asChild
                      >
                        <Link
                          href="/dashboard"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          Dashboard
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        className="w-full bg-slate-100 text-slate-900 hover:bg-white gap-2"
                        asChild
                      >
                        <Link
                          href="/#pricing"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <Sparkles className="h-4 w-4" />
                          Upgrade
                        </Link>
                      </Button>
                    )}
                    <div className="flex justify-center pt-4">
                      <UserButton />
                    </div>
                  </SignedIn>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}


