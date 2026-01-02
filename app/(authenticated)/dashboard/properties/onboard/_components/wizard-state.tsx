"use client"

import { createContext, useContext, useState, useCallback, ReactNode } from "react"

import type { FieldMapping } from "@/app/(authenticated)/dashboard/rules/_components/field-mapping-builder"

export interface BillTemplateState {
  name: string
  billType: "municipality" | "levy" | "utility" | "other"
  ruleId?: string // Created rule ID (saved to DB)
  billTemplateId?: string // Created bill template ID (saved to DB)
  newRule?: {
    // Full rule data matching ModernRuleBuilder formData
    name: string
    extractForInvoice: boolean
    extractForPayment: boolean
    channel: "email_forward" | "manual_upload" | "agentic"
    emailFilterFrom?: string
    emailFilterSubject?: string
    emailProcessingInstruction?: string
    invoiceFieldMappings: FieldMapping[]
    paymentFieldMappings: FieldMapping[]
    invoiceInstruction?: string
    paymentInstruction?: string
  }
  expectedDayOfMonth?: number
}

export interface PayableTemplateState {
  name: string
  dependsOnBillTemplateIds: string[] // These are the created bill template IDs
  scheduledDayOfMonth?: number
  payableTemplateId?: string // Created payable template ID (saved to DB)
}

export interface TenantState {
  leaseFile?: File
  tenantId?: string // Created tenant ID (saved to DB)
  leaseAgreementId?: string // Created lease agreement ID (saved to DB)
  extractedData?: {
    name: string
    idNumber: string
    email?: string
    phone?: string
    rentalAmount?: number
    startDate: string
    endDate: string
  }
  manualData?: {
    name: string
    idNumber: string
    email?: string
    phone?: string
    rentalAmount?: number
    leaseStartDate?: Date
    leaseEndDate?: Date
  }
  rentalInvoiceTemplate?: {
    name?: string
    description?: string
    dependsOnBillTemplateIds: string[] // Array of bill template IDs (created bill template IDs)
    generationDayOfMonth: number
    pdfTemplate?: string
    fixedLineItems?: Array<{
      id: string
      description: string
      amount: number
      type?: string
    }>
    rentalInvoiceTemplateId?: string // Created rental invoice template ID (saved to DB)
  }
}

export interface WizardState {
  // Step 1: Property
  property: {
    name: string
    streetAddress: string
    suburb: string
    province: string
    country: string
    postalCode?: string
    propertyType?: string
    bankName?: string
    accountHolderName?: string
    accountNumber?: string
    branchCode?: string
    swiftCode?: string
    referenceFormat?: string
    // Property owner details (required when landlord is not a user)
    landlordName?: string
    landlordEmail?: string
    landlordPhone?: string
    landlordIdNumber?: string
    landlordAddress?: string
    propertyId?: string // Created property ID (saved to DB)
  }

  // Step 2: Bill Templates
  billTemplates: BillTemplateState[]

  // Step 3: Payable Templates
  payableTemplates: PayableTemplateState[]

  // Step 4: Tenants
  tenants: TenantState[]
}

const initialState: WizardState = {
  property: {
    name: "",
    streetAddress: "",
    suburb: "",
    province: "",
    country: "South Africa",
    postalCode: "",
    propertyType: "",
    bankName: "",
    accountHolderName: "",
    accountNumber: "",
    branchCode: "",
    swiftCode: "",
    referenceFormat: "",
    landlordName: "",
    landlordEmail: "",
    landlordPhone: "",
    landlordIdNumber: "",
    landlordAddress: ""
  },
  billTemplates: [],
  payableTemplates: [],
  tenants: []
}

interface WizardStateContextType {
  state: WizardState
  updateProperty: (property: Partial<WizardState["property"]>) => void
  updateBillTemplates: (templates: BillTemplateState[]) => void
  updatePayableTemplates: (templates: PayableTemplateState[]) => void
  updateTenants: (tenants: TenantState[]) => void
  setPropertyId: (propertyId: string) => void
  reset: () => void
}

const WizardStateContext = createContext<WizardStateContextType | undefined>(undefined)

export function WizardStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WizardState>(initialState)

  const updateProperty = useCallback((property: Partial<WizardState["property"]>) => {
    setState((prev) => ({
      ...prev,
      property: { ...prev.property, ...property }
    }))
  }, [])

  const updateBillTemplates = useCallback((templates: BillTemplateState[]) => {
    setState((prev) => ({ ...prev, billTemplates: templates }))
  }, [])

  const updatePayableTemplates = useCallback((templates: PayableTemplateState[]) => {
    setState((prev) => ({ ...prev, payableTemplates: templates }))
  }, [])

  const updateTenants = useCallback((tenants: TenantState[]) => {
    setState((prev) => ({ ...prev, tenants }))
  }, [])

  const setPropertyId = useCallback((propertyId: string) => {
    setState((prev) => ({
      ...prev,
      property: { ...prev.property, propertyId }
    }))
  }, [])

  const reset = useCallback(() => {
    setState(initialState)
  }, [])

  return (
    <WizardStateContext.Provider
      value={{
        state,
        updateProperty,
        updateBillTemplates,
        updatePayableTemplates,
        updateTenants,
        setPropertyId,
        reset
      }}
    >
      {children}
    </WizardStateContext.Provider>
  )
}

export function useWizardState() {
  const context = useContext(WizardStateContext)
  if (!context) {
    throw new Error("useWizardState must be used within WizardStateProvider")
  }
  return context
}

