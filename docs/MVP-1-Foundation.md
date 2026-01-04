# MVP 1: Foundation & Document Processing

## Goal
Set up core infrastructure, user management, property management, and document processing capabilities (email + manual upload).

## Overview
This MVP establishes the foundation for the rental agent system. It enables:
- **Landlords** to manage their properties and tenants
- **Rental Agents** to manage properties for multiple landlords
- **Tenants** to access their accounts
- **Admins** to manage the system
- All users to receive bills via email forwarding or manual upload
- Process PDFs using AI
- Configure extraction rules for automated data extraction

## Core Features

### 1. User Profile System
- User registration and authentication (Clerk)
- User profile creation with user type selection
- User types: Landlord, Rental Agent, Tenant, Admin
- Profile management (update details, settings)
- User onboarding flows per user type

### 2. Landlord Management
- Landlord profile creation and management
- Business details (company name, registration, contact info)
- Link landlords to properties they own
- Landlord dashboard

### 3. Rental Agent Management
- Rental agent profile creation and management
- Agency information (agency name, contact details)
- Link rental agents to properties they manage
- Support for agents managing properties for multiple landlords
- Rental agent dashboard

### 4. Property Management
- Create, read, update, delete properties
- Property details: address, property type, rental amount, etc.
- Link properties to landlords (owners)
- Assign rental agents to manage properties
- Property ownership vs management distinction

### 5. Property Management Assignments
- Assign rental agents to properties
- Track which properties are managed by which agents
- Support multiple agents per property (if needed)
- Management history and audit trail

### 6. Tenant Management
- Create, read, update, delete tenants
- Tenant details: name, email, phone, lease dates, property assignment
- Support for multiple tenants per property (if applicable)
- Link tenants to user profiles (for tenant portal access)

### 7. Email Processing (Postmark)
- Receive forwarded emails via Postmark webhook
- Extract PDF attachments from emails
- Store email metadata (sender, subject, date)
- Link emails to properties/tenants based on rules

### 8. Manual PDF Upload
- Upload PDF files directly through UI
- Support multiple file uploads
- File validation and storage
- Link uploaded PDFs to properties/bills

### 9. PDF Processing Pipeline
- Extract PDFs from emails or manual uploads
- Process PDFs using OpenAI 
- Extract text and structured data
- Store extracted data for rule matching

### 10. Extraction Rule Builder
- Upload multiple sample invoices/bills
- Define extraction rules:
  - Field mappings (water, electricity, levies, municipality charges)
  - Pattern matching (regex, keywords)
  - Data transformation rules
- Configure channels:
  - Email forwarding (from specific senders/subjects)
  - Manual upload (property-specific)
- Test rules against sample documents
- Rule versioning and activation

### 11. Admin Dashboard
- System-wide user management
- View all users by type
- User activation/deactivation
- System configuration
- Basic analytics and monitoring

### 12. Landing Page
- Traditional SaaS marketing page describing the rental agent automation product
- **Hero Section**: 
  - Compelling headline about automating rental property management
  - Subheadline explaining the value proposition
  - Primary CTA buttons (Get Started, Sign Up, Login)
  - Visual element (illustration or screenshot)
- **Features Section**:
  - Key features: Email/PDF processing, AI extraction, Invoice generation, Payment automation
  - Feature cards with icons and descriptions
- **Benefits Section**:
  - Save time on manual billing
  - Reduce errors in invoice generation
  - Automate payment processing
  - Improve tenant communication
- **How It Works Section**:
  - Step-by-step process flow
  - Visual representation of the workflow
- **Pricing Section**:
  - Pricing tiers (if applicable)
  - Feature comparison
  - CTA to start free trial
- **Call-to-Action Section**:
  - Final conversion opportunity
  - Sign up or contact form
- **Footer**:
  - Links to About, Features, Pricing, Contact
  - Legal links (Privacy, Terms)
  - Social media links

### 13. Navigation System
- **Lift Panel/Sidebar Menu** for authenticated users:
  - Slide-out sidebar navigation (left side)
  - Collapsible/expandable design
  - Persistent across pages
  - Smooth animations
