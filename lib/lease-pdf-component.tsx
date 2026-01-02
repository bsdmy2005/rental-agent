import React from "react"
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer"
import { contentToString, type TemplateSection } from "@/lib/utils/template-helpers"
import { renderHtmlToPdf } from "@/lib/utils/html-to-pdf"

export interface LeaseData {
  propertyAddress: string
  propertyType?: string
  landlordName: string
  landlordIdNumber?: string
  landlordAddress?: string
  landlordEmail?: string
  landlordPhone?: string
  landlordBankDetails?: {
    bankName?: string
    accountHolderName?: string
    accountNumber?: string
    branchCode?: string
  }
  tenantName: string
  tenantIdNumber: string
  tenantEmail?: string
  tenantPhone?: string
  tenantAddress?: string
  leaseStartDate: Date
  leaseEndDate: Date
  leaseDate: Date // Date when lease agreement is created/signed
  monthlyRental: number
  depositAmount?: number
  paymentMethod?: string
  escalationType?: "percentage" | "fixed_amount" | "cpi" | "none"
  escalationPercentage?: number
  escalationFixedAmount?: number
  specialConditions?: string
  templateFieldValues?: Record<string, string> // Custom template field values
  signedAtLocation?: string // Location where the lease is signed (e.g., "Johannesburg, South Africa")
  isDraft?: boolean
  tenantSignatureData?: any
  landlordSignatureData?: any
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica"
  },
  draftWatermark: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "rotate(-45deg) translate(-50%, -50%)",
    fontSize: 72,
    color: "#cccccc",
    opacity: 0.3,
    fontWeight: "bold"
  },
  executedStamp: {
    position: "absolute",
    top: 20,
    right: 20,
    backgroundColor: "#4caf50",
    color: "white",
    padding: 10,
    borderRadius: 5,
    fontSize: 12,
    fontWeight: "bold"
  },
  header: {
    marginBottom: 30,
    textAlign: "center"
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20
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
  subsectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginTop: 8,
    marginBottom: 4
  },
  row: {
    flexDirection: "row",
    marginBottom: 5
  },
  label: {
    width: "40%",
    fontWeight: "bold"
  },
  value: {
    width: "60%"
  },
  contentParagraph: {
    marginBottom: 8,
    lineHeight: 1.5,
    textAlign: "justify"
  },
  listContainer: {
    marginBottom: 8,
    marginLeft: 0,
    paddingLeft: 0
  },
  listItem: {
    flexDirection: "row",
    marginBottom: 4,
    paddingLeft: 0, // Will be set dynamically based on level
    marginLeft: 0,
    minHeight: 12,
    alignItems: "flex-start"
  },
  listBullet: {
    width: 15,
    paddingRight: 8,
    fontSize: 10,
    flexShrink: 0
  },
  listContent: {
    flex: 1,
    lineHeight: 1.5,
    textAlign: "justify",
    paddingRight: 0
  },
  nestedList: {
    marginTop: 0,
    marginLeft: 0,
    paddingLeft: 0
  },
  signatureSection: {
    marginTop: 40,
    paddingTop: 20,
    borderTop: "1px solid #ccc"
  },
  signatureBlock: {
    marginTop: 30,
    width: "45%"
  },
  signatureLine: {
    borderTop: "1px solid #000",
    marginTop: 5,
    paddingTop: 2
  },
  signatureLabel: {
    fontSize: 9,
    marginTop: 5
  },
  footer: {
    fontSize: 9,
    fontStyle: "italic",
    marginTop: 8,
    color: "#666"
  }
})

// Format date for lease agreement (e.g., "the 15th day of January 2024")
function formatLeaseDate(date: Date): string {
  const day = date.getDate()
  const month = date.toLocaleDateString("en-ZA", { month: "long" })
  const year = date.getFullYear()
  
  // Add ordinal suffix to day
  const getOrdinalSuffix = (n: number) => {
    const s = ["th", "st", "nd", "rd"]
    const v = n % 100
    return s[(v - 20) % 10] || s[v] || s[0]
  }
  
  return `the ${day}${getOrdinalSuffix(day)} day of ${month} ${year}`
}

