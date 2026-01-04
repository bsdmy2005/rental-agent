# MVP 5: Tenant Portal & Communication

## Goal
Enable tenant self-service and communication channels for logging maintenance requests and viewing account information.

## Core Features

### 1. Tenant Authentication
- Tenant registration/login via Clerk
- Link tenant accounts to property records
- Tenant profile management
- Secure access to tenant-specific data

### 2. Tenant Dashboard
- Overview of account status
- Outstanding balance summary
- Recent invoices
- Recent payments
- Upcoming due dates
- Maintenance request status

### 3. Invoice Viewing
- View all invoices (sent invoices only)
- Invoice detail view with line items
- Download PDF invoices
- View payment status per invoice
- Filter by date range, status

### 4. Payment History
- View all payments made
- Payment details (amount, date, reference)
- Link to invoices
- Payment method information

### 5. Maintenance Request Submission
- Submit maintenance requests
- Upload photos of issues
- Describe the problem
- Select priority level
- Track request status
- View request history

### 6. Communication
- Send messages to property owner
- Receive messages from property owner
- Email notifications
- WhatsApp integration (future)
- Communication history

### 7. Payment Reminders
- View payment reminders received
- See overdue invoices
- Payment due date notifications

## Database Schema

### Maintenance Requests Table
```typescript
maintenanceRequestsTable = pgTable("maintenance_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenantsTable.id, { onDelete: "cascade" }).notNull(),
  propertyId: uuid("property_id").references(() => propertiesTable.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  priority: priorityEnum("priority").default("medium").notNull(),
  status: maintenanceStatusEnum("status").default("open").notNull(),
  serviceProviderId: uuid("service_provider_id").references(() => serviceProvidersTable.id),
  estimatedCost: numeric("estimated_cost"),
  actualCost: numeric("actual_cost"),
  completedAt: timestamp("completed_at"),
  tenantNotes: text("tenant_notes"),
  ownerNotes: text("owner_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date())
})
```

### Maintenance Request Attachments Table
```typescript
maintenanceRequestAttachmentsTable = pgTable("maintenance_request_attachments", {
  id: uuid("id").defaultRandom().primaryKey(),
  maintenanceRequestId: uuid("maintenance_request_id").references(() => maintenanceRequestsTable.id, { onDelete: "cascade" }).notNull(),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileType: text("file_type").notNull(), // image, pdf, etc.
  uploadedBy: text("uploaded_by").notNull(), // tenant_id or user_id
  createdAt: timestamp("created_at").defaultNow().notNull()
})
```

### Messages Table
```typescript
messagesTable = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => tenantsTable.id, { onDelete: "cascade" }).notNull(),
  propertyId: uuid("property_id").references(() => propertiesTable.id, { onDelete: "cascade" }).notNull(),
  senderType: senderTypeEnum("sender_type").notNull(), // tenant, owner
  senderId: text("sender_id").notNull(), // tenant_id or user_profile_id
  subject: text("subject"),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  readAt: timestamp("read_at"),
  relatedMaintenanceRequestId: uuid("related_maintenance_request_id").references(() => maintenanceRequestsTable.id),
  createdAt: timestamp("created_at").defaultNow().notNull()
})
```

### Enums
```typescript
priorityEnum = pgEnum("priority", ["low", "medium", "high", "urgent"])
maintenanceStatusEnum = pgEnum("maintenance_status", ["open", "in_progress", "pending_approval", "completed", "cancelled"])
senderTypeEnum = pgEnum("sender_type", ["tenant", "owner"])
```

## Queries (Read Operations)

### Tenant Dashboard Queries
**File**: `queries/tenant-dashboard-queries.ts`

- `getTenantDashboardDataQuery(tenantId: string): Promise<TenantDashboardData | null>`
  - Outstanding balance
  - Recent invoices
  - Recent payments
  - Open maintenance requests

### Invoices Queries (Tenant View)
**File**: `queries/invoices-queries.ts` (Extended from MVP 2)

- `getTenantInvoicesQuery(tenantId: string, filters?: InvoiceFilters): Promise<SelectInvoice[]>`
- `getTenantInvoiceByIdQuery(invoiceId: string, tenantId: string): Promise<SelectInvoiceWithLineItems | null>`

### Payments Queries (Tenant View)
**File**: `queries/tenant-payments-queries.ts` (Extended from MVP 4)

- `getTenantPaymentsQuery(tenantId: string): Promise<SelectTenantPayment[]>`
- `getTenantPaymentByIdQuery(paymentId: string, tenantId: string): Promise<SelectTenantPayment | null>`

### Maintenance Requests Queries
**File**: `queries/maintenance-requests-queries.ts`

