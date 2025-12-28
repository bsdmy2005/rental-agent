import { type InsertExpenseCategory } from "../../schema/expense-categories"

export const standardExpenseCategoriesData: InsertExpenseCategory[] = [
  {
    name: "maintenance",
    description: "General property maintenance expenses",
    category: "maintenance",
    isStandard: true,
    userId: null
  },
  {
    name: "repairs",
    description: "Property repair costs",
    category: "repairs",
    isStandard: true,
    userId: null
  },
  {
    name: "insurance",
    description: "Property insurance premiums",
    category: "insurance",
    isStandard: true,
    userId: null
  },
  {
    name: "property_management_fees",
    description: "Fees paid to property management companies or agents",
    category: "property_management_fees",
    isStandard: true,
    userId: null
  },
  {
    name: "municipal_rates_taxes",
    description: "Municipal rates and property taxes",
    category: "municipal_rates_taxes",
    isStandard: true,
    userId: null
  },
  {
    name: "interest_mortgage_bonds",
    description: "Interest payments on mortgage bonds",
    category: "interest_mortgage_bonds",
    isStandard: true,
    userId: null
  },
  {
    name: "advertising",
    description: "Property advertising and marketing expenses",
    category: "advertising",
    isStandard: true,
    userId: null
  },
  {
    name: "legal_fees",
    description: "Legal and professional fees",
    category: "legal_fees",
    isStandard: true,
    userId: null
  },
  {
    name: "cleaning",
    description: "Cleaning and janitorial services",
    category: "cleaning",
    isStandard: true,
    userId: null
  },
  {
    name: "gardening",
    description: "Landscaping and gardening expenses",
    category: "gardening",
    isStandard: true,
    userId: null
  },
  {
    name: "utilities",
    description: "Utilities paid by landlord (if applicable)",
    category: "utilities",
    isStandard: true,
    userId: null
  },
  {
    name: "other",
    description: "Other deductible expenses",
    category: "other",
    isStandard: true,
    userId: null
  }
]