// Variable replacement function
function replaceVariables(text: string, data: LeaseData): string {
  const leaseDate = data.leaseDate || new Date()
  const variables: Record<string, string> = {
    tenant_name: data.tenantName,
    tenant_id: data.tenantIdNumber,
    tenant_email: data.tenantEmail || "",
    tenant_phone: data.tenantPhone || "",
    tenant_address: data.tenantAddress || "",
    landlord_name: data.landlordName,
    landlord_id: data.landlordIdNumber || "",
    landlord_address: data.landlordAddress || "",
    landlord_email: data.landlordEmail || "",
    landlord_phone: data.landlordPhone || "",
    property_address: data.propertyAddress,
    monthly_rental: `R ${data.monthlyRental.toFixed(2)}`,
    deposit_amount: data.depositAmount ? `R ${data.depositAmount.toFixed(2)}` : "",
    commencement_date: formatDate(data.leaseStartDate),
    termination_date: formatDate(data.leaseEndDate),
    lease_date: formatDate(leaseDate),
    current_date: formatDate(leaseDate),
    lease_date_full: formatLeaseDate(leaseDate), // Full format: "the 15th day of January 2024"
    payment_bank: data.landlordBankDetails?.bankName || "",
    payment_account_holder: data.landlordBankDetails?.accountHolderName || "",
    payment_account_number: data.landlordBankDetails?.accountNumber || "",
    payment_branch_code: data.landlordBankDetails?.branchCode || ""
  }

  // Replace variables in format {{variable_name}}
  let result = text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] || match
  })

  // Also replace the specific pattern "the ___ day of __________ 20___"
  result = result.replace(/the\s+___\s+day\s+of\s+__________\s+20___/gi, formatLeaseDate(leaseDate))
  result = result.replace(/the\s+___\s+day\s+of\s+__________\s+\d{4}___/gi, formatLeaseDate(leaseDate))
  result = result.replace(/___\s+day\s+of\s+__________\s+20___/gi, formatLeaseDate(leaseDate).replace(/^the\s+/, ""))

  return result
}

function formatCurrency(amount: number) {
  return `R ${amount.toFixed(2)}`
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "long",
    day: "numeric"
  })
}

function renderContent(content: string | string[] | undefined, data: LeaseData): string {
  if (!content) return ""
  const contentStr = contentToString(content)
  // Strip HTML tags for PDF (simple approach)
  const plainText = contentStr.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
  return replaceVariables(plainText, data)
}

// Parse Markdown-style lists and convert to React-PDF components
function parseMarkdownLists(text: string, data: LeaseData): React.ReactNode[] {
  const lines = text.split("\n")
  const result: React.ReactNode[] = []
  let currentParagraph: string[] = []

  function flushParagraph() {
    if (currentParagraph.length > 0) {
      const paraText = currentParagraph.join(" ").trim()
      if (paraText) {
        result.push(
          <Text key={`para-${result.length}`} style={styles.contentParagraph} wrap>
            {replaceVariables(paraText, data)}
          </Text>
        )
      }
      currentParagraph = []
    }
  }

  // Parse lists with proper nesting structure
  interface ListItem {
    content: string
    level: number
    type: "bullet" | "ordered"
    number?: number
  }

  const listItems: ListItem[] = []
  let inList = false
  let listStartIndex = -1

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    
    // Improved regex patterns for list items
    // Bullet: optional whitespace, then -, *, or •, then space, then content
    const bulletMatch = line.match(/^(\s*)([-*•])\s+(.+)$/)
    // Ordered: optional whitespace, then digits, then period and space, then content
    const orderedMatch = line.match(/^(\s*)(\d+)\.\s+(.+)$/)
    
    if (bulletMatch || orderedMatch) {
      if (!inList) {
        // Start of a new list - flush any pending paragraph
        flushParagraph()
        inList = true
        listStartIndex = result.length
      }
      
      const match = bulletMatch || orderedMatch!
      const indent = match[1].length
      // Calculate level: 2 spaces = 1 level (standard Markdown)
      // Handle odd numbers of spaces by rounding down
      const level = Math.floor(indent / 2)
      const content = match[3].trim()
      const listType = bulletMatch ? "bullet" : "ordered"
      const number = orderedMatch ? parseInt(match[2], 10) : undefined
      
      // Only add non-empty items
      if (content) {
        listItems.push({
          content,
          level,
          type: listType,
          number
        })
      }
    } else {
      if (inList && trimmed === "") {
        // Empty line within list - continue list but add spacing
        // This allows for spacing between list items
        continue
      } else if (inList && trimmed !== "") {
        // End of list, start of paragraph
        // Render the accumulated list
        if (listItems.length > 0) {
          result.push(renderNestedList(listItems, data))
          listItems.length = 0
        }
        inList = false
        currentParagraph.push(trimmed)
      } else if (trimmed === "") {
        // Empty line outside list
        flushParagraph()
      } else {
        // Regular text line
        currentParagraph.push(trimmed)
      }
    }
  }
  
  // Flush any remaining list
  if (listItems.length > 0) {
    result.push(renderNestedList(listItems, data))
  }
  
  // Flush any remaining paragraph
  flushParagraph()
  
  return result
}