- **Navigation Structure**:
  - **Landlords**: 
    - Dashboard
    - Properties
    - Tenants
    - Bills
    - Invoices
    - Payments
    - Extraction Rules
    - Profile/Settings
  - **Rental Agents**:
    - Dashboard
    - Managed Properties
    - Bills
    - Invoices
    - Payments
    - Extraction Rules
    - Profile/Settings
  - **Tenants**:
    - Dashboard
    - Invoices
    - Payments
    - Maintenance Requests
    - Messages
    - Profile
  - **Admins**:
    - Dashboard
    - Users
    - Properties (all)
    - System Settings
    - Analytics
    - Profile
- **User Profile Menu**:
  - User avatar/name
  - Dropdown with: Profile, Settings, Logout
  - Located in top-right or sidebar header
- **Responsive Design**:
  - Mobile: Hamburger menu that opens sidebar
  - Tablet: Collapsible sidebar
  - Desktop: Persistent sidebar with collapse option
- **Active State Indicators**:
  - Highlight current page/section
  - Breadcrumb navigation (optional)

## Database Schema

### User Profiles Table
```typescript
userProfilesTable = pgTable("user_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkUserId: text("clerk_user_id").unique().notNull(), // Clerk authentication ID
  userType: userTypeEnum("user_type").notNull(), // landlord, rental_agent, tenant, admin
  email: text("email").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: text("phone"),
  isActive: boolean("is_active").default(true).notNull(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  onboardingCompleted: boolean("onboarding_completed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date())
})
```

### Landlords Table
```typescript
landlordsTable = pgTable("landlords", {
  id: uuid("id").defaultRandom().primaryKey(),
  userProfileId: uuid("user_profile_id").references(() => userProfilesTable.id, { onDelete: "cascade" }).unique().notNull(),
  companyName: text("company_name"),
  registrationNumber: text("registration_number"),
  taxId: text("tax_id"),
  address: text("address"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date())
})
```

### Rental Agents Table
```typescript
rentalAgentsTable = pgTable("rental_agents", {
  id: uuid("id").defaultRandom().primaryKey(),
  userProfileId: uuid("user_profile_id").references(() => userProfilesTable.id, { onDelete: "cascade" }).unique().notNull(),
  agencyName: text("agency_name"),
  licenseNumber: text("license_number"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date())
})
```

### Properties Table
```typescript
propertiesTable = pgTable("properties", {
  id: uuid("id").defaultRandom().primaryKey(),
  landlordId: uuid("landlord_id").references(() => landlordsTable.id, { onDelete: "cascade" }).notNull(), // Property owner
  name: text("name").notNull(),
  address: text("address").notNull(),
  propertyType: text("property_type"), // apartment, house, etc.
  rentalAmount: numeric("rental_amount"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date())
})
```

### Property Managements Table
```typescript
propertyManagementsTable = pgTable("property_managements", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id").references(() => propertiesTable.id, { onDelete: "cascade" }).notNull(),
  rentalAgentId: uuid("rental_agent_id").references(() => rentalAgentsTable.id, { onDelete: "cascade" }).notNull(),
  managementFee: numeric("management_fee"), // Percentage or fixed amount
  startDate: timestamp("start_date").defaultNow().notNull(),
  endDate: timestamp("end_date"), // null if ongoing
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date())
})
```

### Tenants Table
```typescript
tenantsTable = pgTable("tenants", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id").references(() => propertiesTable.id, { onDelete: "cascade" }).notNull(),
  userProfileId: uuid("user_profile_id").references(() => userProfilesTable.id, { onDelete: "set null" }), // Optional - for tenant portal access
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  leaseStartDate: timestamp("lease_start_date"),
  leaseEndDate: timestamp("lease_end_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date())
})
```

### Bills Table
```typescript
billsTable = pgTable("bills", {
  id: uuid("id").defaultRandom().primaryKey(),
  propertyId: uuid("property_id").references(() => propertiesTable.id, { onDelete: "cascade" }).notNull(),
  billType: billTypeEnum("bill_type").notNull(), // municipality, levy, utility
  source: sourceEnum("source").notNull(), // email, manual_upload
  emailId: text("email_id"), // If from email
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(), // S3/storage URL
  rawText: text("raw_text"), // Extracted text from PDF
  extractedData: jsonb("extracted_data"), // Structured extracted data
  status: statusEnum("status").default("pending").notNull(), // pending, processed, error
  extractionRuleId: uuid("extraction_rule_id").references(() => extractionRulesTable.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date())
})
```

