import React from "react"
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet
} from "@react-pdf/renderer"
import type { InvoiceData } from "@/types"

interface InvoicePDFProps {
  invoiceData: InvoiceData
  propertyName: string
  tenantName: string
  tenantEmail?: string | null
  tenantPhone?: string | null
}

const formatCurrency = (amount: number) => {
  return `R ${amount.toFixed(2)}`
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "long",
    day: "numeric"
  })
}

// Helper function to check if banking details exist
const hasBankingDetails = (bankingDetails?: import("@/types").BankingDetails | null) => {
  if (!bankingDetails) return false
  return !!(
    bankingDetails.bankName ||
    bankingDetails.accountHolderName ||
    bankingDetails.accountNumber ||
    bankingDetails.branchCode ||
    bankingDetails.swiftCode ||
    bankingDetails.referenceFormat
  )
}

// Helper function to format banking details as compact text
const formatBankingDetails = (
  bankingDetails: import("@/types").BankingDetails,
  invoiceNumber: string
): string => {
  const parts: string[] = []
  
  if (bankingDetails.bankName) parts.push(`Bank: ${bankingDetails.bankName}`)
  if (bankingDetails.accountHolderName) parts.push(`Account: ${bankingDetails.accountHolderName}`)
  if (bankingDetails.accountNumber) parts.push(`Acc #: ${bankingDetails.accountNumber}`)
  if (bankingDetails.branchCode) parts.push(`Branch: ${bankingDetails.branchCode}`)
  if (bankingDetails.swiftCode) parts.push(`Swift: ${bankingDetails.swiftCode}`)
  
  const reference = bankingDetails.referenceFormat
    ? bankingDetails.referenceFormat.replace("{INVOICE_NUMBER}", invoiceNumber)
    : invoiceNumber
  if (reference) parts.push(`Ref: ${reference}`)
  
  return parts.length > 0 ? parts.join(" | ") : ""
}

// ============================================
// CLASSIC TEMPLATE (Original design)
// ============================================
const classicStyles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica"
  },
  header: {
    marginBottom: 30
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10
  },
  invoiceNumber: {
    fontSize: 12,
    color: "#666",
    marginBottom: 5
  },
  section: {
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 8,
    borderBottom: "1px solid #ccc",
    paddingBottom: 4
  },
  addressBlock: {
    marginBottom: 10
  },
  addressLine: {
    marginBottom: 2
  },
  lineItemsTable: {
    marginTop: 10,
    marginBottom: 20
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    padding: 8,
    fontWeight: "bold",
    borderBottom: "1px solid #ccc"
  },
  tableRow: {
    flexDirection: "row",
    padding: 8,
    borderBottom: "1px solid #eee"
  },
  colDescription: {
    width: "40%"
  },
  colQuantity: {
    width: "15%",
    textAlign: "right"
  },
  colUnitPrice: {
    width: "15%",
    textAlign: "right"
  },
  colAmount: {
    width: "30%",
    textAlign: "right",
    fontWeight: "bold"
  },
  totalsSection: {
    marginTop: 20,
    alignItems: "flex-end"
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "40%",
    marginBottom: 5
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: "bold"
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: "bold"
  },
  grandTotal: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 10,
    paddingTop: 10,
    borderTop: "2px solid #000"
  },
  notes: {
    marginTop: 30,
    padding: 10,
    backgroundColor: "#f9f9f9",
    fontSize: 9
  },
  footer: {
    marginTop: 40,
    paddingTop: 20,
    borderTop: "1px solid #ccc",
    fontSize: 8,
    color: "#666"
  }
})