// Tree structure for nested lists
interface ListTreeNode {
  content: string
  type: "bullet" | "ordered"
  number?: number
  children: ListTreeNode[]
}

// Build a tree structure from flat list items
function buildListTree(items: Array<{ content: string; level: number; type: "bullet" | "ordered"; number?: number }>): ListTreeNode[] {
  const root: ListTreeNode[] = []
  const stack: ListTreeNode[] = []
  
  items.forEach((item, index) => {
    // Skip empty items
    if (!item.content || !item.content.trim()) {
      return
    }
    
    const node: ListTreeNode = {
      content: item.content.trim(),
      type: item.type,
      number: item.number,
      children: []
    }
    
    // Handle level jumps: if item.level is less than stack.length, we need to pop
    // This handles cases where we jump from level 2 back to level 0
    while (stack.length > item.level) {
      stack.pop()
    }
    
    // Validate: if stack is empty but level > 0, treat as level 0
    // This handles malformed input gracefully
    const actualLevel = Math.max(0, Math.min(item.level, stack.length))
    
    // Add to parent or root
    if (stack.length === 0) {
      // Root level item
      root.push(node)
    } else {
      // Child item - add to the most recent parent
      const parent = stack[stack.length - 1]
      if (parent) {
        parent.children.push(node)
      } else {
        // Fallback: add to root if parent is somehow missing
        root.push(node)
      }
    }
    
    // Push this node onto stack for potential children
    // The stack length should match the level after adding this node
    if (stack.length === actualLevel) {
      stack.push(node)
    } else {
      // This shouldn't happen, but handle it gracefully
      while (stack.length > actualLevel) {
        stack.pop()
      }
      stack.push(node)
    }
  })
  
  return root
}

// Render a list tree node recursively
function renderListNode(node: ListTreeNode, data: LeaseData, level: number = 0): React.ReactNode {
  const indentPadding = level * 24 // 24 points per level (standard for lists)
  
  return (
    <View key={`node-${Math.random()}`}>
      <View style={[styles.listItem, { paddingLeft: indentPadding }]}>
        <Text style={styles.listBullet}>
          {node.type === "bullet" ? "•" : node.number !== undefined ? `${node.number}.` : "•"}
        </Text>
        <Text style={styles.listContent} wrap>
          {replaceVariables(node.content, data)}
        </Text>
      </View>
      {node.children.length > 0 && (
        <View style={styles.nestedList}>
          {node.children.map((child, idx) => renderListNode(child, data, level + 1))}
        </View>
      )}
    </View>
  )
}