- `getMaintenanceRequestByIdQuery(requestId: string, tenantId: string): Promise<SelectMaintenanceRequest | null>`
- `getTenantMaintenanceRequestsQuery(tenantId: string): Promise<SelectMaintenanceRequest[]>`
- `getMaintenanceRequestWithAttachmentsQuery(requestId: string): Promise<MaintenanceRequestWithAttachments | null>`

### Messages Queries
**File**: `queries/messages-queries.ts`

- `getTenantMessagesQuery(tenantId: string): Promise<SelectMessage[]>`
- `getUnreadMessageCountQuery(tenantId: string): Promise<number>`
- `getMessagesByPropertyIdQuery(propertyId: string, tenantId: string): Promise<SelectMessage[]>`

## Actions (Mutations)

### Tenant Authentication Actions
**File**: `actions/tenants-actions.ts` (Extended from MVP 1)

- `linkTenantToUserProfileAction(tenantId: string, userProfileId: string): Promise<ActionState<SelectTenant>>`

### Maintenance Requests Actions
**File**: `actions/maintenance-requests-actions.ts`

- `createMaintenanceRequestAction(request: InsertMaintenanceRequest): Promise<ActionState<SelectMaintenanceRequest>>`
- `updateMaintenanceRequestAction(requestId: string, tenantId: string, data: Partial<InsertMaintenanceRequest>): Promise<ActionState<SelectMaintenanceRequest>>`
- `uploadMaintenanceRequestAttachmentAction(requestId: string, file: File, tenantId: string): Promise<ActionState<SelectMaintenanceRequestAttachment>>`

### Messages Actions
**File**: `actions/messages-actions.ts`

- `sendMessageAction(message: InsertMessage): Promise<ActionState<SelectMessage>>`
- `markMessageAsReadAction(messageId: string, tenantId: string): Promise<ActionState<SelectMessage>>`

## API Routes

### Tenant Invoice PDF
- `GET /api/tenant/invoices/[id]/pdf` - Download invoice PDF (tenant access only)

### Maintenance Request Attachments
- `POST /api/maintenance-requests/[id]/attachments` - Upload attachment
- `GET /api/maintenance-requests/[id]/attachments/[attachmentId]` - Download attachment

## UI Components

### Tenant Portal Layout
- `app/(authenticated)/tenant/layout.tsx` - Tenant portal layout
- `app/(authenticated)/tenant/dashboard/page.tsx` - Tenant dashboard

### Tenant Invoices
- `app/(authenticated)/tenant/invoices/page.tsx` - Tenant invoices list
- `app/(authenticated)/tenant/invoices/[id]/page.tsx` - Invoice detail view
- `app/(authenticated)/tenant/invoices/_components/invoice-list.tsx` - Invoices list component

### Tenant Payments
- `app/(authenticated)/tenant/payments/page.tsx` - Payment history
- `app/(authenticated)/tenant/payments/_components/payment-list.tsx` - Payments list

### Maintenance Requests
- `app/(authenticated)/tenant/maintenance/page.tsx` - Maintenance requests list
- `app/(authenticated)/tenant/maintenance/new/page.tsx` - Create maintenance request
- `app/(authenticated)/tenant/maintenance/[id]/page.tsx` - Maintenance request detail
- `app/(authenticated)/tenant/maintenance/_components/request-form.tsx` - Request form
- `app/(authenticated)/tenant/maintenance/_components/request-list.tsx` - Requests list

### Messages
- `app/(authenticated)/tenant/messages/page.tsx` - Messages inbox
- `app/(authenticated)/tenant/messages/_components/message-list.tsx` - Messages list
- `app/(authenticated)/tenant/messages/_components/message-composer.tsx` - Send message component

## Tenant Onboarding Flow

### Registration Process
1. Property owner creates tenant record
2. System generates invitation link/token
3. Tenant clicks link and registers with Clerk
4. Tenant account is linked to tenant record
5. Tenant gains access to portal

### Alternative: Self-Registration
1. Tenant visits registration page
2. Tenant enters property address and email
3. System matches to existing tenant record
4. If match found, link account
5. If no match, create pending tenant record
6. Property owner approves/links tenant

## Integration Points

### Clerk Authentication
- Tenant user management
- Session handling
- User profile management

### Email (Postmark)
- Send notifications to tenants
- Invoice delivery
- Payment confirmations

### File Storage
- Store maintenance request attachments
- Secure file access URLs

## Environment Variables

```env
# Clerk (already configured)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=xxx
CLERK_SECRET_KEY=xxx

# Postmark (already configured)
POSTMARK_API_KEY=xxx
```

## Success Criteria

- Tenants can register and log in
- Tenants can view their invoices
- Tenants can view payment history
- Tenants can submit maintenance requests
- Tenants can upload photos with requests
- Tenants can send messages to property owners
- Tenants receive email notifications
- Tenants can only access their own data
- Property owners can respond to maintenance requests