export const ClassicInvoicePDF: React.FC<InvoicePDFProps> = ({
  invoiceData,
  propertyName,
  tenantName,
  tenantEmail,
  tenantPhone
}) => {
  return (
    <Document>
      <Page size="A4" style={classicStyles.page}>
        <View style={classicStyles.header}>
          <Text style={classicStyles.title}>INVOICE</Text>
          <Text style={classicStyles.invoiceNumber}>Invoice #: {invoiceData.invoiceNumber}</Text>
        </View>

        <View style={classicStyles.section}>
          <Text style={classicStyles.sectionTitle}>Property Address</Text>
          <View style={classicStyles.addressBlock}>
            <Text style={classicStyles.addressLine}>{propertyName}</Text>
            <Text style={classicStyles.addressLine}>{invoiceData.propertyAddress.fullAddress}</Text>
          </View>
        </View>

        {invoiceData.billingAddress && (
          <View style={classicStyles.section}>
            <Text style={classicStyles.sectionTitle}>Billing Address</Text>
            <View style={classicStyles.addressBlock}>
              <Text style={classicStyles.addressLine}>{invoiceData.billingAddress}</Text>
            </View>
          </View>
        )}

        <View style={classicStyles.section}>
          <Text style={classicStyles.sectionTitle}>Bill To</Text>
          <View style={classicStyles.addressBlock}>
            <Text style={classicStyles.addressLine}>{tenantName}</Text>
            {tenantEmail && <Text style={classicStyles.addressLine}>{tenantEmail}</Text>}
            {tenantPhone && <Text style={classicStyles.addressLine}>{tenantPhone}</Text>}
          </View>
        </View>

        <View style={classicStyles.section}>
          <Text style={classicStyles.sectionTitle}>Invoice Details</Text>
          <Text style={classicStyles.addressLine}>Period: {formatDate(invoiceData.periodStart)} - {formatDate(invoiceData.periodEnd)}</Text>
          <Text style={classicStyles.addressLine}>Due Date: {formatDate(invoiceData.dueDate)}</Text>
        </View>

        <View style={classicStyles.section}>
          <Text style={classicStyles.sectionTitle}>Line Items</Text>
          <View style={classicStyles.lineItemsTable}>
            <View style={classicStyles.tableHeader}>
              <Text style={classicStyles.colDescription}>Description</Text>
              <Text style={classicStyles.colQuantity}>Quantity</Text>
              <Text style={classicStyles.colUnitPrice}>Unit Price</Text>
              <Text style={classicStyles.colAmount}>Amount</Text>
            </View>
            {invoiceData.lineItems.map((item) => (
              <View key={item.id} style={classicStyles.tableRow}>
                <Text style={classicStyles.colDescription}>{item.description}</Text>
                <Text style={classicStyles.colQuantity}>{item.quantity ?? "-"}</Text>
                <Text style={classicStyles.colUnitPrice}>
                  {item.unitPrice ? formatCurrency(item.unitPrice) : "-"}
                </Text>
                <Text style={classicStyles.colAmount}>{formatCurrency(item.amount)}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={classicStyles.totalsSection}>
          <View style={classicStyles.totalRow}>
            <Text style={classicStyles.totalLabel}>Subtotal:</Text>
            <Text style={classicStyles.totalAmount}>{formatCurrency(invoiceData.subtotal)}</Text>
          </View>
          <View style={classicStyles.totalRow}>
            <Text style={classicStyles.grandTotal}>Total Amount:</Text>
            <Text style={classicStyles.grandTotal}>{formatCurrency(invoiceData.totalAmount)}</Text>
          </View>
        </View>

        {invoiceData.notes && (
          <View style={classicStyles.notes}>
            <Text style={classicStyles.sectionTitle}>Notes</Text>
            <Text>{invoiceData.notes}</Text>
          </View>
        )}

        <View style={classicStyles.footer}>
          <Text>Payment Instructions:</Text>
          {invoiceData.billingAddress && (
            <Text>Please send payment to: {invoiceData.billingAddress}</Text>
          )}
          {hasBankingDetails(invoiceData.bankingDetails) && invoiceData.bankingDetails && (
            <Text>{formatBankingDetails(invoiceData.bankingDetails, invoiceData.invoiceNumber)}</Text>
          )}
          <Text>Due Date: {formatDate(invoiceData.dueDate)}</Text>
          <Text>Thank you for your business!</Text>
        </View>
      </Page>
    </Document>
  )
}

// ============================================
// MODERN TEMPLATE (Colorful, professional)
// ============================================
const modernStyles = StyleSheet.create({
  page: {
    padding: 20,
    fontSize: 9,
    fontFamily: "Helvetica"
  },
  header: {
    backgroundColor: "#2563eb",
    color: "#ffffff",
    padding: 15,
    marginBottom: 18,
    borderRadius: 4
  },
  headerContent: {
    color: "#ffffff"
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#ffffff"
  },
  invoiceNumber: {
    fontSize: 10,
    color: "#e0e7ff",
    marginBottom: 0
  },
  twoColumn: {
    flexDirection: "row",
    marginBottom: 15,
    gap: 15
  },
  column: {
    flex: 1
  },
  section: {
    marginBottom: 10,
    padding: 8,
    backgroundColor: "#f8fafc",
    borderRadius: 4
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#1e293b",
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  addressBlock: {
    marginBottom: 3
  },
  addressLine: {
    marginBottom: 2,
    color: "#475569",
    fontSize: 9
  },
  lineItemsTable: {
    marginTop: 8,
    marginBottom: 12,
    border: "1px solid #e2e8f0",
    borderRadius: 4
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#1e293b",
    padding: 6,
    fontWeight: "bold",
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4
  },
  tableHeaderText: {
    color: "#ffffff",
    fontSize: 9
  },
  tableRow: {
    flexDirection: "row",
    padding: 6,
    borderBottom: "1px solid #e2e8f0",
    backgroundColor: "#ffffff"
  },
  colDescription: {
    width: "45%",
    fontSize: 9
  },
  colQuantity: {
    width: "15%",
    textAlign: "right",
    fontSize: 9
  },
  colUnitPrice: {
    width: "20%",
    textAlign: "right",
    fontSize: 9
  },
  colAmount: {
    width: "20%",
    textAlign: "right",
    fontWeight: "bold",
    color: "#2563eb",
    fontSize: 9
  },
  totalsSection: {
    marginTop: 12,
    alignItems: "flex-end",
    padding: 12,
    backgroundColor: "#f1f5f9",
    borderRadius: 4
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "40%",
    marginBottom: 6
  },
  totalLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#475569"
  },
  totalAmount: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#1e293b"
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 10,
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 10,
    paddingRight: 10,
    backgroundColor: "#f1f5f9",
    borderRadius: 4,
    borderTop: "2px solid #2563eb"
  },
  grandTotalLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#1e293b"
  },
  grandTotalValue: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#2563eb"
  },
  notes: {
    marginTop: 15,
    padding: 10,
    backgroundColor: "#fef3c7",
    borderRadius: 4,
    fontSize: 8,
    borderLeft: "3px solid #f59e0b"
  },
  footer: {
    marginTop: 15,
    paddingTop: 10,
    paddingBottom: 10,
    borderTop: "1px solid #e2e8f0",
    fontSize: 8,
    color: "#64748b",
    flexWrap: "wrap"
  }
})