// Render nested list structure with proper indentation
function renderNestedList(items: Array<{ content: string; level: number; type: "bullet" | "ordered"; number?: number }>, data: LeaseData): React.ReactNode {
  // Build tree structure from flat list
  const tree = buildListTree(items)
  
  return (
    <View key={`nested-list-${Math.random()}`} style={styles.listContainer}>
      {tree.map((node, idx) => renderListNode(node, data, 0))}
    </View>
  )
}

// Legacy renderList function - kept for compatibility but renderNestedList is preferred
function renderList(
  lists: Array<{ type: "bullet" | "ordered"; items: string[]; level: number }>,
  data: LeaseData
): React.ReactNode {
  return (
    <View key={`list-${Math.random()}`} style={styles.listContainer}>
      {lists.map((list, listIdx) => {
        const indent = list.level * 20 // 20 points per level
        
        return (
          <View
            key={`list-${listIdx}`}
            style={list.level > 0 ? { marginLeft: indent } : undefined}
          >
            {list.items.map((item, itemIdx) => (
              <View key={`item-${itemIdx}`} style={styles.listItem}>
                <Text style={styles.listBullet}>
                  {list.type === "bullet" ? "•" : `${itemIdx + 1}.`}
                </Text>
                <Text style={styles.listContent} wrap>
                  {replaceVariables(item, data)}
                </Text>
              </View>
            ))}
          </View>
        )
      })}
    </View>
  )
}

// Predefined field label mapping for inline field display
const PREDEFINED_FIELD_LABELS: Record<string, string> = {
  // Landlord fields
  landlord_name: "Landlord Name",
  landlord_id: "Landlord ID",
  landlord_address: "Landlord Address",
  landlord_email: "Landlord Email",
  landlord_phone: "Landlord Phone",
  // Tenant fields
  tenant_name: "Tenant Name",
  tenant_id: "Tenant ID",
  tenant_address: "Tenant Address",
  tenant_email: "Tenant Email",
  tenant_phone: "Tenant Phone",
  // Property fields
  property_address: "Property Address",
  // Financial fields
  monthly_rental: "Monthly Rental",
  deposit_amount: "Deposit Amount",
  // Date fields
  commencement_date: "Commencement Date",
  termination_date: "Termination Date",
  lease_date: "Lease Date",
  current_date: "Current Date",
  // Payment fields
  payment_bank: "Payment Bank",
  payment_account_holder: "Account Holder",
  payment_account_number: "Account Number",
  payment_branch_code: "Branch Code"
}

