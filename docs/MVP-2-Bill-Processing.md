# MVP 2: Bill Processing & Invoice Generation

## Goal
Automate the core rental agent functions - receive bills, extract data, generate and send invoices to tenants.

## Rental Agent Personas

### Persona 1: Generate Invoices and Send to Clients
- Automatically generate tenant invoices from processed bills
- Include rental amount + extracted line items (water, electricity, levies)
- Send invoices to tenants via email

### Persona 2: Receive Bills and Extract Line Items
- Process municipality bills, body corporate statements
- Extract specific line items (water, electricity, levies)
- Match extracted data to properties and tenants

## Overview
This MVP builds on MVP 1 to automatically:
- Process bills using configured extraction rules
- Extract line items (water, electricity, levies, municipality charges)
- Generate tenant invoices with all charges
- Send invoices to tenants via email
- Track invoice status and payment due dates

## Core Features

### 1. Automated Bill Processing
- Process bills using active extraction rules
- Extract structured data (amounts, dates, line items)
- Validate extracted data
- Handle processing errors gracefully

### 2. Line Item Extraction
- Extract water usage and charges
- Extract electricity usage and charges
- Extract levy amounts
- Extract municipality charges
- Extract other billable items
- Support custom line items per property

### 3. Invoice Generation
- Generate invoices from processed bills
- Include base rental amount
- Include extracted line items
- Calculate totals
- Apply any discounts or adjustments
- Generate invoice numbers
- Set due dates

### 4. Invoice Management
- View all invoices (list and detail)
- Edit invoices before sending
- Approve invoices
- Mark invoices as sent
- Track invoice status
- Filter by property, tenant, status, date range

### 5. Invoice Sending
- Send invoices to tenants via email (Postmark)
- Email templates for invoices
- PDF invoice attachment
- Email tracking (opened, clicked)
- Resend invoices

### 6. Invoice Preview
- Preview invoice before sending
- Edit line items
- Add notes or adjustments
- Validate invoice data

## Database Schema

### Invoices Table
```typescript
invoicesTable = pgTable("invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceNumber: text("invoice_number").unique().notNull(),
  propertyId: uuid("property_id").references(() => propertiesTable.id, { onDelete: "cascade" }).notNull(),
  tenantId: uuid("tenant_id").references(() => tenantsTable.id, { onDelete: "cascade" }).notNull(),
  billId: uuid("bill_id").references(() => billsTable.id), // Source bill
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  rentalAmount: numeric("rental_amount").notNull(),
  totalAmount: numeric("total_amount").notNull(),
  status: invoiceStatusEnum("status").default("draft").notNull(),
  dueDate: timestamp("due_date").notNull(),
  sentAt: timestamp("sent_at"),
  paidAt: timestamp("paid_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date())
})
```

### Invoice Line Items Table
```typescript
invoiceLineItemsTable = pgTable("invoice_line_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceId: uuid("invoice_id").references(() => invoicesTable.id, { onDelete: "cascade" }).notNull(),
  lineItemType: lineItemTypeEnum("line_item_type").notNull(), // water, electricity, levy, municipality, other
  description: text("description").notNull(),
  quantity: numeric("quantity"),
  unitPrice: numeric("unit_price"),
  amount: numeric("amount").notNull(),
  usage: numeric("usage"), // For utilities (kWh, liters)
  createdAt: timestamp("created_at").defaultNow().notNull()
})
```

### Enums
```typescript
invoiceStatusEnum = pgEnum("invoice_status", ["draft", "approved", "sent", "paid", "overdue", "cancelled"])
lineItemTypeEnum = pgEnum("line_item_type", ["rental", "water", "electricity", "levy", "municipality", "other"])
```

## Queries (Read Operations)

### Invoices Queries
**File**: `queries/invoices-queries.ts`

- `getInvoiceByIdQuery(invoiceId: string): Promise<SelectInvoice | null>`
- `getInvoiceWithLineItemsQuery(invoiceId: string): Promise<InvoiceWithLineItems | null>`
- `getInvoicesByPropertyIdQuery(propertyId: string, filters?: InvoiceFilters): Promise<SelectInvoice[]>`
- `getInvoicesByTenantIdQuery(tenantId: string, filters?: InvoiceFilters): Promise<SelectInvoice[]>`
- `getInvoicesByStatusQuery(status: InvoiceStatus, filters?: InvoiceFilters): Promise<SelectInvoice[]>`
- `getInvoicesByDateRangeQuery(startDate: Date, endDate: Date, filters?: InvoiceFilters): Promise<SelectInvoice[]>`
- `getOverdueInvoicesQuery(filters?: InvoiceFilters): Promise<SelectInvoice[]>`

### Invoice Line Items Queries
**File**: `queries/invoice-line-items-queries.ts`

- `getInvoiceLineItemsByInvoiceIdQuery(invoiceId: string): Promise<SelectInvoiceLineItem[]>`
- `getInvoiceLineItemsByTypeQuery(invoiceId: string, lineItemType: LineItemType): Promise<SelectInvoiceLineItem[]>`

### Bills Queries (Extended from MVP 1)
**File**: `queries/bills-queries.ts`