### Extraction Rules Table
```typescript
extractionRulesTable = pgTable("extraction_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  userProfileId: uuid("user_profile_id").references(() => userProfilesTable.id, { onDelete: "cascade" }).notNull(), // Landlord or Rental Agent
  propertyId: uuid("property_id").references(() => propertiesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  billType: billTypeEnum("bill_type").notNull(),
  channel: channelEnum("channel").notNull(), // email_forward, manual_upload
  emailFilter: jsonb("email_filter"), // { from: "", subject: "" }
  extractionConfig: jsonb("extraction_config").notNull(), // Field mappings, patterns
  isActive: boolean("is_active").default(true).notNull(),
  version: integer("version").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date())
})
```

### Email Processors Table
```typescript
emailProcessorsTable = pgTable("email_processors", {
  id: uuid("id").defaultRandom().primaryKey(),
  userProfileId: uuid("user_profile_id").references(() => userProfilesTable.id, { onDelete: "cascade" }).notNull(),
  postmarkMessageId: text("postmark_message_id").notNull(),
  from: text("from").notNull(),
  subject: text("subject"),
  receivedAt: timestamp("received_at").notNull(),
  hasAttachments: boolean("has_attachments").default(false).notNull(),
  processedAt: timestamp("processed_at"),
  status: statusEnum("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
})
```

### Enums
```typescript
userTypeEnum = pgEnum("user_type", ["landlord", "rental_agent", "tenant", "admin"])
billTypeEnum = pgEnum("bill_type", ["municipality", "levy", "utility", "other"])
sourceEnum = pgEnum("source", ["email", "manual_upload"])
channelEnum = pgEnum("channel", ["email_forward", "manual_upload"])
statusEnum = pgEnum("status", ["pending", "processing", "processed", "error"])
```

## Queries (Read Operations)

All queries use `db.query.*` and return data directly (not wrapped in ActionState).

### User Profiles Queries
**File**: `queries/user-profiles-queries.ts`

- `getUserProfileByClerkIdQuery(clerkUserId: string): Promise<SelectUserProfile | null>`
- `getUserProfileByIdQuery(userProfileId: string): Promise<SelectUserProfile | null>`
- `getUserProfilesByTypeQuery(userType: UserType): Promise<SelectUserProfile[]>`
- `getAllUserProfilesQuery(filters?: UserProfileFilters): Promise<SelectUserProfile[]>`

### Landlords Queries
**File**: `queries/landlords-queries.ts`

- `getLandlordByUserProfileIdQuery(userProfileId: string): Promise<SelectLandlord | null>`
- `getLandlordByIdQuery(landlordId: string): Promise<SelectLandlord | null>`
- `getLandlordWithPropertiesQuery(landlordId: string): Promise<LandlordWithProperties | null>`

### Rental Agents Queries
**File**: `queries/rental-agents-queries.ts`

- `getRentalAgentByUserProfileIdQuery(userProfileId: string): Promise<SelectRentalAgent | null>`
- `getRentalAgentByIdQuery(rentalAgentId: string): Promise<SelectRentalAgent | null>`
- `getRentalAgentWithPropertiesQuery(rentalAgentId: string): Promise<RentalAgentWithProperties | null>`

### Properties Queries
**File**: `queries/properties-queries.ts`

- `getPropertyByIdQuery(propertyId: string): Promise<SelectProperty | null>`
- `getPropertiesByLandlordIdQuery(landlordId: string): Promise<SelectProperty[]>`
- `getPropertiesByRentalAgentIdQuery(rentalAgentId: string): Promise<SelectProperty[]>` (via property managements)
- `getPropertyWithDetailsQuery(propertyId: string): Promise<PropertyWithDetails | null>`

### Property Managements Queries
**File**: `queries/property-managements-queries.ts`

- `getPropertyManagementsByPropertyIdQuery(propertyId: string): Promise<SelectPropertyManagement[]>`
- `getPropertyManagementsByRentalAgentIdQuery(rentalAgentId: string): Promise<SelectPropertyManagement[]>`
- `getActivePropertyManagementsQuery(propertyId: string): Promise<SelectPropertyManagement[]>`

### Tenants Queries
**File**: `queries/tenants-queries.ts`

- `getTenantByIdQuery(tenantId: string): Promise<SelectTenant | null>`
- `getTenantsByPropertyIdQuery(propertyId: string): Promise<SelectTenant[]>`
- `getTenantByUserProfileIdQuery(userProfileId: string): Promise<SelectTenant | null>`

