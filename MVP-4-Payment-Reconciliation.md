# MVP 4: Payment Reconciliation

## Goal
Track incoming tenant payments and reconcile with bank statements to automatically match payments to invoices.

## Core Features

### 1. Payment Recording
- Manual payment entry
- Record payment amount, date, reference
- Link payment to invoice(s)
- Partial payment support
- Payment method tracking (EFT, cash, etc.)

### 2. Bank Statement Import
- Import bank statements from Investec
- Parse statement data (CSV, PDF, or API)
- Extract transactions
- Match transactions to properties/tenants
- Handle multiple bank accounts

### 3. Automatic Reconciliation
- Match bank transactions to invoices
- Use reference numbers, amounts, dates
- Fuzzy matching for partial matches
- Manual reconciliation for unmatched transactions
- Reconciliation confidence scoring

### 4. Payment Status Tracking
- Track invoice payment status (unpaid, partial, paid, overdue)
- Calculate outstanding balances
- Track payment due dates
- Automatic overdue detection

### 5. Outstanding Balance Management
- View outstanding balances per tenant
- View outstanding balances per property
- Total outstanding balance dashboard
- Aging reports (30, 60, 90+ days)

### 6. Payment Reminders
- Automatic payment reminders for overdue invoices
- Email reminders to tenants
- Reminder scheduling
- Reminder history

## Database Schema

### Tenant Payments Table
```typescript
tenantPaymentsTable = pgTable("tenant_payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceId: uuid("invoice_id").references(() => invoicesTable.id, { onDelete: "cascade" }).notNull(),
  amount: numeric("amount").notNull(),
  paymentDate: timestamp("payment_date").notNull(),
  paymentMethod: paymentMethodEnum("payment_method").notNull(), // eft, cash, cheque, other
  reference: text("reference"), // Payment reference number
  bankTransactionId: text("bank_transaction_id"), // From bank statement
  status: paymentReconciliationStatusEnum("status").default("pending").notNull(), // pending, matched, unmatched, manual
  reconciliationConfidence: numeric("reconciliation_confidence"), // 0-100
  matchedTransactionId: uuid("matched_transaction_id").references(() => bankTransactionsTable.id),
  notes: text("notes"),
  recordedBy: text("recorded_by").notNull(), // User ID
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date())
})
```

### Bank Transactions Table
```typescript
bankTransactionsTable = pgTable("bank_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userProfileId: uuid("user_profile_id").references(() => userProfilesTable.id, { onDelete: "cascade" }).notNull(),
  bankAccountId: uuid("bank_account_id").references(() => bankAccountsTable.id, { onDelete: "cascade" }).notNull(),
  transactionDate: timestamp("transaction_date").notNull(),
  amount: numeric("amount").notNull(), // Positive for credits, negative for debits
  description: text("description"),
  reference: text("reference"),
  balance: numeric("balance"), // Account balance after transaction
  investecTransactionId: text("investec_transaction_id"), // External transaction ID
  status: transactionStatusEnum("status").default("unmatched").notNull(), // unmatched, matched, ignored
  matchedPaymentId: uuid("matched_payment_id").references(() => tenantPaymentsTable.id),
  statementId: uuid("statement_id").references(() => bankStatementsTable.id),
  createdAt: timestamp("created_at").defaultNow().notNull()
})
```

### Bank Statements Table
```typescript
bankStatementsTable = pgTable("bank_statements", {
  id: uuid("id").defaultRandom().primaryKey(),
  userProfileId: uuid("user_profile_id").references(() => userProfilesTable.id, { onDelete: "cascade" }).notNull(),
  bankAccountId: uuid("bank_account_id").references(() => bankAccountsTable.id, { onDelete: "cascade" }).notNull(),
  statementPeriodStart: timestamp("statement_period_start").notNull(),
  statementPeriodEnd: timestamp("statement_period_end").notNull(),
  fileName: text("file_name"),
  fileUrl: text("file_url"), // If uploaded
  source: statementSourceEnum("source").notNull(), // api, manual_upload
  transactionCount: integer("transaction_count").default(0).notNull(),
  processedAt: timestamp("processed_at"),
  status: statementStatusEnum("status").default("pending").notNull(), // pending, processing, processed, error
  createdAt: timestamp("created_at").defaultNow().notNull()
})
```

### Bank Accounts Table
```typescript
bankAccountsTable = pgTable("bank_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userProfileId: uuid("user_profile_id").references(() => userProfilesTable.id, { onDelete: "cascade" }).notNull(),
  bankName: text("bank_name").notNull(), // investec, ozow, etc.
  accountNumber: text("account_number").notNull(),
  accountName: text("account_name"),
  accountType: text("account_type"), // current, savings, etc.
  isActive: boolean("is_active").default(true).notNull(),
  investecAccountId: text("investec_account_id"), // External account ID
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date())
})
```