export const ModernInvoicePDF: React.FC<InvoicePDFProps> = ({
  invoiceData,
  propertyName,
  tenantName,
  tenantEmail,
  tenantPhone
}) => {
  return (
    <Document>
      <Page size="A4" style={modernStyles.page}>
        <View style={modernStyles.header}>
          <Text style={modernStyles.title}>INVOICE</Text>
          <Text style={modernStyles.invoiceNumber}>#{invoiceData.invoiceNumber}</Text>
        </View>

        <View style={modernStyles.twoColumn}>
          <View style={modernStyles.column}>
            <View style={modernStyles.section}>
              <Text style={modernStyles.sectionTitle}>Property</Text>
              <Text style={modernStyles.addressLine}>{propertyName}</Text>
              <Text style={modernStyles.addressLine}>{invoiceData.propertyAddress.fullAddress}</Text>
            </View>

            <View style={modernStyles.section}>
              <Text style={modernStyles.sectionTitle}>Bill To</Text>
              <Text style={modernStyles.addressLine}>{tenantName}</Text>
              {tenantEmail && <Text style={modernStyles.addressLine}>{tenantEmail}</Text>}
              {tenantPhone && <Text style={modernStyles.addressLine}>{tenantPhone}</Text>}
            </View>
          </View>

          <View style={modernStyles.column}>
            {invoiceData.billingAddress && (
              <View style={modernStyles.section}>
                <Text style={modernStyles.sectionTitle}>Billing Address</Text>
                <Text style={modernStyles.addressLine}>{invoiceData.billingAddress}</Text>
              </View>
            )}

            <View style={modernStyles.section}>
              <Text style={modernStyles.sectionTitle}>Invoice Details</Text>
              <Text style={modernStyles.addressLine}>Period: {formatDate(invoiceData.periodStart)} - {formatDate(invoiceData.periodEnd)}</Text>
              <Text style={modernStyles.addressLine}>Due Date: {formatDate(invoiceData.dueDate)}</Text>
            </View>
          </View>
        </View>

        <View style={modernStyles.section}>
          <Text style={modernStyles.sectionTitle}>Line Items</Text>
          <View style={modernStyles.lineItemsTable}>
            <View style={modernStyles.tableHeader}>
              <Text style={[modernStyles.colDescription, modernStyles.tableHeaderText]}>Description</Text>
              <Text style={[modernStyles.colQuantity, modernStyles.tableHeaderText]}>Qty</Text>
              <Text style={[modernStyles.colUnitPrice, modernStyles.tableHeaderText]}>Unit Price</Text>
              <Text style={[modernStyles.colAmount, modernStyles.tableHeaderText]}>Amount</Text>
            </View>
            {invoiceData.lineItems.map((item) => (
              <View key={item.id} style={modernStyles.tableRow}>
                <Text style={modernStyles.colDescription}>{item.description}</Text>
                <Text style={modernStyles.colQuantity}>{item.quantity ?? "-"}</Text>
                <Text style={modernStyles.colUnitPrice}>
                  {item.unitPrice ? formatCurrency(item.unitPrice) : "-"}
                </Text>
                <Text style={modernStyles.colAmount}>{formatCurrency(item.amount)}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={modernStyles.totalsSection}>
          <View style={modernStyles.totalRow}>
            <Text style={modernStyles.totalLabel}>Subtotal:</Text>
            <Text style={modernStyles.totalAmount}>{formatCurrency(invoiceData.subtotal)}</Text>
          </View>
        </View>
        <View style={modernStyles.grandTotalRow}>
          <Text style={modernStyles.grandTotalLabel}>Total Amount:</Text>
          <Text style={modernStyles.grandTotalValue}>{formatCurrency(invoiceData.totalAmount)}</Text>
        </View>

        {invoiceData.notes && (
          <View style={modernStyles.notes}>
            <Text style={modernStyles.sectionTitle}>Notes</Text>
            <Text>{invoiceData.notes}</Text>
          </View>
        )}

        <View style={modernStyles.footer}>
          <Text>Payment Instructions:</Text>
          {invoiceData.billingAddress && (
            <Text>Please send payment to: {invoiceData.billingAddress}</Text>
          )}
          {hasBankingDetails(invoiceData.bankingDetails) && invoiceData.bankingDetails && (
            <View style={{ marginTop: 4, marginBottom: 4 }}>
              <Text>{formatBankingDetails(invoiceData.bankingDetails, invoiceData.invoiceNumber)}</Text>
            </View>
          )}
          <Text>Due Date: {formatDate(invoiceData.dueDate)}</Text>
          <Text>Thank you for your business!</Text>
        </View>
      </Page>
    </Document>
  )
}

// ============================================
// MINIMAL TEMPLATE (Clean, simple)
// ============================================
const minimalStyles = StyleSheet.create({
  page: {
    padding: 50,
    fontSize: 10,
    fontFamily: "Helvetica"
  },
  header: {
    marginBottom: 40,
    borderBottom: "2px solid #000",
    paddingBottom: 15
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 5,
    letterSpacing: 2
  },
  invoiceNumber: {
    fontSize: 10,
    color: "#666",
    marginTop: 5
  },
  infoGrid: {
    flexDirection: "row",
    marginBottom: 30,
    gap: 30
  },
  infoColumn: {
    flex: 1
  },
  label: {
    fontSize: 8,
    color: "#666",
    marginBottom: 3,
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  value: {
    fontSize: 10,
    marginBottom: 12,
    color: "#000"
  },
  lineItemsTable: {
    marginTop: 20,
    marginBottom: 30
  },
  tableHeader: {
    flexDirection: "row",
    paddingBottom: 8,
    borderBottom: "1px solid #000",
    marginBottom: 8
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottom: "1px solid #eee"
  },
  colDescription: {
    width: "50%"
  },
  colQuantity: {
    width: "15%",
    textAlign: "right"
  },
  colUnitPrice: {
    width: "17.5%",
    textAlign: "right"
  },
  colAmount: {
    width: "17.5%",
    textAlign: "right"
  },
  totalsSection: {
    marginTop: 20,
    alignItems: "flex-end"
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "30%",
    marginBottom: 5
  },
  totalLabel: {
    fontSize: 10
  },
  totalAmount: {
    fontSize: 10
  },
  grandTotal: {
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 10,
    paddingTop: 10,
    borderTop: "1px solid #000"
  },
  notes: {
    marginTop: 40,
    fontSize: 9,
    color: "#666",
    lineHeight: 1.5
  },
  footer: {
    marginTop: 50,
    paddingTop: 20,
    borderTop: "1px solid #ccc",
    fontSize: 8,
    color: "#999",
    textAlign: "center"
  }
})

export const MinimalInvoicePDF: React.FC<InvoicePDFProps> = ({
  invoiceData,
  propertyName,
  tenantName,
  tenantEmail,
  tenantPhone
}) => {
  return (
    <Document>
      <Page size="A4" style={minimalStyles.page}>
        <View style={minimalStyles.header}>
          <Text style={minimalStyles.title}>INVOICE</Text>
          <Text style={minimalStyles.invoiceNumber}>#{invoiceData.invoiceNumber}</Text>
        </View>

        <View style={minimalStyles.infoGrid}>
          <View style={minimalStyles.infoColumn}>
            <Text style={minimalStyles.label}>Property</Text>
            <Text style={minimalStyles.value}>{propertyName}</Text>
            <Text style={minimalStyles.value}>{invoiceData.propertyAddress.fullAddress}</Text>
            
            <Text style={minimalStyles.label}>Bill To</Text>
            <Text style={minimalStyles.value}>{tenantName}</Text>
            {tenantEmail && <Text style={minimalStyles.value}>{tenantEmail}</Text>}
            {tenantPhone && <Text style={minimalStyles.value}>{tenantPhone}</Text>}
          </View>

          <View style={minimalStyles.infoColumn}>
            {invoiceData.billingAddress && (
              <>
                <Text style={minimalStyles.label}>Billing Address</Text>
                <Text style={minimalStyles.value}>{invoiceData.billingAddress}</Text>
              </>
            )}

            <Text style={minimalStyles.label}>Period</Text>
            <Text style={minimalStyles.value}>
              {formatDate(invoiceData.periodStart)} - {formatDate(invoiceData.periodEnd)}
            </Text>

            <Text style={minimalStyles.label}>Due Date</Text>
            <Text style={minimalStyles.value}>{formatDate(invoiceData.dueDate)}</Text>
          </View>
        </View>

        <View style={minimalStyles.lineItemsTable}>
          <View style={minimalStyles.tableHeader}>
            <Text style={minimalStyles.colDescription}>Description</Text>
            <Text style={minimalStyles.colQuantity}>Qty</Text>
            <Text style={minimalStyles.colUnitPrice}>Price</Text>
            <Text style={minimalStyles.colAmount}>Amount</Text>
          </View>
          {invoiceData.lineItems.map((item) => (
            <View key={item.id} style={minimalStyles.tableRow}>
              <Text style={minimalStyles.colDescription}>{item.description}</Text>
              <Text style={minimalStyles.colQuantity}>{item.quantity ?? "-"}</Text>
              <Text style={minimalStyles.colUnitPrice}>
                {item.unitPrice ? formatCurrency(item.unitPrice) : "-"}
              </Text>
              <Text style={minimalStyles.colAmount}>{formatCurrency(item.amount)}</Text>
            </View>
          ))}
        </View>

        <View style={minimalStyles.totalsSection}>
          <View style={minimalStyles.totalRow}>
            <Text style={minimalStyles.totalLabel}>Subtotal</Text>
            <Text style={minimalStyles.totalAmount}>{formatCurrency(invoiceData.subtotal)}</Text>
          </View>
          <View style={minimalStyles.totalRow}>
            <Text style={minimalStyles.grandTotal}>Total</Text>
            <Text style={minimalStyles.grandTotal}>{formatCurrency(invoiceData.totalAmount)}</Text>
          </View>
        </View>

        {invoiceData.notes && (
          <View style={minimalStyles.notes}>
            <Text>{invoiceData.notes}</Text>
          </View>
        )}

        <View style={minimalStyles.footer}>
          <Text>Payment due by {formatDate(invoiceData.dueDate)}</Text>
          {invoiceData.billingAddress && (
            <Text>Send payment to: {invoiceData.billingAddress}</Text>
          )}
          {hasBankingDetails(invoiceData.bankingDetails) && invoiceData.bankingDetails && (
            <Text>{formatBankingDetails(invoiceData.bankingDetails, invoiceData.invoiceNumber)}</Text>
          )}
        </View>
      </Page>
    </Document>
  )
}

// ============================================
// PROFESSIONAL TEMPLATE (Corporate, formal)
// ============================================
const professionalStyles = StyleSheet.create({
  page: {
    padding: 35,
    fontSize: 9,
    fontFamily: "Helvetica"
  },
  header: {
    marginBottom: 25,
    borderBottom: "3px solid #1e293b",
    paddingBottom: 15
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start"
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1e293b",
    letterSpacing: 1
  },
  invoiceNumber: {
    fontSize: 9,
    color: "#64748b",
    marginTop: 5
  },
  invoiceDetails: {
    alignItems: "flex-end"
  },
  twoColumn: {
    flexDirection: "row",
    marginTop: 20,
    marginBottom: 20,
    gap: 30
  },
  column: {
    flex: 1
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  addressLine: {
    fontSize: 9,
    color: "#475569",
    marginBottom: 3,
    lineHeight: 1.4
  },
  lineItemsTable: {
    marginTop: 15,
    marginBottom: 15
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#1e293b",
    padding: 8,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3
  },
  tableHeaderText: {
    color: "#ffffff",
    fontSize: 8,
    fontWeight: "bold"
  },
  tableRow: {
    flexDirection: "row",
    padding: 8,
    borderBottom: "1px solid #e2e8f0",
    backgroundColor: "#ffffff"
  },
  colDescription: {
    width: "50%",
    fontSize: 9
  },
  colQuantity: {
    width: "12%",
    textAlign: "right",
    fontSize: 9
  },
  colUnitPrice: {
    width: "19%",
    textAlign: "right",
    fontSize: 9
  },
  colAmount: {
    width: "19%",
    textAlign: "right",
    fontSize: 9,
    fontWeight: "bold",
    color: "#1e293b"
  },
  totalsSection: {
    marginTop: 15,
    alignItems: "flex-end"
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "30%",
    marginBottom: 5,
    paddingBottom: 3
  },
  totalLabel: {
    fontSize: 9,
    color: "#64748b"
  },
  totalAmount: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#1e293b"
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "30%",
    marginTop: 8,
    paddingTop: 8,
    borderTop: "2px solid #1e293b"
  },
  grandTotalLabel: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#1e293b"
  },
  grandTotalValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1e293b"
  },
  notes: {
    marginTop: 20,
    padding: 10,
    backgroundColor: "#f8fafc",
    borderLeft: "4px solid #64748b",
    fontSize: 8,
    color: "#475569"
  },
  footer: {
    marginTop: 25,
    paddingTop: 12,
    paddingBottom: 12,
    borderTop: "1px solid #e2e8f0",
    fontSize: 7,
    color: "#94a3b8",
    textAlign: "center",
    flexWrap: "wrap"
  }
})

export const ProfessionalInvoicePDF: React.FC<InvoicePDFProps> = ({
  invoiceData,
  propertyName,
  tenantName,
  tenantEmail,
  tenantPhone
}) => {
  return (
    <Document>
      <Page size="A4" style={professionalStyles.page}>
        <View style={professionalStyles.header}>
          <View style={professionalStyles.headerRow}>
            <View>
              <Text style={professionalStyles.title}>INVOICE</Text>
              <Text style={professionalStyles.invoiceNumber}>Invoice #{invoiceData.invoiceNumber}</Text>
            </View>
            <View style={professionalStyles.invoiceDetails}>
              <Text style={professionalStyles.addressLine}>Period: {formatDate(invoiceData.periodStart)} - {formatDate(invoiceData.periodEnd)}</Text>
              <Text style={professionalStyles.addressLine}>Due Date: {formatDate(invoiceData.dueDate)}</Text>
            </View>
          </View>
        </View>

        <View style={professionalStyles.twoColumn}>
          <View style={professionalStyles.column}>
            <Text style={professionalStyles.sectionTitle}>Bill To</Text>
            <Text style={professionalStyles.addressLine}>{tenantName}</Text>
            {tenantEmail && <Text style={professionalStyles.addressLine}>{tenantEmail}</Text>}
            {tenantPhone && <Text style={professionalStyles.addressLine}>{tenantPhone}</Text>}
            
            <Text style={[professionalStyles.sectionTitle, { marginTop: 15 }]}>Property</Text>
            <Text style={professionalStyles.addressLine}>{propertyName}</Text>
            <Text style={professionalStyles.addressLine}>{invoiceData.propertyAddress.fullAddress}</Text>
          </View>

          <View style={professionalStyles.column}>
            {invoiceData.billingAddress && (
              <>
                <Text style={professionalStyles.sectionTitle}>Billing Address</Text>
                <Text style={professionalStyles.addressLine}>{invoiceData.billingAddress}</Text>
              </>
            )}
          </View>
        </View>

        <View style={professionalStyles.lineItemsTable}>
          <View style={professionalStyles.tableHeader}>
            <Text style={[professionalStyles.colDescription, professionalStyles.tableHeaderText]}>Description</Text>
            <Text style={[professionalStyles.colQuantity, professionalStyles.tableHeaderText]}>Qty</Text>
            <Text style={[professionalStyles.colUnitPrice, professionalStyles.tableHeaderText]}>Unit Price</Text>
            <Text style={[professionalStyles.colAmount, professionalStyles.tableHeaderText]}>Amount</Text>
          </View>
          {invoiceData.lineItems.map((item) => (
            <View key={item.id} style={professionalStyles.tableRow}>
              <Text style={professionalStyles.colDescription}>{item.description}</Text>
              <Text style={professionalStyles.colQuantity}>{item.quantity ?? "-"}</Text>
              <Text style={professionalStyles.colUnitPrice}>
                {item.unitPrice ? formatCurrency(item.unitPrice) : "-"}
              </Text>
              <Text style={professionalStyles.colAmount}>{formatCurrency(item.amount)}</Text>
            </View>
          ))}
        </View>

        <View style={professionalStyles.totalsSection}>
          <View style={professionalStyles.totalRow}>
            <Text style={professionalStyles.totalLabel}>Subtotal:</Text>
            <Text style={professionalStyles.totalAmount}>{formatCurrency(invoiceData.subtotal)}</Text>
          </View>
          <View style={professionalStyles.grandTotalRow}>
            <Text style={professionalStyles.grandTotalLabel}>Total Amount:</Text>
            <Text style={professionalStyles.grandTotalValue}>{formatCurrency(invoiceData.totalAmount)}</Text>
          </View>
        </View>

        {invoiceData.notes && (
          <View style={professionalStyles.notes}>
            <Text>{invoiceData.notes}</Text>
          </View>
        )}

        <View style={professionalStyles.footer}>
          <Text>Payment Instructions:</Text>
          {invoiceData.billingAddress && (
            <Text>Please send payment to: {invoiceData.billingAddress}</Text>
          )}
          {hasBankingDetails(invoiceData.bankingDetails) && invoiceData.bankingDetails && (
            <View style={{ marginTop: 4, marginBottom: 4 }}>
              <Text>{formatBankingDetails(invoiceData.bankingDetails, invoiceData.invoiceNumber)}</Text>
            </View>
          )}
          <Text>Due Date: {formatDate(invoiceData.dueDate)}</Text>
          <Text>Thank you for your business!</Text>
        </View>
      </Page>
    </Document>
  )
}

// ============================================
// ELEGANT TEMPLATE (Sophisticated, refined)
// ============================================
const elegantStyles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 9,
    fontFamily: "Helvetica"
  },
  header: {
    marginBottom: 30,
    paddingBottom: 20,
    borderBottom: "1px solid #d1d5db"
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
    letterSpacing: 0.5
  },
  invoiceNumber: {
    fontSize: 10,
    color: "#6b7280",
    fontStyle: "italic"
  },
  infoSection: {
    marginBottom: 25
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 12
  },
  infoLabel: {
    width: 120,
    fontSize: 9,
    color: "#6b7280",
    fontWeight: "500"
  },
  infoValue: {
    flex: 1,
    fontSize: 9,
    color: "#111827"
  },
  lineItemsTable: {
    marginTop: 20,
    marginBottom: 20
  },
  tableHeader: {
    flexDirection: "row",
    paddingBottom: 10,
    borderBottom: "2px solid #d1d5db",
    marginBottom: 8
  },
  tableHeaderText: {
    fontSize: 9,
    fontWeight: "600",
    color: "#374151",
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    borderBottom: "1px solid #f3f4f6"
  },
  colDescription: {
    width: "55%",
    fontSize: 9
  },
  colQuantity: {
    width: "12%",
    textAlign: "right",
    fontSize: 9
  },
  colUnitPrice: {
    width: "16%",
    textAlign: "right",
    fontSize: 9
  },
  colAmount: {
    width: "17%",
    textAlign: "right",
    fontSize: 9,
    fontWeight: "600",
    color: "#111827"
  },
  totalsSection: {
    marginTop: 20,
    alignItems: "flex-end",
    paddingTop: 15,
    borderTop: "1px solid #e5e7eb"
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "28%",
    marginBottom: 6
  },
  totalLabel: {
    fontSize: 9,
    color: "#6b7280"
  },
  totalAmount: {
    fontSize: 9,
    fontWeight: "600",
    color: "#111827"
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "28%",
    marginTop: 10,
    paddingTop: 12,
    borderTop: "2px solid #111827"
  },
  grandTotalLabel: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#111827"
  },
  grandTotalValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#111827"
  },
  notes: {
    marginTop: 25,
    padding: 12,
    backgroundColor: "#f9fafb",
    borderLeft: "3px solid #9ca3af",
    fontSize: 8,
    color: "#4b5563",
    fontStyle: "italic"
  },
  footer: {
    marginTop: 30,
    paddingTop: 15,
    paddingBottom: 15,
    borderTop: "1px solid #e5e7eb",
    fontSize: 7,
    color: "#9ca3af",
    textAlign: "center",
    fontStyle: "italic",
    flexWrap: "wrap"
  }
})

