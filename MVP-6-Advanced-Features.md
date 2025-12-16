# MVP 6: Advanced Features & Scaling

## Goal
Scale the system to support multiple property owners (agencies), add additional payment providers, and provide advanced reporting and analytics.

## Core Features

### 1. Multi-Property Owner Support
- Support for rental agencies
- Agencies can manage multiple property owner accounts
- Property owner accounts can have multiple properties
- Hierarchical permissions (agency admin, property owner, staff)
- Separate billing per property owner

### 2. Additional Payment Providers
- Ozow integration for EFT payments
- Vestec integration for EFT payments
- Capitec integration for EFT payments
- Nedbank integration for EFT payments
- Payment provider selection per payment
- Unified payment interface across providers

### 3. Reporting & Analytics
- Financial reports (income, expenses, profit)
- Property performance reports
- Tenant payment behavior analytics
- Outstanding balance trends
- Payment collection efficiency
- Maintenance cost analysis
- Custom report builder
- Export reports (PDF, Excel, CSV)

### 4. Bulk Operations
- Bulk invoice generation
- Bulk payment processing
- Bulk email sending
- Bulk data import
- Bulk status updates

### 5. API for Third-Party Integrations
- RESTful API with authentication
- Webhook support for events
- API documentation
- Rate limiting
- API key management

### 6. Enhanced Rule Engine
- Complex rule conditions
- Rule templates
- Rule versioning and rollback
- Rule performance analytics
- A/B testing for rules
- Machine learning suggestions for rule improvements

### 7. Service Provider Management
- Service provider directory
- Service provider profiles
- Service provider ratings and reviews
- Assign service providers to maintenance requests
- Track service provider costs
- Service provider payment processing

## Database Schema

### Agencies Table
```typescript
agenciesTable = pgTable("agencies", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  address: text("address"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date())
})
```

### Agency Users Table
```typescript
agencyUsersTable = pgTable("agency_users", {
  id: uuid("id").defaultRandom().primaryKey(),
  agencyId: uuid("agency_id").references(() => agenciesTable.id, { onDelete: "cascade" }).notNull(),
  userProfileId: uuid("user_profile_id").references(() => userProfilesTable.id, { onDelete: "cascade" }).notNull(),
  role: agencyRoleEnum("role").notNull(), // admin, staff, viewer
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
})
```

### Service Providers Table
```typescript
serviceProvidersTable = pgTable("service_providers", {
  id: uuid("id").defaultRandom().primaryKey(),
  userProfileId: uuid("user_profile_id").references(() => userProfilesTable.id, { onDelete: "cascade" }).notNull(), // Property owner who added
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone").notNull(),
  serviceType: text("service_type").notNull(), // plumber, electrician, etc.
  rating: numeric("rating"), // Average rating
  totalJobs: integer("total_jobs").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date())
})
```

### Service Provider Reviews Table
```typescript
serviceProviderReviewsTable = pgTable("service_provider_reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  serviceProviderId: uuid("service_provider_id").references(() => serviceProvidersTable.id, { onDelete: "cascade" }).notNull(),
  maintenanceRequestId: uuid("maintenance_request_id").references(() => maintenanceRequestsTable.id),
  rating: integer("rating").notNull(), // 1-5
  comment: text("comment"),
  reviewedBy: text("reviewed_by").notNull(), // User ID
  createdAt: timestamp("created_at").defaultNow().notNull()
})
```

### Payment Provider Configurations Table
```typescript
paymentProviderConfigsTable = pgTable("payment_provider_configs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userProfileId: uuid("user_profile_id").references(() => userProfilesTable.id, { onDelete: "cascade" }).notNull(),
  provider: paymentProviderEnum("provider").notNull(), // investec, ozow, vestec, capitec, nedbank
  isActive: boolean("is_active").default(true).notNull(),
  configData: jsonb("config_data").notNull(), // Encrypted API keys, credentials
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date())
})
```

### API Keys Table
```typescript
apiKeysTable = pgTable("api_keys", {
  id: uuid("id").defaultRandom().primaryKey(),
  userProfileId: uuid("user_profile_id").references(() => userProfilesTable.id, { onDelete: "cascade" }).notNull(),
  keyName: text("key_name").notNull(),
  apiKey: text("api_key").unique().notNull(), // Hashed
  keyHash: text("key_hash").notNull(), // For verification
  permissions: jsonb("permissions").notNull(), // API permissions
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
})
```