### Payment Reminders Table
```typescript
paymentRemindersTable = pgTable("payment_reminders", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceId: uuid("invoice_id").references(() => invoicesTable.id, { onDelete: "cascade" }).notNull(),
  reminderType: reminderTypeEnum("reminder_type").notNull(), // overdue, upcoming_due_date
  sentAt: timestamp("sent_at").notNull(),
  sentTo: text("sent_to").notNull(), // Tenant email
  status: reminderStatusEnum("status").default("sent").notNull(), // sent, opened, clicked
  createdAt: timestamp("created_at").defaultNow().notNull()
})
```

### Enums
```typescript
paymentMethodEnum = pgEnum("payment_method", ["eft", "cash", "cheque", "other"])
paymentReconciliationStatusEnum = pgEnum("payment_reconciliation_status", ["pending", "matched", "unmatched", "manual"])
transactionStatusEnum = pgEnum("transaction_status", ["unmatched", "matched", "ignored"])
statementSourceEnum = pgEnum("statement_source", ["api", "manual_upload"])
statementStatusEnum = pgEnum("statement_status", ["pending", "processing", "processed", "error"])
reminderTypeEnum = pgEnum("reminder_type", ["overdue", "upcoming_due_date"])
reminderStatusEnum = pgEnum("reminder_status", ["sent", "opened", "clicked"])
```

## Queries (Read Operations)

### Tenant Payments Queries
**File**: `queries/tenant-payments-queries.ts`

- `getTenantPaymentByIdQuery(paymentId: string): Promise<SelectTenantPayment | null>`
- `getTenantPaymentsByInvoiceIdQuery(invoiceId: string): Promise<SelectTenantPayment[]>`
- `getTenantPaymentsByTenantIdQuery(tenantId: string): Promise<SelectTenantPayment[]>`
- `getUnmatchedPaymentsQuery(userProfileId: string): Promise<SelectTenantPayment[]>`

### Bank Transactions Queries
**File**: `queries/bank-transactions-queries.ts`

- `getBankTransactionByIdQuery(transactionId: string): Promise<SelectBankTransaction | null>`
- `getBankTransactionsByAccountIdQuery(bankAccountId: string, filters?: TransactionFilters): Promise<SelectBankTransaction[]>`
- `getUnmatchedTransactionsQuery(userProfileId: string): Promise<SelectBankTransaction[]>`
- `getBankTransactionsByStatementIdQuery(statementId: string): Promise<SelectBankTransaction[]>`

### Bank Statements Queries
**File**: `queries/bank-statements-queries.ts`

- `getBankStatementByIdQuery(statementId: string): Promise<SelectBankStatement | null>`
- `getBankStatementsByAccountIdQuery(bankAccountId: string): Promise<SelectBankStatement[]>`
- `getBankStatementsByUserProfileIdQuery(userProfileId: string): Promise<SelectBankStatement[]>`

### Bank Accounts Queries
**File**: `queries/bank-accounts-queries.ts`

- `getBankAccountByIdQuery(bankAccountId: string): Promise<SelectBankAccount | null>`
- `getBankAccountsByUserProfileIdQuery(userProfileId: string): Promise<SelectBankAccount[]>`
- `getActiveBankAccountsQuery(userProfileId: string): Promise<SelectBankAccount[]>`

### Outstanding Balances Queries
**File**: `queries/outstanding-balances-queries.ts`

- `getOutstandingBalanceByTenantIdQuery(tenantId: string): Promise<OutstandingBalance | null>`
- `getOutstandingBalanceByPropertyIdQuery(propertyId: string): Promise<OutstandingBalance | null>`
- `getOutstandingBalancesByUserProfileIdQuery(userProfileId: string): Promise<OutstandingBalance[]>`
- `getOverdueInvoicesQuery(userProfileId: string): Promise<SelectInvoice[]>`
- `getAgingReportQuery(userProfileId: string): Promise<AgingReport>`

### Payment Reminders Queries
**File**: `queries/payment-reminders-queries.ts`

- `getPaymentRemindersByInvoiceIdQuery(invoiceId: string): Promise<SelectPaymentReminder[]>`
- `getPaymentRemindersByTenantIdQuery(tenantId: string): Promise<SelectPaymentReminder[]>`

## Actions (Mutations)

### Payment Recording Actions
**File**: `actions/tenant-payments-actions.ts`

- `recordPaymentAction(payment: InsertTenantPayment): Promise<ActionState<SelectTenantPayment>>`
- `recordPartialPaymentAction(invoiceId: string, amount: number, data: Partial<InsertTenantPayment>): Promise<ActionState<SelectTenantPayment>>`

### Bank Statement Import Actions
**File**: `actions/bank-statements-actions.ts`

