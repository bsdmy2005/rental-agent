# PropNxt Landing Page Rebrand Design

**Date:** 2026-01-01
**Status:** Approved

## Overview

Rebrand the landing page to reflect PropNxt's actual capabilities and AI-first positioning. The current landing page was created before the system was built and doesn't showcase the features now available.

## Target Audience (Priority Order)

1. **Rental agencies** - Manage portfolios for multiple landlords
2. **Property management companies** - Larger operations with staff
3. **Individual landlords** - Self-managing property owners

## Key Differentiators

- **True AI agents** - Not just automation, but AI that understands context and coordinates workflows
- **WhatsApp-native communication** - Tenants interact naturally, AI handles routing
- **AI document extraction** - Upload any bill format, AI extracts data
- **AI-coordinated incident → RFQ flow** - Incidents automatically become quotes to service providers
- **AI fault detection** - Vision AI analyzes inspection photos for defects
- **End-to-end vertical integration** - One system for the entire property management workflow

## Positioning

- **Beta:** Open beta - "Now in beta - try free"
- **Geography:** No specific mention (product speaks for itself)
- **Competitor differentiation:** WeConnectU offers "automation" but PropNxt offers true AI agents

---

## Landing Page Structure

### Section 1: Hero

**Headline:**
```
AI-Powered Property Management
That Actually Works
```

**Subheadline:**
```
PropNxt automates the tedious work of rental management - from tenant
onboarding to incident resolution. Built for rental agencies and property
managers who want to scale without scaling headcount.
```

**Trust badges:**
- AI Agents Handle the Busywork
- End-to-End Workflow Integration
- WhatsApp-Native Tenant Communication

**CTAs:**
- Primary: "Start Free Beta" → /signup
- Secondary: "See How It Works" → #features

**Beta badge:** "Now in Open Beta - Try Free"

---

### Section 2: Features (4 Categories)

**Section header:**
```
Everything You Need to Manage Properties End-to-End
All features are live and included in the beta.
```

#### Category 1: Portfolio Management

| Feature | Description |
|---------|-------------|
| Properties | Manage your entire portfolio - units, addresses, landlord assignments |
| Tenants | Full tenant records with documents, contact details, lease history |
| Leases | Create, track, and manage lease agreements with renewal reminders |
| AI Lease Templates | Generate customized lease documents with AI - adapts to your requirements |
| E-Signatures | Digital signing with real-time signature tracking |

#### Category 2: Financial Operations

| Feature | Description |
|---------|-------------|
| AI Bill Extraction | Upload municipality bills, levies, utilities - AI extracts the data automatically |
| Rental Invoices | Auto-generate tenant invoices based on lease terms and extracted bills |
| Payment Tracking | Track incoming payments and match to invoices |
| Expenses | Log and categorize property expenses for reporting |
| Investec Integration | Live bank feed for payment reconciliation |

#### Category 3: Maintenance & Inspections

| Feature | Description |
|---------|-------------|
| Incident Management | Tenants report issues via WhatsApp - automatically logged and tracked |
| Service Providers | Directory of vetted contractors, plumbers, electricians |
| AI-Coordinated RFQs | AI transforms incidents into quotes - automatically reaches out to relevant service providers |
| Moving Inspections | Digital move-in/move-out inspections with photo documentation |
| AI Fault Detection | AI analyzes inspection photos to identify defects and damage |

#### Category 4: Communication & Integration

| Feature | Description |
|---------|-------------|
| WhatsApp Integration | Tenants communicate naturally via WhatsApp - AI handles routing and responses |
| Email Integration | Forward bills and documents via email - automatically processed |
| Workflow Automation | End-to-end processes that connect everything - no manual handoffs |

---

### Section 3: Coming Soon

**Header:** "On the Roadmap"

- **More Bank Integrations** - Beyond Investec, connecting to major SA banks
- **AI Property Research** - AI agents that find investment opportunities matching your criteria

---

### Section 4: Vision

```
The Future: AI That Runs Your Portfolio

We're building toward a world where AI handles 80% of property management
tasks without human intervention.

Tenant onboarding. Bill processing. Incident resolution. Payment follow-ups.
All running autonomously while you focus on growing your business.

Join the beta and help shape what comes next.
```

---

### Section 5: Final CTA

```
Ready to Automate Your Property Management?

PropNxt is in open beta. All features included. Free to try.
```

**CTA Button:** "Start Free Beta"

**Trust line:** "No credit card required. Set up in minutes."

---

### Section 6: FAQ Updates

Add/update these questions:

| Question | Answer |
|----------|--------|
| Is PropNxt free during beta? | Yes, all features are included free during the beta period. |
| Who is PropNxt built for? | Rental agencies and property managers who want to automate their workflows and scale without adding headcount. |
| What happens after beta? | We'll introduce pricing plans. Beta users will receive early-adopter benefits. |

---

## Files to Modify

1. `app/(unauthenticated)/(marketing)/page.tsx` - Update section order
2. `app/(unauthenticated)/(marketing)/_components/sections/hero-section.tsx` - New copy, beta badge
3. `app/(unauthenticated)/(marketing)/_components/sections/features-section.tsx` - 4 categories, all active
4. `app/(unauthenticated)/(marketing)/_components/sections/cta-section.tsx` - Beta messaging
5. `app/(unauthenticated)/(marketing)/_components/sections/faq-section.tsx` - New questions
6. New: `app/(unauthenticated)/(marketing)/_components/sections/vision-section.tsx`
7. New: `app/(unauthenticated)/(marketing)/_components/sections/coming-soon-section.tsx`

## Sections to Remove/Simplify

- `CompaniesSection` - Remove unless we have real logos to show
- `VideoSection` - Remove unless we have a product video
- `SocialProofSection` - Remove unless we have real testimonials
- `PricingSection` - Remove or simplify to "Free during beta"

---

## Implementation Notes

- Keep existing animation patterns (framer-motion)
- Maintain dark/light mode support
- Mobile-responsive design
- All CTAs point to /signup for beta access
