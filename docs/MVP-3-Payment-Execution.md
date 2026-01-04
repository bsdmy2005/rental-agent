# MVP 3: Payment Execution

## Goal
Execute payments to municipalities and body corporates on behalf of property owners.

## Rental Agent Persona 3
Execute EFT payments for bills - pay municipality bills, body corporate levies, and other property-related expenses on behalf of property owners.

## Core Features

### 1. Payment Initiation
- Create payment requests from bills
- Select bills to pay
- Enter payment details (amount, beneficiary, reference)
- Set payment date (immediate or scheduled)
- Add payment notes

### 2. Payment Approval Workflow
- Review payment details before approval
- Approve or reject payments
- Require approval for payments above threshold (optional)
- Track approval status

### 3. EFT Payment Execution
- Execute payments via Investec API
- Handle payment processing
- Track payment status (pending, processing, completed, failed)
- Retry failed payments
- Handle payment errors

### 4. Payment History
- View all payments (list and detail)
- Filter by property, bill, status, date range
- View payment details (amount, beneficiary, reference, status)
- Download payment receipts/confirmations

### 5. Payment Scheduling
- Schedule future payments
- Recurring payment setup (for regular bills)
- Payment reminders
- Automatic payment execution on scheduled date

## Database Schema

### Payments Table
```typescript
paymentsTable = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  userProfileId: uuid("user_profile_id").references(() => userProfilesTable.id, { onDelete: "cascade" }).notNull(),
  propertyId: uuid("property_id").references(() => propertiesTable.id, { onDelete: "cascade" }).notNull(),
  billId: uuid("bill_id").references(() => billsTable.id), // Optional - link to bill
  paymentType: paymentTypeEnum("payment_type").notNull(), // municipality, levy, utility, other
  amount: numeric("amount").notNull(),
  currency: text("currency").default("ZAR").notNull(),
  beneficiaryName: text("beneficiary_name").notNull(),
  beneficiaryAccountNumber: text("beneficiary_account_number").notNull(),
  beneficiaryBankCode: text("beneficiary_bank_code"), // Bank routing code
  reference: text("reference"), // Payment reference
  status: paymentStatusEnum("status").default("pending").notNull(),
  scheduledDate: timestamp("scheduled_date"), // For scheduled payments
  executedAt: timestamp("executed_at"),
  executedBy: text("executed_by"), // System or user ID
  approvalStatus: approvalStatusEnum("approval_status").default("pending").notNull(),
  approvedBy: text("approved_by"),
  approvedAt: timestamp("approved_at"),
  investecTransactionId: text("investec_transaction_id"), // External payment ID
  investecResponse: jsonb("investec_response"), // API response data
  errorMessage: text("error_message"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date())
})
```

### Payment Approvals Table
```typescript
paymentApprovalsTable = pgTable("payment_approvals", {
  id: uuid("id").defaultRandom().primaryKey(),
  paymentId: uuid("payment_id").references(() => paymentsTable.id, { onDelete: "cascade" }).notNull(),
  approvedBy: text("approved_by").notNull(),
  status: approvalStatusEnum("status").notNull(), // approved, rejected
  comments: text("comments"),
  createdAt: timestamp("created_at").defaultNow().notNull()
})
```

### Enums
```typescript
paymentTypeEnum = pgEnum("payment_type", ["municipality", "levy", "utility", "other"])
paymentStatusEnum = pgEnum("payment_status", ["pending", "approved", "processing", "completed", "failed", "cancelled"])
approvalStatusEnum = pgEnum("approval_status", ["pending", "approved", "rejected"])
```

## Queries (Read Operations)

### Payments Queries
**File**: `queries/payments-queries.ts`

- `getPaymentByIdQuery(paymentId: string): Promise<SelectPayment | null>`
- `getPaymentsByPropertyIdQuery(propertyId: string, filters?: PaymentFilters): Promise<SelectPayment[]>`
- `getPaymentsByBillIdQuery(billId: string): Promise<SelectPayment[]>`
- `getPaymentsByStatusQuery(status: PaymentStatus, filters?: PaymentFilters): Promise<SelectPayment[]>`
- `getPaymentsByUserProfileIdQuery(userProfileId: string, filters?: PaymentFilters): Promise<SelectPayment[]>`
- `getPendingApprovalsQuery(userProfileId: string): Promise<SelectPayment[]>`
- `getScheduledPaymentsQuery(userProfileId: string): Promise<SelectPayment[]>`

