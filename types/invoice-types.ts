export interface InvoiceLineItem {
  id: string // UUID for editing
  type: "rental" | "water" | "electricity" | "sewerage" | "levy" | "municipality" | "other"
  description: string
  quantity?: number | null
  unitPrice?: number | null
  amount: number
  usage?: number | null // For utilities (kWh, liters)
  sourceBillId?: string | null // Which bill this came from
}

export interface PropertyAddress {
  streetAddress: string
  suburb: string
  province: string
  country: string
  postalCode?: string | null
  fullAddress: string // Formatted full address string
}

export interface BankingDetails {
  bankName?: string | null
  accountHolderName?: string | null
  accountNumber?: string | null
  branchCode?: string | null
  swiftCode?: string | null
  referenceFormat?: string | null
}

export interface InvoiceData {
  invoiceNumber: string
  periodStart: string // ISO date
  periodEnd: string // ISO date
  dueDate: string // ISO date
  rentalAmount: number
  lineItems: InvoiceLineItem[]
  subtotal: number
  totalAmount: number
  notes?: string
  // Address information
  propertyAddress: PropertyAddress // The rental property address
  billingAddress?: string | null // Landlord/agent billing address (from landlords.address or rental_agents.address)
  bankingDetails?: BankingDetails | null // Payment instructions/banking details
  generatedAt: string // ISO timestamp
  sentAt?: string | null // ISO timestamp
}