// Render content directly from HTML to React-PDF components
// This approach is more reliable than converting to Markdown first
function renderContentWithMarkdown(
  content: string | string[] | undefined,
  data: LeaseData,
  fields?: Array<{ id: string; label: string; suffix?: string; inlineDisplayFormat?: "label-value" | "label-only" | "value-only" }>
): React.ReactNode[] {
  if (!content) return []
  
  const contentStr = contentToString(content)
  
  // Check if content is HTML (contains HTML tags)
  const isHtml = /<[a-z][\s\S]*>/i.test(contentStr)
  
  if (isHtml) {
    // Render HTML directly to PDF components
    try {
      return renderHtmlToPdf(contentStr, {
        data,
        replaceVariables: (text: string) => replaceVariables(text, data),
        renderField: (fieldId: string) => {
          // Get value from renderFieldValue (works for both predefined and user-created fields)
          const value = renderFieldValue(fieldId, data)
          
          // Try to find label and display format - first from user-created fields, then from predefined mapping
          let label: string | undefined
          let displayFormat: "label-value" | "label-only" | "value-only" = "label-value"
          if (fields) {
            const field = fields.find(f => f.id === fieldId)
            if (field) {
              label = field.label
              displayFormat = field.inlineDisplayFormat || "label-value"
            }
          }
          
          // If not found in user-created fields, try predefined mapping
          if (!label) {
            label = PREDEFINED_FIELD_LABELS[fieldId]
          }
          
          // Apply display format
          const hasValue = value && value.trim() !== ""
          const field = fields?.find(f => f.id === fieldId)
          const suffix = field?.suffix
          
          switch (displayFormat) {
            case "value-only":
              // Return just the value (with suffix if present)
              if (hasValue) {
                return suffix ? `${value} ${suffix}` : value
              }
              return ""
            
            case "label-only":
              // Return just the label
              return label || ""
            
            case "label-value":
            default:
              // Default behavior: "Label Value" format
              if (label) {
                if (hasValue) {
                  if (suffix) {
                    return `${label} ${value} ${suffix}`
                  }
                  return `${label} ${value}`
                }
                // If no value, return just the label
                return label
              }
              // Fallback: if no label found, return value or empty string
              return hasValue ? (suffix ? `${value} ${suffix}` : value) : ""
          }
        },
        styles: {
          listContainer: styles.listContainer,
          listItem: styles.listItem,
          listBullet: styles.listBullet,
          listContent: styles.listContent,
          paragraph: styles.contentParagraph
        }
      })
    } catch (error) {
      console.warn("HTML to PDF rendering failed:", error)
      // Fallback: simple text extraction
      const plainText = contentStr
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, " ")
        .trim()
      
      return [
        <Text key="fallback" style={styles.contentParagraph} wrap>
          {replaceVariables(plainText, data)}
        </Text>
      ]
    }
  } else {
    // Plain text or Markdown - convert Markdown lists to HTML first, then render
    // Convert Markdown list syntax to HTML
    let htmlContent = contentStr
    
    // Convert Markdown lists to HTML
    // Bullet lists: - item -> <ul><li>item</li></ul>
    htmlContent = htmlContent.replace(/^(\s*)([-*•])\s+(.+)$/gm, (match, indent, bullet, content) => {
      const level = Math.floor(indent.length / 2)
      const padding = "  ".repeat(level)
      return `${padding}<li>${content}</li>`
    })
    
    // Wrap consecutive <li> items in <ul>
    htmlContent = htmlContent.replace(/(<li>[\s\S]*?<\/li>(?:\s*<li>[\s\S]*?<\/li>)*)/g, (match) => {
      return `<ul>${match}</ul>`
    })
    
    // Ordered lists: 1. item -> <ol><li>item</li></ol>
    htmlContent = htmlContent.replace(/^(\s*)(\d+)\.\s+(.+)$/gm, (match, indent, num, content) => {
      const level = Math.floor(indent.length / 2)
      const padding = "  ".repeat(level)
      return `${padding}<li>${content}</li>`
    })
    
    // Wrap consecutive ordered <li> items in <ol>
    htmlContent = htmlContent.replace(/(<li>[\s\S]*?<\/li>(?:\s*<li>[\s\S]*?<\/li>)*)/g, (match) => {
      // Check if this should be ordered (has numbers before it)
      return `<ol>${match}</ol>`
    })
    
    // Now render as HTML
    try {
      return renderHtmlToPdf(htmlContent, {
        data,
        replaceVariables: (text: string) => replaceVariables(text, data),
        renderField: (fieldId: string) => {
          // Get value from renderFieldValue (works for both predefined and user-created fields)
          const value = renderFieldValue(fieldId, data)
          
          // Try to find label and display format - first from user-created fields, then from predefined mapping
          let label: string | undefined
          let displayFormat: "label-value" | "label-only" | "value-only" = "label-value"
          if (fields) {
            const field = fields.find(f => f.id === fieldId)
            if (field) {
              label = field.label
              displayFormat = field.inlineDisplayFormat || "label-value"
            }
          }
          
          // If not found in user-created fields, try predefined mapping
          if (!label) {
            label = PREDEFINED_FIELD_LABELS[fieldId]
          }
          
          // Apply display format
          const hasValue = value && value.trim() !== ""
          const field = fields?.find(f => f.id === fieldId)
          const suffix = field?.suffix
          
          switch (displayFormat) {
            case "value-only":
              // Return just the value (with suffix if present)
              if (hasValue) {
                return suffix ? `${value} ${suffix}` : value
              }
              return ""
            
            case "label-only":
              // Return just the label
              return label || ""
            
            case "label-value":
            default:
              // Default behavior: "Label Value" format
              if (label) {
                if (hasValue) {
                  if (suffix) {
                    return `${label} ${value} ${suffix}`
                  }
                  return `${label} ${value}`
                }
                // If no value, return just the label
                return label
              }
              // Fallback: if no label found, return value or empty string
              return hasValue ? (suffix ? `${value} ${suffix}` : value) : ""
          }
        },
        styles: {
          listContainer: styles.listContainer,
          listItem: styles.listItem,
          listBullet: styles.listBullet,
          listContent: styles.listContent,
          paragraph: styles.contentParagraph
        }
      })
    } catch (error) {
      // Fallback to simple paragraph rendering
      const paragraphs = contentStr.split(/\n\n+/).filter(p => p.trim())
      return paragraphs.map((para, idx) => {
        const text = para.trim()
        return (
          <Text key={`para-${idx}`} style={styles.contentParagraph} wrap minPresenceAhead={20}>
            {replaceVariables(text, data)}
          </Text>
        )
      })
    }
  }
}