### Payment Approvals Queries
**File**: `queries/payment-approvals-queries.ts`

- `getPaymentApprovalsByPaymentIdQuery(paymentId: string): Promise<SelectPaymentApproval[]>`
- `getPaymentApprovalHistoryQuery(paymentId: string): Promise<SelectPaymentApproval[]>`

## Actions (Mutations)

### Payment Creation Actions
**File**: `actions/payments-actions.ts`

- `createPaymentAction(payment: InsertPayment): Promise<ActionState<SelectPayment>>`
- `createPaymentFromBillAction(billId: string, paymentData: Partial<InsertPayment>): Promise<ActionState<SelectPayment>>`
  - Auto-populate payment details from bill
  - Create payment record

### Payment Approval Actions
**File**: `actions/payments-actions.ts`

- `approvePaymentAction(paymentId: string, userProfileId: string): Promise<ActionState<SelectPayment>>`
- `rejectPaymentAction(paymentId: string, userProfileId: string, reason: string): Promise<ActionState<SelectPayment>>`

### Payment Execution Actions
**File**: `actions/payments-actions.ts`

- `executePaymentAction(paymentId: string): Promise<ActionState<SelectPayment>>`
  - Validate payment status
  - Call Investec API
  - Update payment status
  - Handle errors
- `retryPaymentAction(paymentId: string): Promise<ActionState<SelectPayment>>`
- `cancelPaymentAction(paymentId: string): Promise<ActionState<SelectPayment>>`

### Payment Management Actions
**File**: `actions/payments-actions.ts`

- `updatePaymentAction(paymentId: string, data: Partial<InsertPayment>): Promise<ActionState<SelectPayment>>`
- `schedulePaymentAction(paymentId: string, scheduledDate: Date): Promise<ActionState<SelectPayment>>`

## API Routes

### Investec Payment API
- `POST /api/payments/[id]/execute` - Execute payment via Investec
  - Validate payment
  - Call Investec API
  - Update payment status
  - Return result

### Payment Webhooks (Investec)
- `POST /api/webhooks/investec` - Receive payment status updates
  - Update payment status
  - Handle payment confirmations
  - Update bill/invoice status

## UI Components

### Payment List
- `app/(authenticated)/dashboard/payments/page.tsx` - Payments list page
- `app/(authenticated)/dashboard/payments/_components/payment-list.tsx` - Payments table
- `app/(authenticated)/dashboard/payments/_components/payment-filters.tsx` - Filter component

### Payment Creation
- `app/(authenticated)/dashboard/payments/_components/payment-form.tsx` - Create payment form
- `app/(authenticated)/dashboard/payments/_components/payment-from-bill.tsx` - Create payment from bill
- `app/(authenticated)/dashboard/bills/[id]/_components/pay-bill.tsx` - Pay bill button/component

### Payment Detail
- `app/(authenticated)/dashboard/payments/[id]/page.tsx` - Payment detail page
- `app/(authenticated)/dashboard/payments/[id]/_components/payment-detail.tsx` - Payment details view
- `app/(authenticated)/dashboard/payments/[id]/_components/payment-actions.tsx` - Approve, execute, cancel actions
- `app/(authenticated)/dashboard/payments/[id]/_components/payment-status.tsx` - Payment status indicator

### Payment Approval
- `app/(authenticated)/dashboard/payments/approvals/page.tsx` - Pending approvals page
- `app/(authenticated)/dashboard/payments/approvals/_components/approval-list.tsx` - Approvals list

## Integration Points

### Investec API
- OAuth 2.0 flow for Investec API
- Store access tokens securely
- Handle token refresh
- Payment submission
- Payment status queries
- Webhook handling

## Environment Variables

```env
# Investec API
INVESTEC_CLIENT_ID=xxx
INVESTEC_CLIENT_SECRET=xxx
INVESTEC_API_URL=https://api.investec.com
INVESTEC_REDIRECT_URI=https://yourapp.com/api/auth/investec/callback

# Payment Settings
PAYMENT_APPROVAL_THRESHOLD=10000 # ZAR amount requiring approval
```

## Success Criteria

- Users can create payments from bills
- Users can manually create payments
- Payment approval workflow works correctly
- Payments are executed via Investec API
- Payment status is tracked accurately
- Payment history is maintained
- Failed payments can be retried
- Bills are linked to payments
- Scheduled payments execute on time