### Webhooks Table
```typescript
webhooksTable = pgTable("webhooks", {
  id: uuid("id").defaultRandom().primaryKey(),
  userProfileId: uuid("user_profile_id").references(() => userProfilesTable.id, { onDelete: "cascade" }).notNull(),
  url: text("url").notNull(),
  events: jsonb("events").notNull(), // Array of event types
  secret: text("secret").notNull(), // Webhook secret
  isActive: boolean("is_active").default(true).notNull(),
  lastTriggeredAt: timestamp("last_triggered_at"),
  createdAt: timestamp("created_at").defaultNow().notNull()
})
```

### Enums
```typescript
agencyRoleEnum = pgEnum("agency_role", ["admin", "staff", "viewer"])
paymentProviderEnum = pgEnum("payment_provider", ["investec", "ozow", "vestec", "capitec", "nedbank"])
```

## Queries (Read Operations)

### Agencies Queries
**File**: `queries/agencies-queries.ts`

- `getAgencyByIdQuery(agencyId: string): Promise<SelectAgency | null>`
- `getAgenciesQuery(): Promise<SelectAgency[]>`
- `getAgencyUsersQuery(agencyId: string): Promise<AgencyUserWithProfile[]>`

### Service Providers Queries
**File**: `queries/service-providers-queries.ts`

- `getServiceProviderByIdQuery(providerId: string): Promise<SelectServiceProvider | null>`
- `getServiceProvidersByUserProfileIdQuery(userProfileId: string): Promise<SelectServiceProvider[]>`
- `getServiceProvidersByServiceTypeQuery(serviceType: string, userProfileId: string): Promise<SelectServiceProvider[]>`
- `getServiceProviderWithReviewsQuery(providerId: string): Promise<ServiceProviderWithReviews | null>`

### Payment Providers Queries
**File**: `queries/payment-providers-queries.ts`

- `getPaymentProviderConfigsByUserProfileIdQuery(userProfileId: string): Promise<SelectPaymentProviderConfig[]>`
- `getActivePaymentProviderConfigsQuery(userProfileId: string): Promise<SelectPaymentProviderConfig[]>`

### Reports Queries
**File**: `queries/reports-queries.ts`

- `getFinancialReportQuery(filters: ReportFilters): Promise<FinancialReport>`
- `getPropertyReportQuery(propertyId: string, dateRange: DateRange): Promise<PropertyReport>`
- `getTenantReportQuery(tenantId: string): Promise<TenantReport>`
- `getAgingReportQuery(userProfileId: string): Promise<AgingReport>`

### API Keys Queries
**File**: `queries/api-keys-queries.ts`

- `getApiKeyByIdQuery(apiKeyId: string): Promise<SelectApiKey | null>`
- `getApiKeysByUserProfileIdQuery(userProfileId: string): Promise<SelectApiKey[]>`
- `validateApiKeyQuery(apiKey: string): Promise<SelectApiKey | null>`

### Webhooks Queries
**File**: `queries/webhooks-queries.ts`

- `getWebhookByIdQuery(webhookId: string): Promise<SelectWebhook | null>`
- `getWebhooksByUserProfileIdQuery(userProfileId: string): Promise<SelectWebhook[]>`
- `getActiveWebhooksQuery(userProfileId: string): Promise<SelectWebhook[]>`

## Actions (Mutations)

### Agency Management Actions
**File**: `actions/agencies-actions.ts`

- `createAgencyAction(agency: InsertAgency): Promise<ActionState<SelectAgency>>`
- `addAgencyUserAction(agencyId: string, userProfileId: string, role: AgencyRole): Promise<ActionState<SelectAgencyUser>>`
- `updateAgencyUserRoleAction(agencyUserId: string, role: AgencyRole): Promise<ActionState<SelectAgencyUser>>`
- `removeAgencyUserAction(agencyUserId: string): Promise<ActionState<void>>`

### Payment Providers Actions
**File**: `actions/payment-providers-actions.ts`

- `configurePaymentProviderAction(config: InsertPaymentProviderConfig): Promise<ActionState<SelectPaymentProviderConfig>>`
- `updatePaymentProviderConfigAction(configId: string, data: Partial<InsertPaymentProviderConfig>): Promise<ActionState<SelectPaymentProviderConfig>>`
- `testPaymentProviderAction(providerId: string): Promise<ActionState<boolean>>`

### Service Providers Actions
**File**: `actions/service-providers-actions.ts`

- `createServiceProviderAction(provider: InsertServiceProvider): Promise<ActionState<SelectServiceProvider>>`
- `updateServiceProviderAction(providerId: string, data: Partial<InsertServiceProvider>): Promise<ActionState<SelectServiceProvider>>`
- `assignServiceProviderAction(maintenanceRequestId: string, serviceProviderId: string): Promise<ActionState<SelectMaintenanceRequest>>`
- `rateServiceProviderAction(serviceProviderId: string, rating: number, comment?: string): Promise<ActionState<SelectServiceProviderReview>>`

### Reporting Actions
**File**: `actions/reports-actions.ts`