### Bills Queries
**File**: `queries/bills-queries.ts`

- `getBillByIdQuery(billId: string): Promise<SelectBill | null>`
- `getBillsByPropertyIdQuery(propertyId: string): Promise<SelectBill[]>`
- `getBillsByStatusQuery(status: BillStatus): Promise<SelectBill[]>`

### Extraction Rules Queries
**File**: `queries/extraction-rules-queries.ts`

- `getExtractionRuleByIdQuery(ruleId: string): Promise<SelectExtractionRule | null>`
- `getExtractionRulesByUserProfileIdQuery(userProfileId: string): Promise<SelectExtractionRule[]>`
- `getExtractionRulesByPropertyIdQuery(propertyId: string): Promise<SelectExtractionRule[]>`
- `getActiveExtractionRulesQuery(propertyId: string, billType: BillType): Promise<SelectExtractionRule[]>`

### Email Processors Queries
**File**: `queries/email-processors-queries.ts`

- `getEmailProcessorByIdQuery(processorId: string): Promise<SelectEmailProcessor | null>`
- `getEmailProcessorsByUserProfileIdQuery(userProfileId: string): Promise<SelectEmailProcessor[]>`
- `getEmailProcessorsByStatusQuery(status: EmailProcessorStatus): Promise<SelectEmailProcessor[]>`

## Actions (Mutations)

All actions use `db.insert/update/delete`, return `Promise<ActionState<T>>`, and are marked with `"use server"`.

### User Profiles Actions
**File**: `actions/user-profiles-actions.ts`

- `createUserProfileAction(clerkUserId: string, userType: UserType, data: UserProfileData): Promise<ActionState<SelectUserProfile>>`
- `updateUserProfileAction(userProfileId: string, data: Partial<InsertUserProfile>): Promise<ActionState<SelectUserProfile>>`
- `completeOnboardingAction(userProfileId: string): Promise<ActionState<SelectUserProfile>>`
- `activateUserProfileAction(userProfileId: string): Promise<ActionState<SelectUserProfile>>`
- `deactivateUserProfileAction(userProfileId: string): Promise<ActionState<SelectUserProfile>>`

### Landlords Actions
**File**: `actions/landlords-actions.ts`

- `createLandlordAction(userProfileId: string, landlordData: InsertLandlord): Promise<ActionState<SelectLandlord>>`
- `updateLandlordAction(landlordId: string, data: Partial<InsertLandlord>): Promise<ActionState<SelectLandlord>>`

### Rental Agents Actions
**File**: `actions/rental-agents-actions.ts`

- `createRentalAgentAction(userProfileId: string, agentData: InsertRentalAgent): Promise<ActionState<SelectRentalAgent>>`
- `updateRentalAgentAction(rentalAgentId: string, data: Partial<InsertRentalAgent>): Promise<ActionState<SelectRentalAgent>>`

### Properties Actions
**File**: `actions/properties-actions.ts`

- `createPropertyAction(property: InsertProperty): Promise<ActionState<SelectProperty>>`
- `updatePropertyAction(propertyId: string, data: Partial<InsertProperty>): Promise<ActionState<SelectProperty>>`
- `deletePropertyAction(propertyId: string): Promise<ActionState<void>>`

### Property Managements Actions
**File**: `actions/property-managements-actions.ts`

- `assignRentalAgentToPropertyAction(propertyId: string, rentalAgentId: string, managementData: Partial<InsertPropertyManagement>): Promise<ActionState<SelectPropertyManagement>>`
- `updatePropertyManagementAction(managementId: string, data: Partial<InsertPropertyManagement>): Promise<ActionState<SelectPropertyManagement>>`
- `removeRentalAgentFromPropertyAction(propertyId: string, rentalAgentId: string): Promise<ActionState<void>>`
- `deactivatePropertyManagementAction(managementId: string): Promise<ActionState<SelectPropertyManagement>>`

### Tenants Actions
**File**: `actions/tenants-actions.ts`

- `createTenantAction(tenant: InsertTenant): Promise<ActionState<SelectTenant>>`
- `updateTenantAction(tenantId: string, data: Partial<InsertTenant>): Promise<ActionState<SelectTenant>>`
- `deleteTenantAction(tenantId: string): Promise<ActionState<void>>`
- `linkTenantToUserProfileAction(tenantId: string, userProfileId: string): Promise<ActionState<SelectTenant>>`