- `getProcessedBillsByPropertyIdQuery(propertyId: string): Promise<SelectBill[]>`
- `getBillWithExtractedDataQuery(billId: string): Promise<BillWithExtractedData | null>`

## Actions (Mutations)

### Invoice Generation Actions
**File**: `actions/invoices-actions.ts`

- `generateInvoiceFromBillAction(billId: string): Promise<ActionState<SelectInvoice>>`
  - Process bill if not already processed
  - Extract line items using rules
  - Create invoice with line items
  - Return invoice with preview data

### Invoice Management Actions
**File**: `actions/invoices-actions.ts`

- `updateInvoiceAction(invoiceId: string, data: Partial<InsertInvoice>): Promise<ActionState<SelectInvoice>>`
- `approveInvoiceAction(invoiceId: string): Promise<ActionState<SelectInvoice>>`
- `cancelInvoiceAction(invoiceId: string): Promise<ActionState<SelectInvoice>>`
- `deleteInvoiceAction(invoiceId: string): Promise<ActionState<void>>`

### Invoice Line Items Actions
**File**: `actions/invoice-line-items-actions.ts`

- `addInvoiceLineItemAction(invoiceId: string, lineItem: InsertInvoiceLineItem): Promise<ActionState<SelectInvoiceLineItem>>`
- `updateInvoiceLineItemAction(lineItemId: string, data: Partial<InsertInvoiceLineItem>): Promise<ActionState<SelectInvoiceLineItem>>`
- `deleteInvoiceLineItemAction(lineItemId: string): Promise<ActionState<void>>`

### Invoice Sending Actions
**File**: `actions/invoices-actions.ts`

- `sendInvoiceAction(invoiceId: string): Promise<ActionState<SelectInvoice>>`
  - Generate PDF invoice
  - Send email via Postmark
  - Update invoice status to "sent"
  - Record sent timestamp
- `resendInvoiceAction(invoiceId: string): Promise<ActionState<SelectInvoice>>`

## API Routes

### Invoice PDF Generation
- `GET /api/invoices/[id]/pdf` - Generate PDF invoice
  - Use template engine (React PDF or similar)
  - Return PDF file

### Invoice Email
- `POST /api/invoices/[id]/send` - Send invoice email
  - Generate PDF
  - Send via Postmark
  - Track email status

## UI Components

### Invoice List
- `app/(authenticated)/dashboard/invoices/page.tsx` - Invoices list page
- `app/(authenticated)/dashboard/invoices/_components/invoice-list.tsx` - Invoices table with filters
- `app/(authenticated)/dashboard/invoices/_components/invoice-filters.tsx` - Filter component

### Invoice Detail
- `app/(authenticated)/dashboard/invoices/[id]/page.tsx` - Invoice detail page
- `app/(authenticated)/dashboard/invoices/[id]/_components/invoice-preview.tsx` - Invoice preview component
- `app/(authenticated)/dashboard/invoices/[id]/_components/invoice-line-items.tsx` - Line items editor
- `app/(authenticated)/dashboard/invoices/[id]/_components/invoice-actions.tsx` - Approve, send, edit actions

### Invoice Generation
- `app/(authenticated)/dashboard/bills/[id]/_components/generate-invoice.tsx` - Generate invoice from bill
- `app/(authenticated)/dashboard/bills/[id]/_components/bill-extraction-preview.tsx` - Preview extracted data

## Invoice Generation Logic

### Process Flow
1. Bill is processed and data extracted (MVP 1)
2. User reviews extracted data
3. User triggers invoice generation
4. System:
   - Gets property rental amount
   - Maps extracted line items to invoice line items
   - Calculates totals
   - Creates invoice record
   - Creates invoice line item records
5. User reviews and edits invoice
6. User approves invoice
7. User sends invoice to tenant

### Line Item Mapping
- Water charges → Invoice line item (type: water)
- Electricity charges → Invoice line item (type: electricity)
- Levy amounts → Invoice line item (type: levy)
- Municipality charges → Invoice line item (type: municipality)
- Other charges → Invoice line item (type: other)

## Integration Points

### Postmark (Email Sending)
- Send invoice emails to tenants
- Include PDF attachment
- Track email delivery
- Handle bounces and failures

### PDF Generation
- Use library like `@react-pdf/renderer` or `puppeteer`
- Invoice template with branding
- Include all line items and totals
- Generate downloadable PDF

## Email Template

Invoice email should include:
- Subject: "Invoice [INVOICE_NUMBER] - [PROPERTY_ADDRESS]"
- Body: Professional email with invoice summary
- Attachment: PDF invoice
- Payment instructions
- Due date reminder

## Environment Variables

```env
# Postmark (already configured in MVP 1)
POSTMARK_API_KEY=xxx
POSTMARK_FROM_EMAIL=invoices@yourdomain.com
```

## Testing Considerations

- Invoice generation accuracy tests
- Line item extraction validation
- Email sending tests
- PDF generation tests
- Invoice calculation tests
- Edge cases (missing data, invalid amounts)

## Success Criteria

- Bills are automatically processed using extraction rules
- Line items are correctly extracted from bills
- Invoices are generated with all charges
- Users can preview and edit invoices before sending
- Invoices are sent to tenants via email
- Invoice status is tracked (draft, sent, paid)
- Users can view and filter all invoices
- PDF invoices are generated correctly