export const ElegantInvoicePDF: React.FC<InvoicePDFProps> = ({
  invoiceData,
  propertyName,
  tenantName,
  tenantEmail,
  tenantPhone
}) => {
  return (
    <Document>
      <Page size="A4" style={elegantStyles.page}>
        <View style={elegantStyles.header}>
          <Text style={elegantStyles.title}>INVOICE</Text>
          <Text style={elegantStyles.invoiceNumber}>#{invoiceData.invoiceNumber}</Text>
        </View>

        <View style={elegantStyles.infoSection}>
          <View style={elegantStyles.infoRow}>
            <Text style={elegantStyles.infoLabel}>Property:</Text>
            <Text style={elegantStyles.infoValue}>{propertyName} - {invoiceData.propertyAddress.fullAddress}</Text>
          </View>
          <View style={elegantStyles.infoRow}>
            <Text style={elegantStyles.infoLabel}>Bill To:</Text>
            <Text style={elegantStyles.infoValue}>{tenantName}{tenantEmail ? ` • ${tenantEmail}` : ""}{tenantPhone ? ` • ${tenantPhone}` : ""}</Text>
          </View>
          {invoiceData.billingAddress && (
            <View style={elegantStyles.infoRow}>
              <Text style={elegantStyles.infoLabel}>Billing Address:</Text>
              <Text style={elegantStyles.infoValue}>{invoiceData.billingAddress}</Text>
            </View>
          )}
          <View style={elegantStyles.infoRow}>
            <Text style={elegantStyles.infoLabel}>Period:</Text>
            <Text style={elegantStyles.infoValue}>{formatDate(invoiceData.periodStart)} - {formatDate(invoiceData.periodEnd)}</Text>
          </View>
          <View style={elegantStyles.infoRow}>
            <Text style={elegantStyles.infoLabel}>Due Date:</Text>
            <Text style={elegantStyles.infoValue}>{formatDate(invoiceData.dueDate)}</Text>
          </View>
        </View>

        <View style={elegantStyles.lineItemsTable}>
          <View style={elegantStyles.tableHeader}>
            <Text style={[elegantStyles.colDescription, elegantStyles.tableHeaderText]}>Description</Text>
            <Text style={[elegantStyles.colQuantity, elegantStyles.tableHeaderText]}>Qty</Text>
            <Text style={[elegantStyles.colUnitPrice, elegantStyles.tableHeaderText]}>Unit Price</Text>
            <Text style={[elegantStyles.colAmount, elegantStyles.tableHeaderText]}>Amount</Text>
          </View>
          {invoiceData.lineItems.map((item) => (
            <View key={item.id} style={elegantStyles.tableRow}>
              <Text style={elegantStyles.colDescription}>{item.description}</Text>
              <Text style={elegantStyles.colQuantity}>{item.quantity ?? "-"}</Text>
              <Text style={elegantStyles.colUnitPrice}>
                {item.unitPrice ? formatCurrency(item.unitPrice) : "-"}
              </Text>
              <Text style={elegantStyles.colAmount}>{formatCurrency(item.amount)}</Text>
            </View>
          ))}
        </View>

        <View style={elegantStyles.totalsSection}>
          <View style={elegantStyles.totalRow}>
            <Text style={elegantStyles.totalLabel}>Subtotal:</Text>
            <Text style={elegantStyles.totalAmount}>{formatCurrency(invoiceData.subtotal)}</Text>
          </View>
          <View style={elegantStyles.grandTotalRow}>
            <Text style={elegantStyles.grandTotalLabel}>Total Amount:</Text>
            <Text style={elegantStyles.grandTotalValue}>{formatCurrency(invoiceData.totalAmount)}</Text>
          </View>
        </View>

        {invoiceData.notes && (
          <View style={elegantStyles.notes}>
            <Text>{invoiceData.notes}</Text>
          </View>
        )}

        <View style={elegantStyles.footer}>
          <Text>Payment due by {formatDate(invoiceData.dueDate)}</Text>
          {invoiceData.billingAddress && (
            <Text>Send payment to: {invoiceData.billingAddress}</Text>
          )}
          {hasBankingDetails(invoiceData.bankingDetails) && invoiceData.bankingDetails && (
            <View style={{ marginTop: 4, marginBottom: 4 }}>
              <Text>{formatBankingDetails(invoiceData.bankingDetails, invoiceData.invoiceNumber)}</Text>
            </View>
          )}
          <Text>Thank you for your business</Text>
        </View>
      </Page>
    </Document>
  )
}

