
# PropNxt.AI - Complete Architecture Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [User Creation & Onboarding Flow](#user-creation--onboarding-flow)
3. [Database Table Dependencies](#database-table-dependencies)
4. [Bill Processing Flow](#bill-processing-flow)
5. [Billing Schedule & Period Architecture](#billing-schedule--period-architecture)
6. [Template Dependencies](#template-dependencies)
7. [Email Processing Flow](#email-processing-flow)
8. [Functional Dependencies](#functional-dependencies)
9. [Data Flow Diagrams](#data-flow-diagrams)
10. [API Architecture](#api-architecture)

---

## System Overview

The PropNxt.AI system is a comprehensive property management automation platform that:
- Processes bills (municipality, levy, utility) via email or manual upload
- Extracts data using AI-powered extraction rules
- Generates billing periods from lease agreements
- Matches bills to billing periods
- Generates invoices and payables based on templates and dependencies
- Tracks schedule compliance and dependencies

**Core Technologies:**
- Frontend: Next.js 15, Tailwind, Shadcn UI, Framer Motion
- Backend: PostgreSQL, Supabase, Drizzle ORM, Server Actions
- Auth: Clerk
- AI: OpenAI (PDF processing, email analysis)
- Email: Postmark webhooks


## User Creation & Onboarding Flow

### Flow Diagram

graph TD
    A[User Signs Up via Clerk] --> B{User Profile Exists?}
    B -->|No| C[Create User Profile]
    B -->|Yes| D{Onboarding Complete?}
    C --> E[Select User Type]
    E --> F[Landlord/Rental Agent/Tenant/Admin]
    F --> G[Complete Onboarding Form]
    G --> H[Create Role-Specific Record]
    H --> I[Landlord Record]
    H --> J[Rental Agent Record]
    H --> K[Tenant Record]
    I --> L[Mark Onboarding Complete]
    J --> L
    K --> L
    L --> M[Redirect to Dashboard]
    D -->|Yes| M
    D -->|No| G### User Profile Creation Sequence

sequenceDiagram
    participant User
    participant Clerk
    participant OnboardingPage
    participant UserProfileAction
    participant LandlordAction
    participant DB

    User->>Clerk: Sign Up/Login
    Clerk->>OnboardingPage: Redirect to /onboarding
    OnboardingPage->>User: Show User Type Selector
    User->>OnboardingPage: Select User Type
    OnboardingPage->>UserProfileAction: createUserProfileAction(clerkUserId, userType)
    UserProfileAction->>DB: Insert into user_profiles
    DB-->>UserProfileAction: User Profile Created
    UserProfileAction-->>OnboardingPage: Success
    OnboardingPage->>User: Show Role-Specific Form
    User->>OnboardingPage: Fill Form & Submit
    OnboardingPage->>LandlordAction: createLandlordAction(userProfileId, data)
    LandlordAction->>DB: Insert into landlords
    DB-->>LandlordAction: Landlord Created
    LandlordAction->>UserProfileAction: completeOnboardingAction(userProfileId)
    UserProfileAction->>DB: Update user_profiles (onboardingCompleted = true)
    DB-->>UserProfileAction: Updated
    UserProfileAction-->>OnboardingPage: Success
    OnboardingPage->>User: Redirect to Dashboard### User Profile Dependencies

erDiagram
    USER_PROFILES ||--o| LANDLORDS : "1:1 (unique)"
    USER_PROFILES ||--o| RENTAL_AGENTS : "1:1 (unique)"
    USER_PROFILES ||--o| TENANTS : "1:many (optional)"
    USER_PROFILES ||--|| CUSTOMERS : "1:1 (unique)"
    USER_PROFILES ||--o{ EXTRACTION_RULES : "creates"
    USER_PROFILES ||--o{ EMAIL_PROCESSORS : "receives"
    USER_PROFILES ||--o{ PERIOD_BILL_MATCHES : "matches"

    USER_PROFILES {
        uuid id PK
        text clerk_user_id UK
        enum user_type
        text email
        boolean onboarding_completed
    }
    
    LANDLORDS {
        uuid id PK
        uuid user_profile_id FK
        text company_name
    }
    
    RENTAL_AGENTS {
        uuid id PK
        uuid user_profile_id FK
        text agency_name
    }
    
    TENANTS {
        uuid id PK
        uuid user_profile_id FK
        uuid property_id FK
    }---

## Database Table Dependencies

### Complete Entity Relationship Diagram

erDiagram
    %% User & Authentication Layer
    USER_PROFILES ||--o| LANDLORDS : "1:1"
    USER_PROFILES ||--o| RENTAL_AGENTS : "1:1"
    USER_PROFILES ||--o| TENANTS : "1:many"
    USER_PROFILES ||--|| CUSTOMERS : "1:1"
    
    %% Property Management Layer
    LANDLORDS ||--o{ PROPERTIES : "owns"
    RENTAL_AGENTS ||--o{ PROPERTY_MANAGEMENTS : "manages"
    PROPERTIES ||--o{ PROPERTY_MANAGEMENTS : "managed_by"
    PROPERTIES ||--o{ TENANTS : "has"
    
    %% Lease & Tenant Layer
    TENANTS ||--o{ LEASE_AGREEMENTS : "has"
    PROPERTIES ||--o{ LEASE_AGREEMENTS : "has"
    
    %% Bill Processing Layer
    PROPERTIES ||--o{ BILLS : "receives"
    PROPERTIES ||--o{ EXTRACTION_RULES : "has"
    EXTRACTION_RULES ||--o{ RULE_SAMPLES : "has"
    EXTRACTION_RULES ||--o{ BILLS : "processes"
    BILLS ||--o{ VARIABLE_COSTS : "generates"
    VARIABLE_COSTS ||--o{ VARIABLE_COST_ALLOCATIONS : "allocated_to"
    TENANTS ||--o{ VARIABLE_COST_ALLOCATIONS : "receives"
    TENANTS ||--o{ FIXED_COSTS : "has"
    
    %% Template Layer
    PROPERTIES ||--o{ BILL_TEMPLATES : "has"
    PROPERTIES ||--o{ PAYABLE_TEMPLATES : "has"
    PROPERTIES ||--o{ RENTAL_INVOICE_TEMPLATES : "has"
    BILL_TEMPLATES ||--o{ BILLS : "instances"
    BILL_TEMPLATES ||--o| BILL_ARRIVAL_SCHEDULES : "has"
    PAYABLE_TEMPLATES ||--o{ PAYABLE_INSTANCES : "generates"
    PAYABLE_TEMPLATES ||--o| PAYABLE_SCHEDULES : "has"
    RENTAL_INVOICE_TEMPLATES ||--o{ RENTAL_INVOICE_INSTANCES : "generates"
    
    %% Billing Schedule Layer
    PROPERTIES ||--o{ BILLING_SCHEDULES : "has"
    BILLING_SCHEDULES ||--o{ BILLING_SCHEDULE_STATUS : "tracks"
    BILLING_SCHEDULES ||--o{ BILLS : "links_to"
    
    %% Billing Period Layer
    PROPERTIES ||--o{ BILLING_PERIODS : "has"
    TENANTS ||--o{ BILLING_PERIODS : "invoice_periods"
    LEASE_AGREEMENTS ||--o{ BILLING_PERIODS : "generates"
    PAYABLE_TEMPLATES ||--o{ BILLING_PERIODS : "payable_periods"
    RENTAL_INVOICE_TEMPLATES ||--o{ BILLING_PERIODS : "invoice_periods"
    BILLING_PERIODS ||--o{ PERIOD_BILL_MATCHES : "matches"
    BILLS ||--o{ PERIOD_BILL_MATCHES : "matched_to"
    
    %% Email Processing Layer
    USER_PROFILES ||--o{ EMAIL_PROCESSORS : "receives"
    EMAIL_PROCESSORS ||--o{ BILLS : "creates"
    
    %% Key Relationships
    USER_PROFILES {
        uuid id PK
        text clerk_user_id UK
        enum user_type
    }
    
    PROPERTIES {
        uuid id PK
        uuid landlord_id FK
        text name
        enum payment_model
    }
    
    BILLS {
        uuid id PK
        uuid property_id FK
        uuid bill_template_id FK
        uuid invoice_rule_id FK
        uuid payment_rule_id FK
        enum bill_type
        enum status
        jsonb invoice_extraction_data
        jsonb payment_extraction_data
    }
    
    BILLING_PERIODS {
        uuid id PK
        uuid property_id FK
        uuid tenant_id FK
        uuid lease_agreement_id FK
        uuid payable_template_id FK
        uuid rental_invoice_template_id FK
        text period_type
        integer period_year
        integer period_month
    }### Table Dependency Hierarchy
d
graph TD
    A[USER_PROFILES] --> B[LANDLORDS]
    A --> C[RENTAL_AGENTS]
    A --> D[TENANTS]
    A --> E[CUSTOMERS]
    
    B --> F[PROPERTIES]
    C --> G[PROPERTY_MANAGEMENTS]
    F --> G
    F --> D
    F --> H[BILL_TEMPLATES]
    F --> I[PAYABLE_TEMPLATES]
    F --> J[RENTAL_INVOICE_TEMPLATES]
    F --> K[EXTRACTION_RULES]
    F --> L[BILLING_SCHEDULES]
    F --> M[BILLING_PERIODS]
    
    D --> N[LEASE_AGREEMENTS]
    D --> O[FIXED_COSTS]
    N --> M
    
    H --> P[BILL_ARRIVAL_SCHEDULES]
    H --> Q[BILLS]
    I --> R[PAYABLE_SCHEDULES]
    I --> S[PAYABLE_INSTANCES]
    I --> M
    J --> T[RENTAL_INVOICE_INSTANCES]
    J --> M
    
    K --> U[RULE_SAMPLES]
    K --> Q
    
    Q --> V[VARIABLE_COSTS]
    Q --> W[PERIOD_BILL_MATCHES]
    V --> X[VARIABLE_COST_ALLOCATIONS]
    D --> X
    M --> W
    
    L --> Y[BILLING_SCHEDULE_STATUS]
    Q --> Y
    
    A --> Z[EMAIL_PROCESSORS]
    Z --> Q---

## Bill Processing Flow

### Bill Processing Sequence
d
sequenceDiagram
    participant User
    participant API
    participant BillAction
    participant PDFProcessor
    participant ExtractionRule
    participant PeriodMatcher
    participant TemplateLinker
    participant DB

    User->>API: Upload Bill (Email/Manual)
    API->>BillAction: createBillAction()
    BillAction->>DB: Insert into bills (status: pending)
    DB-->>BillAction: Bill Created
    BillAction-->>API: Success
    API->>BillAction: processBillAction(billId) [Async]
    
    BillAction->>BillAction: Update status to "processing"
    BillAction->>ExtractionRule: Find Rules (invoice + payment)
    ExtractionRule-->>BillAction: Rules Found
    BillAction->>PDFProcessor: processPDFWithDualPurposeExtraction()
    PDFProcessor->>PDFProcessor: Extract Invoice Data
    PDFProcessor->>PDFProcessor: Extract Payment Data
    PDFProcessor-->>BillAction: Extraction Results
    
    BillAction->>DB: Update bill (extraction data, status: processed)
    BillAction->>PeriodMatcher: matchBillToPeriod() [Auto]
    PeriodMatcher->>PeriodMatcher: Find Matching Period
    PeriodMatcher->>DB: Insert into period_bill_matches
    PeriodMatcher-->>BillAction: Matched
    
    BillAction->>TemplateLinker: linkBillToTemplate()
    TemplateLinker->>DB: Update bill (bill_template_id)
    TemplateLinker-->>BillAction: Linked
    
    BillAction->>DB: Check billing schedule status
    DB-->>BillAction: Status Updated
    BillAction-->>User: Bill Processed
### Bill Processing State Machine

stateDiagram-v2
    [*] --> pending: Bill Created
    pending --> processing: processBillAction()
    processing --> processed: Extraction Complete
    processing --> error: Extraction Failed
    error --> processing: Retry
    processed --> [*]: Complete
    
    note right of processed
        Auto-actions:
        - Match to period
        - Link to template
        - Update schedule status
    end note### Bill to Period Matching Logic

graph TD
    A[Bill Processed] --> B{Has billingYear/billingMonth?}
    B -->|No| C[Skip Auto-Match]
    B -->|Yes| D{Determine Preferred Period Type}
    D --> E[Bill Type: municipality → invoice]
    D --> F[Bill Type: levy/utility → payable]
    D --> G[Bill Type: other → try both]
    
    E --> H[Find Invoice Period]
    F --> I[Find Payable Period]
    G --> H
    
    H --> J{Period Found?}
    I --> K{Period Found?}
    
    J -->|Yes| L[Validate Template Match]
    K -->|Yes| L
    
    J -->|No| M[Try Payable Period]
    K -->|No| N[Try Invoice Period]
    
    M --> O{Period Found?}
    N --> O
    
    O -->|Yes| L
    O -->|No| P[No Match - Manual Required]
    
    L --> Q{Template Matches?}
    Q -->|Yes| R[Create period_bill_match]
    Q -->|No| P
    
    R --> S[Match Complete]
    P --> T[Unmatched Bill]---

## Billing Schedule & Period Architecture

### Schedule Types and Relationships

graph TD
    A[BILLING_SCHEDULES] --> B[Bill Input Schedules]
    A --> C[Invoice Output Schedules]
    A --> D[Payable Output Schedules]
    
    B --> E[Expected Bill Arrival]
    B --> F[Email Filter]
    B --> G[Extraction Rule]
    
    C --> H[Wait for Bills?]
    C --> I[Dependency Logic]
    C --> J[Depends on Bill Schedules]
    
    D --> K[Wait for Bills?]
    D --> L[Dependency Logic]
    D --> M[Depends on Bill Schedules]
    
    B --> N[BILLING_SCHEDULE_STATUS]
    C --> N
    D --> N
    
    N --> O[Track Compliance]
    N --> P[Link to Bills/Invoices/Payables]### Billing Period Generation Flow

graph TD
    A[Lease Agreement Uploaded] --> B[Extract Dates]
    B --> C[Generate Invoice Periods]
    C --> D[Create Billing Periods]
    D --> E[Link to Lease Agreement]
    D --> F[Link to Rental Invoice Template]
    D --> G[Set Expected Bill Types]
    
    H[Payable Template Created] --> I[Generate Payable Periods]
    I --> J[Create Billing Periods]
    J --> K[Link to Payable Template]
    J --> L[Set Scheduled Payment Day]
    
    M[Manual Period Creation] --> N[Create Billing Period]
    N --> O[Set Period Type]
    O --> P[Link to Template]
    
    D --> Q[BILLING_PERIODS Table]
    J --> Q
    N --> Q
    
    Q --> R[Period Bill Matching]
    R --> S[PERIOD_BILL_MATCHES]### Period Dependency Flow

graph TD
    A[Bill Processed] --> B{Has billingYear/billingMonth?}
    B -->|Yes| C[Find Matching Period]
    B -->|No| D[Manual Match Required]
    
    C --> E{Period Type?}
    E -->|Invoice| F[Check Invoice Template Dependencies]
    E -->|Payable| G[Check Payable Template Dependencies]
    
    F --> H{All Bill Templates Present?}
    G --> H
    
    H -->|Yes| I[Create period_bill_match]
    H -->|No| J[Template Validation Failed]
    
    I --> K[Bill Matched to Period]
    J --> L[Unmatched - Dependencies Not Met]
    
    K --> M[Check if Period Ready]
    M --> N{All Dependencies Met?}
    N -->|Yes| O[Generate Invoice/Payable Instance]
    N -->|No| P[Wait for More Bills]---

## Template Dependencies

### Template Dependency Graph

graph TD
    A[BILL_TEMPLATES] --> B[Defines Expected Bill Types]
    B --> C[BILL_ARRIVAL_SCHEDULES]
    C --> D[Expected Day of Month]
    
    E[PAYABLE_TEMPLATES] --> F[dependsOnBillTemplateIds]
    F --> A
    E --> G[PAYABLE_SCHEDULES]
    G --> H[Scheduled Day of Month]
    E --> I[PAYABLE_INSTANCES]
    
    J[RENTAL_INVOICE_TEMPLATES] --> K[dependsOnBillTemplateIds]
    K --> A
    J --> L[Generation Day of Month]
    J --> M[RENTAL_INVOICE_INSTANCES]
    
    N[BILLS] --> O[Linked to BILL_TEMPLATES]
    O --> A
    
    I --> P{All Bill Templates Present?}
    M --> P
    P -->|Yes| Q[Generate Instance]
    P -->|No| R[Wait for Bills]### Template Dependency Validation
aid
sequenceDiagram
    participant System
    participant PayableTemplate
    participant BillTemplate
    participant Bills
    participant DependencyChecker
    participant InstanceGenerator

    System->>PayableTemplate: Get Payable Template
    PayableTemplate-->>System: dependsOnBillTemplateIds: [id1, id2, id3]
    
    System->>DependencyChecker: checkPayableDependencies(templateId, year, month)
    DependencyChecker->>Bills: Find bills for template id1
    Bills-->>DependencyChecker: Bill Found
    DependencyChecker->>Bills: Find bills for template id2
    Bills-->>DependencyChecker: Bill Found
    DependencyChecker->>Bills: Find bills for template id3
    Bills-->>DependencyChecker: No Bill Found
    
    DependencyChecker-->>System: {allMet: false, missingBillTemplates: [id3]}
    
    Note over System: Wait for bill with template id3
    
    System->>Bills: Bill with template id3 processed
    System->>DependencyChecker: checkPayableDependencies(templateId, year, month)
    DependencyChecker->>Bills: Check all templates
    Bills-->>DependencyChecker: All Bills Found
    DependencyChecker-->>System: {allMet: true, missingBillTemplates: []}
    
    System->>InstanceGenerator: Generate Payable Instance
    InstanceGenerator->>InstanceGenerator: Create payable_instance
    InstanceGenerator-->>System: Instance Created---

## Email Processing Flow

### Email Webhook Processing
rmaid
sequenceDiagram
    participant Postmark
    participant WebhookAPI
    participant EmailProcessor
    participant EmailAnalyzer
    participant RuleMatcher
    participant PDFDownloader
    participant BillCreator
    participant PDFProcessor

    Postmark->>WebhookAPI: POST /api/webhooks/postmark
    WebhookAPI->>EmailProcessor: processEmailWebhookAction()
    
    EmailProcessor->>EmailProcessor: Parse Email (from, subject)
    EmailProcessor->>EmailProcessor: Create email_processor record
    
    EmailProcessor->>RuleMatcher: Match Email to Rules
    RuleMatcher->>RuleMatcher: Find Active email_forward Rules
    RuleMatcher->>RuleMatcher: Match by emailFilter
    RuleMatcher-->>EmailProcessor: Matched Rules Found
    
    EmailProcessor->>EmailAnalyzer: analyzeEmailForDocuments()
    EmailAnalyzer->>EmailAnalyzer: Check Attachments
    EmailAnalyzer->>EmailAnalyzer: Extract Links
    EmailAnalyzer-->>EmailProcessor: {source: "attachments"|"links"|"both"}
    
    alt Attachments Found
        EmailProcessor->>EmailProcessor: Extract PDF Attachments
    else Links Found
        EmailProcessor->>PDFDownloader: Download PDF from Links
        PDFDownloader-->>EmailProcessor: PDF Buffer
    end
    
    EmailProcessor->>BillCreator: createBillAction()
    BillCreator->>BillCreator: Create Bill Record
    BillCreator-->>EmailProcessor: Bill Created
    
    EmailProcessor->>PDFProcessor: processPDFWithDualPurposeExtraction()
    PDFProcessor->>PDFProcessor: Extract Invoice Data
    PDFProcessor->>PDFProcessor: Extract Payment Data
    PDFProcessor-->>EmailProcessor: Extraction Complete
    
    EmailProcessor->>EmailProcessor: Update Bill Status
    EmailProcessor->>EmailProcessor: Auto-Match to Period
    EmailProcessor-->>WebhookAPI: Processing Complete
### Email to Bill Creation Flow
aid
graph TD
    A[Email Received] --> B[Parse Email Metadata]
    B --> C[Match to Extraction Rules]
    C --> D{Rules Found?}
    D -->|No| E[Skip Processing]
    D -->|Yes| F[Analyze Email for Documents]
    
    F --> G{Document Source?}
    G -->|Attachments| H[Extract PDF Attachments]
    G -->|Links| I[Download PDF from Links]
    G -->|Both| J[AI Decision: Use Attachments/Links]
    J --> H
    J --> I
    
    H --> K[Create Bill Record]
    I --> K
    
    K --> L[Set Property from Rule]
    K --> M[Set Bill Type from Rule]
    K --> N[Set Source: email]
    K --> O[Set Status: pending]
    
    K --> P[Process PDF]
    P --> Q[Extract Data]
    Q --> R[Update Bill Status]
    R --> S[Auto-Match to Period]
    S --> T[Link to Template]---

## Functional Dependencies

### Core Functional Dependencies
d
graph TD
    A[User Onboarding] --> B[Property Creation]
    B --> C[Extraction Rule Creation]
    C --> D[Bill Template Creation]
    D --> E[Bill Processing]
    
    B --> F[Tenant Creation]
    F --> G[Lease Agreement Upload]
    G --> H[Billing Period Generation]
    
    D --> I[Payable Template Creation]
    D --> J[Rental Invoice Template Creation]
    
    I --> K[Payable Schedule Creation]
    J --> L[Invoice Schedule Creation]
    
    E --> M[Bill to Period Matching]
    M --> N{Dependencies Met?}
    N -->|Yes| O[Generate Invoice/Payable Instance]
    N -->|No| P[Wait for More Bills]
    
    H --> Q[Period Bill Matching]
    Q --> M
    
    K --> R[Payable Instance Generation]
    L --> S[Invoice Instance Generation]
    
    O --> R
    O --> S
### Dependency Chain for Invoice Generation

graph LR
    A[Lease Agreement] --> B[Invoice Periods Generated]
    B --> C[Rental Invoice Template]
    C --> D[dependsOnBillTemplateIds]
    D --> E[Bill Templates]
    E --> F[Bills with Templates]
    F --> G{All Bills Present?}
    G -->|Yes| H[Generate Invoice Instance]
    G -->|No| I[Wait]
    
    J[Generation Day] --> H
    K[Schedule Status] --> H### Dependency Chain for Payable Generation

graph LR
    A[Payable Template] --> B[dependsOnBillTemplateIds]
    B --> C[Bill Templates]
    C --> D[Bills with Templates]
    D --> E{All Bills Present?}
    E -->|Yes| F[Generate Payable Instance]
    E -->|No| G[Wait]
    
    H[Scheduled Day] --> F
    I[Payable Schedule] --> F---

## Data Flow Diagrams

### Complete Data Flow: User to Invoice

graph TD
    A[User Signs Up] --> B[User Profile Created]
    B --> C[Landlord/Rental Agent Created]
    C --> D[Property Created]
    D --> E[Tenant Created]
    E --> F[Lease Agreement Uploaded]
    F --> G[Invoice Periods Generated]
    
    D --> H[Extraction Rule Created]
    D --> I[Bill Template Created]
    D --> J[Payable Template Created]
    D --> K[Rental Invoice Template Created]
    
    L[Email Received] --> M[Bill Created]
    N[Manual Upload] --> M
    
    M --> O[Bill Processed]
    O --> P[Extraction Data Stored]
    P --> Q[Bill Linked to Template]
    Q --> R[Bill Matched to Period]
    
    R --> S{All Dependencies Met?}
    S -->|Yes| T[Invoice Instance Generated]
    S -->|No| U[Wait]
    
    G --> V[Period Ready]
    K --> V
    V --> S### Bill Processing Data Flow

graph LR
    A[Bill PDF] --> B[PDF Processing]
    B --> C[Invoice Extraction]
    B --> D[Payment Extraction]
    
    C --> E[invoiceExtractionData]
    D --> F[paymentExtractionData]
    
    E --> G[Variable Costs]
    F --> H[Payable Data]
    
    G --> I[Cost Allocations]
    I --> J[Tenant Invoices]
    
    H --> K[Payable Instances]---

## API Architecture

### API Route Structure

graph TD
    A[/api] --> B[/bills]
    A --> C[/billing-schedule]
    A --> D[/lease-agreements]
    A --> E[/rules]
    A --> F[/webhooks]
    A --> G[/cron]
    
    B --> B1[/upload]
    B --> B2[/[billId]]
    B --> B3[/rules]
    B --> B4[/backfill-templates]
    
    B2 --> B2a[/status]
    B2 --> B2b[/matches]
    
    C --> C1[/periods]
    C --> C2[/match-bill]
    C --> C3[/unmatched-bills]
    C --> C4[/bills/[billId]/matches]
    
    C1 --> C1a[/[periodId]/bills]
    
    D --> D1[/upload]
    D --> D2[/[leaseId]/dates]
    D --> D3[/extract-tenant]
    
    E --> E1[/[ruleId]]
    E1 --> E1a[/samples/upload]
    E1 --> E1b[/test]
    
    F --> F1[/postmark]
    
    G --> G1[/generate-payable-periods]### API Dependency Map
ermaid
graph TD
    A[Client] --> B[API Routes]
    B --> C[Server Actions]
    C --> D[Queries]
    C --> E[Lib Functions]
    D --> F[Database]
    E --> F
    E --> G[External Services]
    
    G --> G1[OpenAI]
    G --> G2[Supabase Storage]
    G --> G3[Postmark]
    
    C --> H[Business Logic]
    H --> I[Validation]
    H --> J[Processing]
    H --> K[Generation]---

## Key Architectural Patterns

### 1. Template-Instance Pattern
- **Templates** define structure and dependencies
- **Instances** are generated when dependencies are met
- **Schedules** define when instances should be generated

### 2. Dependency-Driven Generation
- Invoices/Payables generated only when all required bills are present
- Dependency checking happens at multiple levels:
  - Template level (bill template dependencies)
  - Schedule level (schedule dependencies)
  - Period level (period bill matching)

### 3. Dual-Purpose Extraction
- Single bill can produce both invoice and payment data
- Rules can extract for one or both purposes
- Separate extraction configs for each purpose

### 4. Period-Based Organization
- All billing activity organized by year/month periods
- Periods generated from lease agreements or templates
- Bills matched to periods based on billing year/month

### 5. Schedule Compliance Tracking
- Tracks expected vs actual dates for bills/invoices/payables
- Status: pending, on_time, late, missed, blocked
- Dependency blocking prevents premature generation

---

## Potential Gaps & Logical Fallacies

### 1. **Bill Template Dependency Validation**
- **Issue**: Bills can be matched to periods without validating template dependencies
- **Current**: Validation exists in `canBillMatchToPeriod` but may not cover all cases
- **Recommendation**: Ensure all bill-to-period matches validate template dependencies

### 2. **Schedule Status Updates**
- **Issue**: Schedule status may not update when bills are processed
- **Current**: Status updates happen in bill processing, but may miss edge cases
- **Recommendation**: Add cron job to periodically check and update schedule statuses

### 3. **Period Generation Gaps**
- **Issue**: Periods may not be generated for all required templates
- **Current**: Periods generated from leases and templates, but may miss manual scenarios
- **Recommendation**: Add validation to ensure all active templates have periods

### 4. **Dependency Circular References**
- **Issue**: No validation prevents circular dependencies between schedules
- **Current**: Dependency checking doesn't validate for cycles
- **Recommendation**: Add cycle detection in dependency validation

### 5. **Bill Template Linking**
- **Issue**: Bills may not always link to templates correctly
- **Current**: Linking happens after processing, but may fail silently
- **Recommendation**: Add validation and retry logic for template linking

### 6. **Email Processing Error Handling**
- **Issue**: Email processing failures may not be properly tracked
- **Current**: Errors logged but may not surface to users
- **Recommendation**: Add error tracking and user notifications

### 7. **Period Bill Matching Logic**
- **Issue**: Bills can match to multiple periods, but validation may be inconsistent
- **Current**: Matching allows multiple matches, but validation may not cover all cases
- **Recommendation**: Ensure consistent validation across all matching scenarios

---

## Maintenance Recommendations

1. **Add Comprehensive Logging**: Track all dependency checks and generation triggers
2. **Implement Health Checks**: Monitor schedule compliance and dependency status
3. **Add Data Validation**: Ensure data integrity at all levels
4. **Create Audit Trails**: Track all changes to critical entities
5. **Implement Retry Logic**: Add retry mechanisms for failed operations
6. **Add Monitoring**: Set up alerts for critical failures
7. **Document Edge Cases**: Document all known edge cases and their handling

---

## Conclusion

This architecture documentation provides a comprehensive view of the PropNxt.AI system, including:
- User creation and onboarding flows
- Complete database table dependencies
- Bill processing workflows
- Billing schedule and period architecture
- Template dependency systems
- Email processing flows
- Functional dependencies
- API structure

Use this documentation to:
- Understand system architecture
- Identify dependencies
- Plan new features
- Debug issues
- Onboard new developers
- Maintain and update the codebase

For specific implementation details, refer to the individual schema files, actions, and API routes.