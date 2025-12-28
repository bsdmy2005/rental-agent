/**
 * Default South African Residential Lease Agreement Template
 * Based on standard lease agreement structure
 */

export const defaultLeaseTemplateData = {
  name: "South African Residential Lease Agreement",
  sections: [
    {
      id: "header",
      type: "header",
      title: "RESIDENTIAL LEASE AGREEMENT",
      subtitle: "(South Africa)"
    },
    {
      id: "parties",
      type: "section",
      title: "1. PARTIES",
      content: "This Lease Agreement (\"Agreement\") is entered into on the ___ day of __________ 20___ between:",
      subsections: [
        {
          id: "lessor",
          title: "1.1 Lessor (Landlord):",
          fields: [
            { id: "landlord_name", label: "Full Name / Entity", type: "text", required: true },
            { id: "landlord_id", label: "ID / Registration Number", type: "text", required: true },
            { id: "landlord_address", label: "Address", type: "text", required: true },
            { id: "landlord_email", label: "Email", type: "email", required: true },
            { id: "landlord_phone", label: "Contact Number", type: "tel", required: true }
          ]
        },
        {
          id: "lessee",
          title: "1.2 Lessee (Tenant):",
          fields: [
            { id: "tenant_name", label: "Full Name", type: "text", required: true },
            { id: "tenant_id", label: "ID / Passport Number", type: "text", required: true },
            { id: "tenant_address", label: "Current Address", type: "text", required: true },
            { id: "tenant_email", label: "Email", type: "email", required: true },
            { id: "tenant_phone", label: "Contact Number", type: "tel", required: true }
          ]
        }
      ],
      footer: "The Lessor and Lessee are collectively referred to as \"the Parties\"."
    },
    {
      id: "premises",
      type: "section",
      title: "2. LEASED PREMISES",
      content: "The Lessor lets to the Lessee the residential property situated at:",
      fields: [
        { id: "property_address", label: "Physical Address", type: "text", required: true }
      ],
      footer: "Including all fixtures, fittings, parking bays, storerooms, and common-area usage as applicable (\"the Premises\")."
    },
    {
      id: "purpose",
      type: "section",
      title: "3. PURPOSE OF LEASE",
      content: [
        "3.1 The Premises shall be used solely for residential purposes.",
        "3.2 No business, sub-letting, short-term letting (e.g. Airbnb), or illegal activities are permitted without prior written consent from the Lessor."
      ]
    },
    {
      id: "duration",
      type: "section",
      title: "4. DURATION",
      fields: [
        { id: "commencement_date", label: "4.1 Commencement Date", type: "date", required: true },
        { id: "termination_date", label: "4.2 Termination Date", type: "date", required: true }
      ],
      content: [
        "4.3 This lease is a fixed-term lease in terms of the Consumer Protection Act.",
        "4.4 If the Lessee remains in occupation after expiry and the Lessor accepts rental, the lease shall continue on a month-to-month basis, subject to written notice by either Party."
      ]
    },
    {
      id: "rental",
      type: "section",
      title: "5. RENTAL",
      fields: [
        { id: "monthly_rental", label: "5.1 The Lessee shall pay rental of R", type: "currency", required: true, suffix: "per month." },
        { id: "rental_due_day", label: "5.2 Rental is payable monthly in advance, on or before the", type: "number", required: true, suffix: "day of each month." },
        { id: "payment_bank", label: "5.3 Rental shall be paid via: Bank", type: "text" },
        { id: "payment_account_holder", label: "Account Holder", type: "text" },
        { id: "payment_account_number", label: "Account Number", type: "text" },
        { id: "payment_branch_code", label: "Branch Code", type: "text" }
      ],
      content: [
        "5.4 Proof of payment must be provided upon request."
      ]
    },
    {
      id: "deposit",
      type: "section",
      title: "6. DEPOSIT",
      fields: [
        { id: "deposit_amount", label: "6.1 The Lessee shall pay a deposit of R", type: "currency", required: true, suffix: "prior to occupation." }
      ],
      content: [
        "6.2 The deposit shall be invested by the Lessor in an interest-bearing account with a South African financial institution.",
        "6.3 Interest accrued shall be payable to the Lessee upon termination, less lawful deductions.",
        "6.4 The deposit may be applied to:",
        "• Damage beyond fair wear and tear",
        "• Unpaid rental",
        "• Outstanding utilities or charges",
        "6.5 Any balance shall be refunded within 7–14 days, subject to inspection outcomes."
      ]
    },
    {
      id: "utilities",
      type: "section",
      title: "7. UTILITIES AND CHARGES",
      content: [
        "Unless otherwise agreed in writing, the Lessee shall be responsible for:",
        "• Electricity",
        "• Water",
        "• Refuse",
        "• Sewerage",
        "• Internet / DSTV / Fibre",
        "• Prepaid meter charges",
        "",
        "Body corporate levies and municipal rates remain the responsibility of the Lessor."
      ]
    },
    {
      id: "occupation",
      type: "section",
      title: "8. OCCUPATION & CONDITION",
      content: [
        "8.1 The Lessee confirms that the Premises are let in a habitable condition.",
        "8.2 A joint incoming inspection shall be conducted before occupation, with a signed inspection report forming part of this Agreement.",
        "8.3 A joint outgoing inspection shall be conducted within 3 days prior to vacating."
      ]
    },
    {
      id: "maintenance",
      type: "section",
      title: "9. MAINTENANCE & REPAIRS",
      content: [
        "9.1 The Lessor is responsible for:",
        "• Structural integrity",
        "• Plumbing, electrical, and major systems (unless caused by Lessee negligence)",
        "",
        "9.2 The Lessee is responsible for:",
        "• Keeping the Premises clean",
        "• Minor maintenance (light bulbs, fuses, batteries, etc.)",
        "• Damage caused by negligence, abuse, or misuse",
        "",
        "9.3 No alterations may be made without written consent."
      ]
    },
    {
      id: "use_care",
      type: "section",
      title: "10. USE, CARE & CONDUCT",
      content: [
        "The Lessee shall:",
        "• Not cause nuisance or disturbance",
        "• Comply with body corporate / estate rules",
        "• Not keep pets without written consent",
        "• Not overload electrical systems"
      ]
    },
    {
      id: "subletting",
      type: "section",
      title: "11. SUB-LETTING & CESSION",
      content: [
        "11.1 Sub-letting or cession is strictly prohibited without prior written consent."
      ]
    },
    {
      id: "access",
      type: "section",
      title: "12. ACCESS TO PREMISES",
      content: [
        "12.1 The Lessor may inspect the Premises with reasonable notice (normally 24 hours).",
        "12.2 Immediate access is permitted in emergencies."
      ]
    },
    {
      id: "breach",
      type: "section",
      title: "13. BREACH",
      content: [
        "13.1 Should either Party breach this Agreement and fail to remedy such breach within 7–20 business days after written notice, the other Party may:",
        "• Cancel the Agreement",
        "• Claim damages",
        "• Enforce performance"
      ]
    },
    {
      id: "early_termination",
      type: "section",
      title: "14. EARLY TERMINATION (CPA)",
      content: [
        "14.1 The Lessee may cancel this Agreement early by giving 20 business days' written notice.",
        "14.2 The Lessor may charge a reasonable early termination penalty, taking into account:",
        "• Remaining lease duration",
        "• Re-letting costs",
        "• Market conditions"
      ]
    },
    {
      id: "holdover",
      type: "section",
      title: "15. HOLDOVER & EVICTION",
      content: [
        "15.1 Failure to vacate upon lawful termination constitutes unlawful occupation.",
        "15.2 Eviction shall occur strictly in accordance with the Prevention of Illegal Eviction from and Unlawful Occupation of Land Act (PIE Act)."
      ]
    },
    {
      id: "insurance",
      type: "section",
      title: "16. INSURANCE & RISK",
      content: [
        "16.1 The Lessor insures the structure.",
        "16.2 The Lessee is responsible for insuring personal belongings.",
        "16.3 The Lessor is not liable for loss or damage to the Lessee's property, except where caused by gross negligence."
      ]
    },
    {
      id: "notices",
      type: "section",
      title: "17. NOTICES",
      content: [
        "All notices shall be in writing and sent to the domicilium addresses below:",
        "",
        "Lessor:",
        "[Landlord Address]",
        "",
        "Lessee:",
        "[Tenant Address]",
        "",
        "Email notices are deemed received within 24 hours."
      ]
    },
    {
      id: "domicilium",
      type: "section",
      title: "18. DOMICILIUM",
      content: [
        "The Parties choose their respective addresses above as their domicilium citandi et executandi."
      ]
    },
    {
      id: "general",
      type: "section",
      title: "19. GENERAL",
      content: [
        "19.1 This Agreement constitutes the entire agreement between the Parties.",
        "19.2 No variation shall be valid unless in writing and signed.",
        "19.3 South African law applies.",
        "19.4 If any clause is invalid, the remaining clauses remain enforceable."
      ]
    },
    {
      id: "signatures",
      type: "signatures",
      title: "20. SIGNATURES",
      content: "SIGNED at __________________ on this ___ day of __________ 20___",
      signatureFields: [
        {
          id: "lessor_signature",
          label: "LESSOR",
          nameField: "landlord_name"
        },
        {
          id: "lessee_signature",
          label: "LESSEE",
          nameField: "tenant_name"
        }
      ]
    }
  ]
}