// ============================================
// COMPACT TEMPLATE (Space-efficient, dense)
// ============================================
const compactStyles = StyleSheet.create({
  page: {
    padding: 25,
    fontSize: 8,
    fontFamily: "Helvetica"
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingBottom: 12,
    borderBottom: "2px solid #000"
  },
  headerLeft: {
    flex: 1
  },
  headerRight: {
    alignItems: "flex-end"
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 3
  },
  invoiceNumber: {
    fontSize: 8,
    color: "#666"
  },
  infoGrid: {
    flexDirection: "row",
    marginBottom: 15,
    gap: 20
  },
  infoColumn: {
    flex: 1
  },
  label: {
    fontSize: 7,
    color: "#666",
    marginBottom: 2,
    textTransform: "uppercase"
  },
  value: {
    fontSize: 8,
    marginBottom: 8,
    color: "#000"
  },
  lineItemsTable: {
    marginTop: 12,
    marginBottom: 12
  },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 5,
    borderBottom: "1px solid #000",
    marginBottom: 5
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottom: "1px solid #eee"
  },
  colDescription: {
    width: "50%",
    fontSize: 8
  },
  colQuantity: {
    width: "12%",
    textAlign: "right",
    fontSize: 8
  },
  colUnitPrice: {
    width: "19%",
    textAlign: "right",
    fontSize: 8
  },
  colAmount: {
    width: "19%",
    textAlign: "right",
    fontSize: 8,
    fontWeight: "bold"
  },
  totalsSection: {
    marginTop: 12,
    alignItems: "flex-end"
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "25%",
    marginBottom: 3
  },
  totalLabel: {
    fontSize: 8
  },
  totalAmount: {
    fontSize: 8,
    fontWeight: "bold"
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "25%",
    marginTop: 6,
    paddingTop: 6,
    borderTop: "1px solid #000"
  },
  grandTotalLabel: {
    fontSize: 9,
    fontWeight: "bold"
  },
  grandTotalValue: {
    fontSize: 10,
    fontWeight: "bold"
  },
  notes: {
    marginTop: 15,
    padding: 8,
    backgroundColor: "#f5f5f5",
    fontSize: 7,
    borderLeft: "2px solid #999"
  },
  footer: {
    marginTop: 20,
    paddingTop: 8,
    paddingBottom: 8,
    borderTop: "1px solid #ccc",
    fontSize: 7,
    color: "#666",
    textAlign: "center",
    flexWrap: "wrap"
  }
})