- `generateFinancialReportAction(filters: ReportFilters): Promise<ActionState<FinancialReport>>`
- `exportReportAction(reportType: string, filters: ReportFilters, format: "pdf" | "excel" | "csv"): Promise<ActionState<string>>` // Returns file URL

### Bulk Operations Actions
**File**: `actions/bulk-operations-actions.ts`

- `bulkGenerateInvoicesAction(billIds: string[]): Promise<ActionState<SelectInvoice[]>>`
- `bulkSendInvoicesAction(invoiceIds: string[]): Promise<ActionState<BulkOperationResult>>`
- `bulkProcessPaymentsAction(paymentIds: string[]): Promise<ActionState<BulkOperationResult>>`

### API Management Actions
**File**: `actions/api-keys-actions.ts`

- `createApiKeyAction(userProfileId: string, keyName: string, permissions: ApiPermissions): Promise<ActionState<SelectApiKey>>`
- `revokeApiKeyAction(apiKeyId: string): Promise<ActionState<void>>`
- `updateApiKeyAction(apiKeyId: string, data: Partial<InsertApiKey>): Promise<ActionState<SelectApiKey>>`

### Webhooks Actions
**File**: `actions/webhooks-actions.ts`

- `createWebhookAction(webhook: InsertWebhook): Promise<ActionState<SelectWebhook>>`
- `updateWebhookAction(webhookId: string, data: Partial<InsertWebhook>): Promise<ActionState<SelectWebhook>>`
- `deleteWebhookAction(webhookId: string): Promise<ActionState<void>>`
- `triggerWebhookAction(webhookId: string, event: string, data: any): Promise<ActionState<void>>`

## API Routes

### Public API
- `GET /api/v1/invoices` - List invoices (with API key)
- `GET /api/v1/invoices/[id]` - Get invoice
- `POST /api/v1/payments` - Create payment
- `GET /api/v1/properties` - List properties
- `GET /api/v1/tenants` - List tenants

### Webhooks
- `POST /api/webhooks/events` - Trigger webhook events
- `GET /api/webhooks/[id]/logs` - Webhook delivery logs

## UI Components

### Agency Management
- `app/(authenticated)/dashboard/agency/page.tsx` - Agency settings
- `app/(authenticated)/dashboard/agency/_components/agency-users.tsx` - Manage users
- `app/(authenticated)/dashboard/agency/_components/property-owner-accounts.tsx` - Manage property owner accounts

### Payment Providers
- `app/(authenticated)/dashboard/settings/payment-providers/page.tsx` - Payment provider configuration
- `app/(authenticated)/dashboard/settings/payment-providers/_components/provider-config.tsx` - Provider setup form

### Reporting
- `app/(authenticated)/dashboard/reports/page.tsx` - Reports dashboard
- `app/(authenticated)/dashboard/reports/_components/report-builder.tsx` - Custom report builder
- `app/(authenticated)/dashboard/reports/_components/financial-report.tsx` - Financial report view

### Service Providers
- `app/(authenticated)/dashboard/service-providers/page.tsx` - Service providers directory
- `app/(authenticated)/dashboard/service-providers/_components/provider-form.tsx` - Add/edit provider
- `app/(authenticated)/dashboard/service-providers/_components/provider-ratings.tsx` - Ratings and reviews

### API Management
- `app/(authenticated)/dashboard/settings/api/page.tsx` - API keys management
- `app/(authenticated)/dashboard/settings/api/_components/api-key-form.tsx` - Create API key
- `app/(authenticated)/dashboard/settings/webhooks/page.tsx` - Webhooks management

## Integration Points

### Payment Providers
- Ozow API integration
- Vestec API integration
- Capitec API integration
- Nedbank API integration
- Unified payment interface

### Reporting Engine
- Data aggregation
- Chart generation
- Export functionality
- Scheduled report generation

### API Gateway
- Authentication middleware
- Rate limiting
- Request logging
- Error handling

## Environment Variables

```env
# Payment Providers
OZOW_API_KEY=xxx
OZOW_API_URL=xxx
VESTEC_API_KEY=xxx
VESTEC_API_URL=xxx
CAPITEC_API_KEY=xxx
CAPITEC_API_URL=xxx
NEDBANK_API_KEY=xxx
NEDBANK_API_URL=xxx

# API Settings
API_RATE_LIMIT_PER_MINUTE=60
API_KEY_ENCRYPTION_SECRET=xxx
```

## Success Criteria

- Agencies can manage multiple property owners
- Multiple payment providers are supported
- Financial reports are generated accurately
- Bulk operations work correctly
- API is functional and documented
- Webhooks are delivered reliably
- Service providers can be managed
- System scales to handle multiple agencies