- `importBankStatementAction(file: File, bankAccountId: string): Promise<ActionState<SelectBankStatement>>`
- `importBankStatementFromInvestecAction(bankAccountId: string, startDate: Date, endDate: Date): Promise<ActionState<SelectBankStatement>>`
- `processBankStatementAction(statementId: string): Promise<ActionState<SelectBankStatement>>`

### Reconciliation Actions
**File**: `actions/reconciliation-actions.ts`

- `reconcilePaymentsAction(statementId: string): Promise<ActionState<ReconciliationResult>>`
- `matchTransactionToInvoiceAction(transactionId: string, invoiceId: string): Promise<ActionState<SelectBankTransaction>>`
- `unmatchTransactionAction(transactionId: string): Promise<ActionState<SelectBankTransaction>>`

### Payment Status Actions
**File**: `actions/invoices-actions.ts`

- `updateInvoicePaymentStatusAction(invoiceId: string): Promise<ActionState<SelectInvoice>>`

### Payment Reminders Actions
**File**: `actions/payment-reminders-actions.ts`

- `sendPaymentReminderAction(invoiceId: string): Promise<ActionState<SelectPaymentReminder>>`
- `schedulePaymentRemindersAction(): Promise<ActionState<void>>` // Background job

### Bank Accounts Actions
**File**: `actions/bank-accounts-actions.ts`

- `createBankAccountAction(account: InsertBankAccount): Promise<ActionState<SelectBankAccount>>`
- `updateBankAccountAction(bankAccountId: string, data: Partial<InsertBankAccount>): Promise<ActionState<SelectBankAccount>>`
- `deleteBankAccountAction(bankAccountId: string): Promise<ActionState<void>>`

## API Routes

### Bank Statement Import
- `POST /api/bank-statements/import` - Import bank statement file
- `POST /api/bank-statements/import-investec` - Import from Investec API

### Reconciliation
- `POST /api/reconciliation/run` - Run automatic reconciliation
- `POST /api/reconciliation/match` - Manually match transaction to invoice

### Payment Reminders
- `POST /api/invoices/[id]/send-reminder` - Send payment reminder

## UI Components

### Payment Recording
- `app/(authenticated)/dashboard/payments/record/page.tsx` - Record payment page
- `app/(authenticated)/dashboard/payments/record/_components/payment-form.tsx` - Payment entry form
- `app/(authenticated)/dashboard/invoices/[id]/_components/record-payment.tsx` - Record payment from invoice

### Bank Statements
- `app/(authenticated)/dashboard/bank-statements/page.tsx` - Bank statements list
- `app/(authenticated)/dashboard/bank-statements/_components/statement-import.tsx` - Import statement component
- `app/(authenticated)/dashboard/bank-statements/[id]/page.tsx` - Statement detail with transactions

### Reconciliation
- `app/(authenticated)/dashboard/reconciliation/page.tsx` - Reconciliation dashboard
- `app/(authenticated)/dashboard/reconciliation/_components/unmatched-transactions.tsx` - Unmatched transactions list
- `app/(authenticated)/dashboard/reconciliation/_components/match-transaction.tsx` - Manual matching component

### Outstanding Balances
- `app/(authenticated)/dashboard/balances/page.tsx` - Outstanding balances dashboard
- `app/(authenticated)/dashboard/balances/_components/balance-summary.tsx` - Summary cards
- `app/(authenticated)/dashboard/balances/_components/aging-report.tsx` - Aging report

## Reconciliation Logic

### Automatic Matching Algorithm
1. For each unmatched bank transaction:
   - Search for invoices with matching reference number
   - Search for invoices with matching amount (within tolerance)
   - Search for invoices with matching date (within range)
   - Calculate confidence score
   - If confidence > threshold, auto-match
   - If confidence < threshold, flag for manual review

2. Matching Criteria:
   - Reference number exact match: +50 points
   - Amount exact match: +30 points
   - Amount within 1%: +20 points
   - Date within 3 days: +20 points
   - Date within 7 days: +10 points
   - Threshold: 70 points for auto-match

## Environment Variables

```env
# Investec API (already configured in MVP 3)
INVESTEC_CLIENT_ID=xxx
INVESTEC_CLIENT_SECRET=xxx

# Reconciliation Settings
RECONCILIATION_CONFIDENCE_THRESHOLD=70
PAYMENT_TOLERANCE_PERCENT=1
DATE_MATCHING_WINDOW_DAYS=7
```

## Success Criteria

- Users can manually record tenant payments
- Bank statements can be imported from Investec
- Bank statements can be manually uploaded
- Transactions are automatically matched to invoices
- Payment status is accurately tracked
- Outstanding balances are calculated correctly
- Payment reminders are sent automatically
- Users can manually reconcile unmatched transactions