export const CompactInvoicePDF: React.FC<InvoicePDFProps> = ({
  invoiceData,
  propertyName,
  tenantName,
  tenantEmail,
  tenantPhone
}) => {
  return (
    <Document>
      <Page size="A4" style={compactStyles.page}>
        <View style={compactStyles.header}>
          <View style={compactStyles.headerLeft}>
            <Text style={compactStyles.title}>INVOICE</Text>
            <Text style={compactStyles.invoiceNumber}>#{invoiceData.invoiceNumber}</Text>
          </View>
          <View style={compactStyles.headerRight}>
            <Text style={compactStyles.value}>{formatDate(invoiceData.periodStart)} - {formatDate(invoiceData.periodEnd)}</Text>
            <Text style={compactStyles.value}>Due: {formatDate(invoiceData.dueDate)}</Text>
          </View>
        </View>

        <View style={compactStyles.infoGrid}>
          <View style={compactStyles.infoColumn}>
            <Text style={compactStyles.label}>Property</Text>
            <Text style={compactStyles.value}>{propertyName}</Text>
            <Text style={compactStyles.value}>{invoiceData.propertyAddress.fullAddress}</Text>
            
            <Text style={compactStyles.label}>Bill To</Text>
            <Text style={compactStyles.value}>{tenantName}</Text>
            {tenantEmail && <Text style={compactStyles.value}>{tenantEmail}</Text>}
            {tenantPhone && <Text style={compactStyles.value}>{tenantPhone}</Text>}
          </View>

          <View style={compactStyles.infoColumn}>
            {invoiceData.billingAddress && (
              <>
                <Text style={compactStyles.label}>Billing Address</Text>
                <Text style={compactStyles.value}>{invoiceData.billingAddress}</Text>
              </>
            )}
          </View>
        </View>

        <View style={compactStyles.lineItemsTable}>
          <View style={compactStyles.tableHeader}>
            <Text style={compactStyles.colDescription}>Description</Text>
            <Text style={compactStyles.colQuantity}>Qty</Text>
            <Text style={compactStyles.colUnitPrice}>Price</Text>
            <Text style={compactStyles.colAmount}>Amount</Text>
          </View>
          {invoiceData.lineItems.map((item) => (
            <View key={item.id} style={compactStyles.tableRow}>
              <Text style={compactStyles.colDescription}>{item.description}</Text>
              <Text style={compactStyles.colQuantity}>{item.quantity ?? "-"}</Text>
              <Text style={compactStyles.colUnitPrice}>
                {item.unitPrice ? formatCurrency(item.unitPrice) : "-"}
              </Text>
              <Text style={compactStyles.colAmount}>{formatCurrency(item.amount)}</Text>
            </View>
          ))}
        </View>

        <View style={compactStyles.totalsSection}>
          <View style={compactStyles.totalRow}>
            <Text style={compactStyles.totalLabel}>Subtotal:</Text>
            <Text style={compactStyles.totalAmount}>{formatCurrency(invoiceData.subtotal)}</Text>
          </View>
          <View style={compactStyles.grandTotalRow}>
            <Text style={compactStyles.grandTotalLabel}>Total:</Text>
            <Text style={compactStyles.grandTotalValue}>{formatCurrency(invoiceData.totalAmount)}</Text>
          </View>
        </View>

        {invoiceData.notes && (
          <View style={compactStyles.notes}>
            <Text>{invoiceData.notes}</Text>
          </View>
        )}

        <View style={compactStyles.footer}>
          <Text>Payment due by {formatDate(invoiceData.dueDate)}</Text>
          {invoiceData.billingAddress && (
            <Text>Send payment to: {invoiceData.billingAddress}</Text>
          )}
          {hasBankingDetails(invoiceData.bankingDetails) && invoiceData.bankingDetails && (
            <View style={{ marginTop: 4, marginBottom: 4 }}>
              <Text>{formatBankingDetails(invoiceData.bankingDetails, invoiceData.invoiceNumber)}</Text>
            </View>
          )}
        </View>
      </Page>
    </Document>
  )
}

