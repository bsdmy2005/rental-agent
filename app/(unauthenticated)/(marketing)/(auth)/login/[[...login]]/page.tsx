"use client"

import {[
              {
                icon: Receipt,
                title: "AI Processing",
                desc: "Automated bill extraction",
                color: "text-yellow-500",
                bgColor: "bg-yellow-500/10"
              },
              {
                icon: Shield,
                title: "Secure Access",
                desc: "Bank-grade security",
                color: "text-blue-500",
                bgColor: "bg-blue-500/10"
              },
              {
                icon: Sparkles,
                title: "Smart Invoicing",
                desc: "Auto-generated invoices",
                color: "text-purple-500",
                bgColor: "bg-purple-500/10"
              },
              {
                icon: CreditCard,
                title: "Payment Automation",
                desc: "EFT execution ready",
                color: "text-green-500",
                bgColor: "bg-green-500/10"
              }
            ]
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                className="group relative overflow-hidden rounded-lg border border-slate-700 bg-slate-800 p-4 transition-all hover:shadow-lg"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                whileHover={{
                  scale: 1.05,
                  boxShadow: "0 10px 20px rgba(0,0,0,0.1)"
                }}
              >
                <motion.div
                  className="absolute inset-0 -z-10 opacity-0 transition-opacity group-hover:opacity-100"
                  style={{
                    background: `radial-gradient(circle at 50% 0%, ${
                      feature.color.split("-")[1]
                    }/10, transparent 70%)`
                  }}
                />
                <motion.div
                  className={`${feature.bgColor} mb-2 inline-flex rounded-lg p-2`}
                  initial={{ rotate: -10 }}
                  animate={{ rotate: 0 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 20,
                    delay: 0.4 + i * 0.1
                  }}
                  whileHover={{ rotate: 10 }}
                >
                  <feature.icon className={`h-5 w-5 ${feature.color}`} />
                </motion.div>
                <p className="text-sm font-semibold text-slate-50">{feature.title}</p>
                <p className="text-xs text-slate-300">{feature.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Stats */}
          <motion.div
            className="space-y-4 rounded-xl border border-slate-700 bg-slate-800 p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            whileHover={{
              boxShadow: "0 8px 30px -10px rgba(0,0,0,0.2)"
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-slate-50">1,000+</p>
                <p className="text-sm text-slate-300">
                  Bills processed
                </p>
              </div>
              <div className="h-12 w-px border-l border-slate-700" />
              <div>
                <p className="text-2xl font-bold text-slate-50">100+</p>
                <p className="text-sm text-slate-300">
                  Properties managed
                </p>
              </div>
              <div className="h-12 w-px border-l border-slate-700" />
              <div>
                <p className="text-2xl font-bold text-slate-50">10+ Hrs</p>
                <p className="text-sm text-slate-300">Saved/mo</p>
              </div>
            </div>
          </motion.div>

          {/* Trust badge */}
          <motion.div
            className="flex items-center gap-3 rounded-lg border border-green-700 bg-green-950/20 p-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.9 }}
            whileHover={{
              scale: 1.02,
              boxShadow: "0 4px 15px rgba(34, 197, 94, 0.2)"
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: "reverse"
              }}
            >
              <Shield className="h-5 w-5 text-green-400" />
            </motion.div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-50">Bank-grade security</p>
              <p className="text-xs text-slate-300">
                Encryption for your financial data
              </p>
            </div>
          </motion.div>
        </motion.div>

        {/* Right side - Sign in form */}
        <motion.div
          className="mx-auto w-full max-w-md lg:mx-0"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <motion.div
            className="mb-8 text-center lg:text-left"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <h2 className="mb-2 text-2xl font-semibold text-slate-50">
              Sign in to your RentPilot AI account
            </h2>
            <p className="text-sm text-slate-300">
              Don't have an account?{" "}
              <motion.span
                whileHover={{ scale: 1.05 }}
                className="inline-block"
              >
                <Link
                  href="/signup"
                  className="text-brand-primary font-medium transition-colors hover:underline"
                >
                  Join the launch beta
                  <ArrowRight className="ml-1 inline h-3 w-3" />
                </Link>
              </motion.span>
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="relative"
          >
            <motion.div
              className="from-brand-primary/20 to-brand-secondary/20 absolute -inset-1 rounded-lg bg-gradient-to-r opacity-50 blur-xl"
              animate={{
                opacity: [0.3, 0.6, 0.3]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <SignIn
              forceRedirectUrl="/dashboard"
              signUpUrl="/signup"
              appearance={{ baseTheme: theme === "dark" ? dark : undefined }}
            />
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