### Bills Actions
**File**: `actions/bills-actions.ts`

- `createBillAction(bill: InsertBill): Promise<ActionState<SelectBill>>`
- `updateBillAction(billId: string, data: Partial<InsertBill>): Promise<ActionState<SelectBill>>`
- `processBillAction(billId: string): Promise<ActionState<SelectBill>>` // Triggers AI processing

### Extraction Rules Actions
**File**: `actions/extraction-rules-actions.ts`

- `createExtractionRuleAction(rule: InsertExtractionRule): Promise<ActionState<SelectExtractionRule>>`
- `updateExtractionRuleAction(ruleId: string, data: Partial<InsertExtractionRule>): Promise<ActionState<SelectExtractionRule>>`
- `deleteExtractionRuleAction(ruleId: string): Promise<ActionState<void>>`
- `activateExtractionRuleAction(ruleId: string): Promise<ActionState<SelectExtractionRule>>`
- `deactivateExtractionRuleAction(ruleId: string): Promise<ActionState<SelectExtractionRule>>`

### Email Processors Actions
**File**: `actions/email-processors-actions.ts`

- `createEmailProcessorAction(processor: InsertEmailProcessor): Promise<ActionState<SelectEmailProcessor>>`
- `updateEmailProcessorAction(processorId: string, data: Partial<InsertEmailProcessor>): Promise<ActionState<SelectEmailProcessor>>`
- `processEmailWebhookAction(payload: PostmarkWebhookPayload): Promise<ActionState<void>>`

## API Routes

### Postmark Webhook
- `POST /api/webhooks/postmark` - Receive email webhooks from Postmark
  - Extract PDF attachments
  - Create email processor record
  - Match to extraction rules
  - Trigger bill processing

### File Upload
- `POST /api/bills/upload` - Handle PDF file uploads
  - Validate file type and size
  - Upload to storage (S3/Vercel Blob)
  - Create bill record
  - Trigger processing

## UI Components

### Landing Page
- `app/(unauthenticated)/(marketing)/page.tsx` - Main landing page
- `app/(unauthenticated)/(marketing)/_components/hero-section.tsx` - Hero section with headline and CTA
- `app/(unauthenticated)/(marketing)/_components/features-section.tsx` - Feature highlights
- `app/(unauthenticated)/(marketing)/_components/benefits-section.tsx` - Benefits showcase
- `app/(unauthenticated)/(marketing)/_components/how-it-works-section.tsx` - How it works flow
- `app/(unauthenticated)/(marketing)/_components/pricing-section.tsx` - Pricing information
- `app/(unauthenticated)/(marketing)/_components/cta-section.tsx` - Call-to-action section
- `app/(unauthenticated)/(marketing)/_components/faq-section.tsx` - FAQ section (optional)
- `app/(unauthenticated)/(marketing)/_components/testimonials-section.tsx` - Social proof (optional)

### Navigation System
- `app/(authenticated)/dashboard/_components/sidebar-navigation.tsx` - Lift panel/sidebar menu component
- `app/(authenticated)/dashboard/_components/navigation-menu.tsx` - Main navigation menu
- `app/(authenticated)/dashboard/_components/navigation-item.tsx` - Individual navigation item
- `app/(authenticated)/dashboard/_components/user-menu.tsx` - User profile menu in navigation
- `app/(authenticated)/dashboard/_components/mobile-navigation.tsx` - Mobile-responsive navigation drawer
- `app/(authenticated)/dashboard/layout.tsx` - Dashboard layout with sidebar navigation

### User Onboarding
- `app/(unauthenticated)/onboarding/page.tsx` - User type selection and onboarding
- `app/(unauthenticated)/onboarding/_components/user-type-selector.tsx` - Select user type
- `app/(unauthenticated)/onboarding/_components/landlord-onboarding.tsx` - Landlord profile setup
- `app/(unauthenticated)/onboarding/_components/rental-agent-onboarding.tsx` - Rental agent profile setup
- `app/(unauthenticated)/onboarding/_components/tenant-onboarding.tsx` - Tenant profile setup

### User Profile
- `app/(authenticated)/dashboard/profile/page.tsx` - User profile management
- `app/(authenticated)/dashboard/profile/_components/profile-form.tsx` - Profile edit form