function renderFieldValue(fieldId: string, data: LeaseData): string {
  // First, check if this is a custom template field with a value
  if (data.templateFieldValues && data.templateFieldValues[fieldId]) {
    return data.templateFieldValues[fieldId]
  }
  
  // Debug logging (can be removed in production)
  if (!data.landlordIdNumber && fieldId === "landlord_id") {
    console.log("Missing landlord ID:", { fieldId, landlordIdNumber: data.landlordIdNumber, landlordName: data.landlordName })
  }
  
  const fieldMap: Record<string, string> = {
    // Landlord fields
    landlord_name: data.landlordName || "",
    landlord_id: data.landlordIdNumber || "",
    landlord_address: data.landlordAddress || "",
    landlord_email: data.landlordEmail || "",
    landlord_phone: data.landlordPhone || "",
    // Tenant fields - ensure we don't show "[Not provided]" for optional fields
    tenant_name: data.tenantName || "",
    tenant_id: data.tenantIdNumber || "",
    tenant_address: data.tenantAddress || "", // Optional - can be empty
    tenant_email: data.tenantEmail || "", // Required - should not be empty
    tenant_phone: data.tenantPhone || "", // Required - should not be empty
    // Property fields
    property_address: data.propertyAddress || "",
    // Financial fields
    monthly_rental: data.monthlyRental ? formatCurrency(data.monthlyRental) : "",
    deposit_amount: data.depositAmount ? formatCurrency(data.depositAmount) : "",
    // Date fields
    commencement_date: data.leaseStartDate ? formatDate(data.leaseStartDate) : "",
    termination_date: data.leaseEndDate ? formatDate(data.leaseEndDate) : "",
    lease_date: data.leaseDate ? formatDate(data.leaseDate) : formatDate(new Date()),
    current_date: data.leaseDate ? formatDate(data.leaseDate) : formatDate(new Date()),
    // Payment fields
    payment_bank: data.landlordBankDetails?.bankName || "",
    payment_account_holder: data.landlordBankDetails?.accountHolderName || "",
    payment_account_number: data.landlordBankDetails?.accountNumber || "",
    payment_branch_code: data.landlordBankDetails?.branchCode || ""
  }
  
  const value = fieldMap[fieldId] || ""
  
  // If field is required but empty, show placeholder
  if (!value && (fieldId.startsWith("landlord_") || fieldId.startsWith("tenant_"))) {
    return "[Not provided]"
  }
  
  return value
}

export interface TemplateBasedPDFProps {
  data: LeaseData
  templateSections: TemplateSection[]
}