### Landlord Management
- `app/(authenticated)/dashboard/landlord/page.tsx` - Landlord dashboard
- `app/(authenticated)/dashboard/landlord/_components/landlord-profile.tsx` - Landlord profile view/edit

### Rental Agent Management
- `app/(authenticated)/dashboard/agent/page.tsx` - Rental agent dashboard
- `app/(authenticated)/dashboard/agent/_components/agent-profile.tsx` - Agent profile view/edit
- `app/(authenticated)/dashboard/agent/_components/managed-properties.tsx` - Properties managed by agent

### Property Management
- `app/(authenticated)/dashboard/properties/page.tsx` - Properties list page
- `app/(authenticated)/dashboard/properties/_components/property-form.tsx` - Create/edit property form
- `app/(authenticated)/dashboard/properties/_components/property-list.tsx` - Properties list component
- `app/(authenticated)/dashboard/properties/[id]/_components/assign-agent.tsx` - Assign rental agent to property

### Tenant Management
- `app/(authenticated)/dashboard/tenants/page.tsx` - Tenants list page
- `app/(authenticated)/dashboard/tenants/_components/tenant-form.tsx` - Create/edit tenant form
- `app/(authenticated)/dashboard/tenants/_components/tenant-list.tsx` - Tenants list component

### Bill Processing
- `app/(authenticated)/dashboard/bills/page.tsx` - Bills list page
- `app/(authenticated)/dashboard/bills/_components/bill-upload.tsx` - PDF upload component
- `app/(authenticated)/dashboard/bills/_components/bill-list.tsx` - Bills list component
- `app/(authenticated)/dashboard/bills/_components/bill-detail.tsx` - Bill detail view with extracted data

### Extraction Rules
- `app/(authenticated)/dashboard/rules/page.tsx` - Rules list page
- `app/(authenticated)/dashboard/rules/_components/rule-builder.tsx` - Rule builder interface
- `app/(authenticated)/dashboard/rules/_components/rule-form.tsx` - Rule configuration form
- `app/(authenticated)/dashboard/rules/_components/sample-upload.tsx` - Sample invoice upload component

### Admin Dashboard
- `app/(authenticated)/admin/page.tsx` - Admin dashboard
- `app/(authenticated)/admin/users/page.tsx` - User management page
- `app/(authenticated)/admin/users/_components/user-list.tsx` - Users list with filters
- `app/(authenticated)/admin/users/_components/user-actions.tsx` - Activate/deactivate users
- `app/(authenticated)/admin/stats/page.tsx` - System statistics

## Integration Points

### Postmark
- Configure webhook endpoint in Postmark dashboard
- Handle incoming email webhooks
- Extract attachments (PDFs)
- Store email metadata

### OpenAI GPT-4 Vision
- API integration for PDF processing
- Prompt engineering for extraction
- Structured output parsing
- Error handling and retries

### File Storage
- Vercel Blob or AWS S3 for PDF storage
- Secure file access URLs
- File cleanup policies

## Environment Variables

```env
# Postmark
POSTMARK_API_KEY=xxx
POSTMARK_WEBHOOK_SECRET=xxx

# OpenAI
OPENAI_API_KEY=xxx

# File Storage (Vercel Blob)
BLOB_READ_WRITE_TOKEN=xxx
```

## Testing Considerations

- Unit tests for extraction rule matching
- Integration tests for Postmark webhook
- PDF processing accuracy tests
- File upload validation tests
- Rule builder UI tests
- Query performance tests
- Action error handling tests

## Success Criteria

- Landing page displays as a traditional SaaS marketing page with product description
- Landing page includes hero section, features, benefits, and pricing information
- Navigation uses a lift panel/sidebar menu for authenticated users
- Navigation is responsive and works on mobile devices
- Navigation items are contextually displayed based on user type
- Users can register and select their user type (landlord, rental agent, tenant, admin)
- Landlords can create and manage their profiles
- Rental agents can create and manage their profiles
- Landlords can create and manage properties
- Rental agents can be assigned to manage properties
- Property owners can create and manage tenants
- System receives emails via Postmark webhook
- System processes PDF attachments from emails
- Users can manually upload PDF bills
- PDFs are processed using OpenAI GPT-4 Vision
- Users can create extraction rules with sample documents
- Rules can be tested against sample bills
- Rules can be configured for email forwarding or manual upload channels
- Admins can view and manage all users
- Admins can view system statistics