export const TemplateBasedPDF: React.FC<TemplateBasedPDFProps> = ({ data, templateSections }) => {
  // Group sections by pages based on pageBreakBefore flag
  const pages: TemplateSection[][] = []
  let currentPage: TemplateSection[] = []

  templateSections.forEach((section) => {
    // If this section should start on a new page and we have content, start a new page
    if (section.pageBreakBefore && currentPage.length > 0) {
      pages.push([...currentPage])
      currentPage = [section]
    } else {
      currentPage.push(section)
    }
  })

  // Add the last page if it has content
  if (currentPage.length > 0) {
    pages.push(currentPage)
  }

  // If no page breaks, put everything on one page
  if (pages.length === 0 && templateSections.length > 0) {
    pages.push([...templateSections])
  }

  return (
    <Document>
      {pages.map((pageSections, pageIndex) => (
        <Page key={`page-${pageIndex}`} size="A4" style={styles.page}>
          {pageIndex === 0 && data.isDraft && (
            <View style={styles.draftWatermark}>
              <Text>DRAFT</Text>
            </View>
          )}
          {pageIndex === 0 && !data.isDraft && data.tenantSignatureData && data.landlordSignatureData && (
            <View style={styles.executedStamp}>
              <Text>FULLY EXECUTED</Text>
            </View>
          )}

          {pageSections.map((section) => {
            if (section.type === "header") {
              return (
                <View key={section.id} style={styles.header}>
                  <Text style={styles.title}>{section.title}</Text>
                  {section.subtitle && <Text style={styles.subtitle}>{section.subtitle}</Text>}
                </View>
              )
            }

            if (section.type === "signatures") {
              // Helper function to render signature placeholder
              const renderSignaturePlaceholder = (signatureType: "tenant_signature" | "landlord_signature"): React.ReactNode => {
                if (signatureType === "tenant_signature") {
                  return (
                    <View key="tenant-sig" style={styles.signatureBlock}>
                      {data.tenantSignatureData?.image ? (
                        <View style={{ marginBottom: 3, paddingLeft: 0, marginLeft: 0, alignItems: "flex-start" }}>
                          <Image
                            src={data.tenantSignatureData.image}
                            style={{ width: 150, height: 60, objectFit: "contain" }}
                          />
                        </View>
                      ) : (
                        <View style={styles.signatureLine} />
                      )}
                      <Text style={styles.signatureLabel}>Tenant Signature</Text>
                      <Text style={styles.signatureLabel}>{data.tenantName}</Text>
                      <Text style={[styles.signatureLabel, { fontSize: 8, marginTop: 5 }]}>
                        Date: {data.tenantSignatureData?.signedAt ? formatDate(new Date(data.tenantSignatureData.signedAt)) : "___________"}
                      </Text>
                    </View>
                  )
                } else {
                  return (
                    <View key="landlord-sig" style={styles.signatureBlock}>
                      {data.landlordSignatureData?.image ? (
                        <View style={{ marginBottom: 3, paddingLeft: 0, marginLeft: 0, alignItems: "flex-start" }}>
                          <Image
                            src={data.landlordSignatureData.image}
                            style={{ width: 150, height: 60, objectFit: "contain" }}
                          />
                        </View>
                      ) : (
                        <View style={styles.signatureLine} />
                      )}
                      <Text style={styles.signatureLabel}>Landlord Signature</Text>
                      <Text style={styles.signatureLabel}>{data.landlordName}</Text>
                      <Text style={[styles.signatureLabel, { fontSize: 8, marginTop: 5 }]}>
                        Date: {data.landlordSignatureData?.signedAt ? formatDate(new Date(data.landlordSignatureData.signedAt)) : "___________"}
                      </Text>
                    </View>
                  )
                }
              }

              // Render content with signature placeholders if content exists and is HTML
              const contentNodes = section.content && typeof section.content === "string" && section.content.trim()
                ? renderHtmlToPdf(section.content, {
                    data,
                    replaceVariables: (text: string) => replaceVariables(text, data),
                    renderField: (fieldId: string) => {
                      // Handle field rendering (including signedAtLocation)
                      return renderFieldValue(fieldId, data)
                    },
                    renderSignature: renderSignaturePlaceholder,
                  })
                : []

              return (
                <View key={section.id} style={styles.signatureSection}>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  {contentNodes.length > 0 && (
                    <View style={{ marginBottom: 20 }}>
                      {contentNodes.map((node, idx) => (
                        <React.Fragment key={idx}>{node}</React.Fragment>
                      ))}
                    </View>
                  )}
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 30 }}>
                    <View style={styles.signatureBlock}>
                      {data.tenantSignatureData?.image ? (
                        <View style={{ marginBottom: 3, paddingLeft: 0, marginLeft: 0, alignItems: "flex-start" }}>
                          <Image
                            src={data.tenantSignatureData.image}
                            style={{ width: 150, height: 60, objectFit: "contain" }}
                          />
                        </View>
                      ) : (
                        <View style={styles.signatureLine} />
                      )}
                      <Text style={styles.signatureLabel}>Tenant Signature</Text>
                      <Text style={styles.signatureLabel}>{data.tenantName}</Text>
                      <Text style={[styles.signatureLabel, { fontSize: 8, marginTop: 5 }]}>
                        Date: {data.tenantSignatureData?.signedAt ? formatDate(new Date(data.tenantSignatureData.signedAt)) : "___________"}
                      </Text>
                    </View>

                    <View style={styles.signatureBlock}>
                      {data.landlordSignatureData?.image ? (
                        <View style={{ marginBottom: 3, paddingLeft: 0, marginLeft: 0, alignItems: "flex-start" }}>
                          <Image
                            src={data.landlordSignatureData.image}
                            style={{ width: 150, height: 60, objectFit: "contain" }}
                          />
                        </View>
                      ) : (
                        <View style={styles.signatureLine} />
                      )}
                      <Text style={styles.signatureLabel}>Landlord Signature</Text>
                      <Text style={styles.signatureLabel}>{data.landlordName}</Text>
                      <Text style={[styles.signatureLabel, { fontSize: 8, marginTop: 5 }]}>
                        Date: {data.landlordSignatureData?.signedAt ? formatDate(new Date(data.landlordSignatureData.signedAt)) : "___________"}
                      </Text>
                    </View>
                  </View>
                  {/* Render footer if exists (no special signedAtLocation replacement - treat as regular field) */}
                  {section.footer && (
                    <Text style={[styles.footer, { marginTop: 15, textAlign: "center" }]}>
                      {replaceVariables(section.footer, data)}
                    </Text>
                  )}
                </View>
              )
            }

            // Regular section
            return (
              <View key={section.id} style={styles.section}>
                <Text style={styles.sectionTitle}>{section.title}</Text>

                {/* Section content */}
                {section.content && (
                  <View style={{ marginBottom: 8 }}>
                    {renderContentWithMarkdown(section.content, data, section.fields)}
                  </View>
                )}

                {/* Section fields */}
                {section.fields && section.fields.length > 0 && (
                  <View style={{ marginBottom: 8 }}>
                    {section.fields
                      .filter((field) => !field.inline) // Exclude inline fields
                      .map((field) => (
                      <View key={field.id} style={styles.row}>
                        <Text style={styles.label} wrap>{field.label}</Text>
                        <Text style={styles.value} wrap>
                          {renderFieldValue(field.id, data)} {field.suffix || ""}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Subsections */}
                {section.subsections && section.subsections.length > 0 && (
                  <View style={{ marginLeft: 10 }}>
                    {section.subsections.map((subsection) => (
                      <View key={subsection.id} style={{ marginBottom: 8 }}>
                        <Text style={styles.subsectionTitle}>{subsection.title}</Text>
                        {subsection.fields && subsection.fields.length > 0 && subsection.fields
                          .filter((field) => !field.inline) // Exclude inline fields
                          .map((field) => (
                          <View key={field.id} style={styles.row}>
                            <Text style={styles.label} wrap>{field.label}</Text>
                            <Text style={styles.value} wrap>
                              {renderFieldValue(field.id, data)} {field.suffix || ""}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ))}
                  </View>
                )}

                {/* Footer */}
                {section.footer && (
                  <Text style={styles.footer}>{replaceVariables(section.footer, data)}</Text>
                )}
              </View>
            )
          })}
        </Page>
      ))}
    </Document>
  )
}

