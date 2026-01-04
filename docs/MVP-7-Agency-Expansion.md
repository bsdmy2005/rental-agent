## MVP 7: Agency Expansion & Contractor Ecosystem

### Goal
Extend the platform from core rental operations into a broader **agency operations hub**, covering inspections, defects, contractor management, and early support for body corporates.

### Primary Personas

#### Persona 1: Rental Agency Property Manager
- Capture and manage in-going and out-going inspections for rentals.
- Record and track defects and maintenance items across properties.
- Coordinate quotes and work with contractors.
- Keep an auditable history of inspections, defects, work orders, and communications.

#### Persona 2: Contractor / Service Provider
- Receive structured job requests from agencies.
- Accept/decline work, provide quotes, and upload completion proof.
- Build a reputation with ratings, reviews, and regional coverage.

#### Persona 3: Body Corporate / Portfolio Manager (Future-Facing)
- View issues and maintenance across multiple units and common areas.
- Approve larger jobs and track spend against budgets or levy income.
- Access a consolidated history of contractor performance on the building/complex.

---

### Core Themes

- **Inspections & Intake**: Digitise rental inspections and intake checklists.
- **Defect Lifecycle Management**: Turn inspection findings into trackable defects and work items.
- **Contractor Ecosystem**: Allow agencies to manage and evaluate contractors across regions and trade types.
- **Body Corporate Support**: Lay groundwork to support common-area and multi-owner structures.

---

### 1. Inspection & Intake Capture

#### 1.1 Inspection Types
- **Ingoing inspection**: Before tenant moves in.
- **Outgoing inspection**: When tenant moves out.
- **Routine inspection**: Periodic checks during tenancy.
- **Special inspection**: Ad-hoc (e.g. reported issue, insurance claim, body corporate requirement).

#### 1.2 Inspection Templates & Checklists
- Define **inspection templates** per:
  - Property type (apartment, freestanding house, commercial unit).
  - Area/room (kitchen, bathroom, bedroom, exterior, parking).
  - Body corporate common areas (lobbies, lifts, gardens, pools, gates).
- Support:
  - Pre-defined checklist items (e.g. “Walls”, “Ceiling”, “Doors”, “Electrical outlets”).
  - Condition scales (e.g. excellent / good / fair / poor, or numeric 1–5).
  - Flags for **safety-critical** items.
  - Notes and photo attachments per checklist item.

#### 1.3 Data Capture Modes
- **Manual digital capture**:
  - In-browser inspection forms optimised for tablet/mobile use.
  - Ability to work room-by-room with quick navigation.
  - Offline-friendly capture (future) for poor connectivity scenarios.
- **Scan & digitise paper sheets**:
  - Upload scanned inspection or intake sheets (PDF, images).
  - Associate uploaded documents with:
    - Property.
    - Tenant/lease.
    - Inspection type and date.
  - Future: Apply basic extraction / tagging (e.g. OCR key fields like dates, signatures).

#### 1.4 Document Storage & Versioning
- Store **all inspection-related documents**:
  - Original scans.
  - Generated digital reports (PDF).
  - Photos and attachments.
- Maintain:
  - Versions per inspection (e.g. initial capture, amended version after disputes).
  - Clear audit trail: who captured, who edited, timestamps.

#### 1.5 Scheduling Inspections
- Allow users to:
  - Schedule upcoming inspections tied to:
    - Lease start/end dates.
    - Routine intervals (e.g. every 3/6/12 months).
  - Assign responsible agents/inspectors.
  - Set reminders and notifications for:
    - Agents.
    - Tenants (where appropriate).
    - Owners/body corporates (for larger works or shared areas).

---

### 2. Defect & Maintenance Management

#### 2.1 Defect Capture
- From inspections:
  - Convert selected checklist items into **defect records**.
  - Auto-link defect to:
    - Property.
    - Inspection.
    - Area/room.
  - Pull through photos, notes, and severity rating.
- From ad-hoc reports:
  - Allow agencies or tenants (future) to log new defects:
    - Description, category (plumbing, electrical, structural, cosmetic, etc.).
    - Location in property.
    - Priority (low/medium/high/urgent).
    - Attach photos or documents.

#### 2.2 Defect Status Workflow
- Defect lifecycle:
  - **New** → **Triaged** → **Quote Requested** → **Quote Approved** → **In Progress** → **Completed** → **Closed / Disputed**.
- Support:
  - Assignment to internal team member or contractor.
  - Due dates and SLAs per severity.
  - Internal comments vs. external/tenant-facing comments.

#### 2.3 Work Orders
- Group one or more defects into a **work order**:
  - Per property.
  - Per contractor visit.
- Work order includes:
  - Scope of work.
  - Preferred date/time windows.
  - Estimated cost ranges (if known).
  - Links to original defects and inspections.

#### 2.4 Audit Trail & Evidence
- For each defect/work order:
  - Maintain full history of:
    - Status changes.
    - Assigned contractor changes.
    - Comments and internal notes.
    - Uploaded photos before/after.
  - Generate a **completion report** (PDF) for owners or body corporates:
    - Summary of issue, actions taken, costs, and contractor details.

---

### 3. Contractor & Vendor Management

#### 3.1 Contractor Profiles
- Core fields:
  - Company name and contact details.
  - Trade/specialisation (plumber, electrician, handyman, painter, gardener, security, pest control, glazing, locksmith, etc.).
  - Regions serviced (suburbs, cities, provinces) with **granular neighbourhood mapping**.
  - Property types supported (apartments, freehold houses, commercial, industrial, body corporate common areas).
  - Availability preferences (working hours, emergency call-out support).
  - Pricing model (call-out fee, hourly rate, per-job, etc.).
  - Compliance docs (insurance, certifications, registrations) with expiry tracking.
  - Preferred / banned status per agency or portfolio.

#### 3.2 Ratings & Reviews
- After a job is completed:
  - Allow the agency user to rate:
    - Quality of work.
    - Timeliness.
    - Communication.
    - Value for money.
  - Capture a short written review.
- Aggregate metrics:
  - Overall rating per contractor.
  - Number of jobs completed.
  - On-time completion rate.
  - Dispute or callback rate.

#### 3.3 Regional Reach & Matching
- When creating a work order:
  - Suggest contractors based on:
    - Property location.
    - Required trade.
    - Historical performance.
    - Property type and any specialisation tags (e.g. “high-rise access”, “heritage building”, “body corporate common areas”).
  - Allow agencies to maintain a **preferred contractor list** per:
    - Property.
    - Owner.
    - Complex/body corporate.
  - Support **fallback rules** (e.g. if no preferred contractor, suggest top-rated providers in the neighbourhood).

#### 3.4 Communication & Job Handling
- Communication channels:
  - Email notifications to contractors with job details.
  - Future: Portal or lightweight contractor view for:
    - Accept/decline jobs.
    - Submit quotes.
    - Upload invoices and completion photos.
- Track:
  - Time from job request to response.
  - Accepted vs. declined jobs.
  - Reasons for decline (optional).

#### 3.5 External Service Provider Integrations (Future-Friendly)
- Ability to integrate with:
  - External contractor directories/marketplaces (e.g. regional platforms) via API.
  - Insurance preferred-provider networks (where applicable).
- Requirements:
  - Map external provider categories and regions to internal **trades, areas, and property types**.
  - Normalise external ratings into internal rating model.
  - Store external provider IDs for deduplication (avoid duplicates when a contractor exists both locally and from an external feed).

---

### 4. Body Corporate & Complex Support (Foundations)

> Note: This is a **forward-looking** area; initial MVP should focus on fundamentals that won’t need rewriting later.

#### 4.1 Entity Structure
- Model body corporates/complexes as a distinct entity type:
  - Name, registration details.
  - Linked properties/units.
  - Trustees/committee members and managing agents.
  - Common areas list (pools, gates, lifts, gardens, parking lots, hallways).

#### 4.2 Common Area Defects
- Allow defects to be tagged as:
  - **Unit-specific**: linked to a particular property/unit.
  - **Common-area**: linked to a complex/common area.
- For common-area defects:
  - Visibility for body corporate / trustees (future roles).
  - Group multiple related reports into a single tracked issue.

#### 4.3 Approvals & Oversight (Future)
- For higher-cost or complex jobs:
  - Record required approvals (e.g. trustees, owners).
  - Track who approved/declined and when.
  - Keep a history of decisions for audit and disputes.

#### 4.4 Reporting (Foundational Requirements)
- Support **reporting views** that can be layered on later:
  - Defects and maintenance spend per:
    - Complex/body corporate.
    - Unit.
    - Contractor.
  - Time-to-resolution metrics.
  - Volume of issues by category (plumbing, electrical, etc.).

---

### 5. AI-Assisted Quote Comparison & Owner Approval Workflow

#### 5.1 Multi-Quote Collection
- From a defect or work order, the agent can:
  - Request quotes from multiple contractors (internal + external-integrated).
  - Track **quote request status** per contractor (requested, responded, declined, timed out).
  - Store structured quote data:
    - Total amount, breakdown (labour, materials, call-out), estimated time to complete.
    - Validity period and terms.
    - Attachments (PDF quotes, documents).

#### 5.2 AI Quote Normalisation & Comparison
- AI agent capabilities:
  - Parse incoming quotes (email bodies and attached PDFs where possible) into structured fields.
  - Normalise different quote formats to a standard internal model.
  - Compare quotes on:
    - Price, estimated completion time, warranty terms.
    - Contractor rating history (quality, timeliness, disputes).
    - Regional proximity and prior experience on this specific property/complex.
  - Flag outliers (suspiciously high/low quotes, missing information).

#### 5.3 Recommendation & Suggestions
- AI generates:
  - A **summary comparison** of all quotes in plain language.
  - A recommended option (or short list) based on:
    - Cost vs. quality.
    - Urgency (e.g. emergency vs. planned maintenance).
    - Owner or body corporate preferences (e.g. always use green products, local vendors).
  - Suggestions such as:
    - Requesting clarification on certain line items.
    - Asking for an updated quote (e.g. missing labour breakdown).
    - Recommending to get additional quotes if variance between quotes is too large or number of quotes is too low.

#### 5.4 Owner / Body Corporate Communication & Approval
- Email/notification flows:
  - Send owners or trustees a **summarised email** with:
    - Short explanation of the issue.
    - High-level comparison of received quotes.
    - Clear recommended option(s).
    - Simple approval actions (e.g. approve recommended, choose alternative, request more quotes).
  - Option to surface a richer web view in the portal with:
    - Full quote details.
    - Contractor profiles and ratings.
    - Historical jobs performed at that property/complex.
- Capture:
  - Owner/committee decision, timestamp, and any comments.
  - Audit trail of what information was shown at approval time.

#### 5.5 Job Dispatch Automation
- Once a quote is approved:
  - Automatically convert the chosen quote into an **authorised work order**.
  - Notify the selected contractor with:
    - Scope of work, agreed price (or pricing structure), and deadlines.
    - Any access instructions, tenant contact details (where appropriate), and special conditions.
  - Update defect/work order status accordingly (e.g. from “Quote Approved” → “In Progress”).
  - Prepare downstream data for:
    - Payment creation (MVP 3).
    - Cost allocation and invoicing (MVP 2).

---

### 6. Scheduling, Reminders & Notifications

#### 6.1 Scheduling Engine Extensions
- Extend existing scheduling concepts to:
  - Inspections (ingoing/outgoing/routine).
  - Work orders and contractor visits.
  - Body corporate recurring checks (e.g. fire equipment, lifts, gates).

#### 6.2 Reminder Logic
- Configurable reminders:
  - Upcoming inspection reminders (e.g. 7 days and 1 day before).
  - Work order due date reminders.
  - Follow-up reminders if defects remain open for too long.
- Notification channels:
  - Email to agents, contractors, owners, and (later) tenants.

---

### 7. Integrations & Links to Existing MVPs

#### 7.1 Links to Billing & Invoicing (MVP 2)
- For certain defects/work orders:
  - Capture **cost allocation**:
    - Owner vs. tenant vs. body corporate.
    - Recoverable vs. non-recoverable expenses.
  - Trigger creation of:
    - Tenant charge line items (e.g. damage charges on outgoing inspection).
    - Owner statements (future).

#### 7.2 Links to Payment Execution (MVP 3)
- For contractor jobs:
  - Store invoice and payment details ready for:
    - Payment creation.
    - Reconciliation against work orders and defects.

---

### 8. Data & Schema – High-Level Concepts

> This section is conceptual; detailed schemas can be designed when implementing.

- **Inspection**:
  - Links: property, lease/tenant (where applicable), inspector/agent, inspection type, date/time.
  - Contains: structured checklist data + attachments + status.
- **Inspection Template**:
  - Defines checklist sections, items, scales, and flags.
- **Defect**:
  - Links: property, inspection (optional), area/room, createdBy, assignedTo, contractor (optional).
  - Contains: description, category, severity, status, dates, attachments.
- **Work Order**:
  - Links: property, one or more defects, contractor, scheduled dates.
  - Contains: scope of work, cost estimates, final costs, notes.
- **Contractor**:
  - Links: regions, trades, jobs completed, ratings.
  - Contains: profile, compliance docs, status (active/inactive).
- **Body Corporate / Complex**:
  - Links: properties/units, common areas, trustees/managers, defects and work orders.

---

### 9. Success Criteria (Expansion MVP)

- Agencies can **digitally capture inspections** (ingoing, outgoing, routine) and attach photos/documents.
- Defects can be **logged, tracked, and grouped into work orders** with clear statuses and audit trails.
- Agencies can **manage contractors** with profiles, regions, and basic ratings/reviews.
- Service providers are **categorised by trade, region, neighbourhood, and property type**, enabling accurate matching.
- It is possible to **associate costs** from contractor work to owners/tenants/body corporates for later billing/payment flows.
- The system can **collect, normalise, and compare multiple quotes** for a job and send summarised recommendations to owners/trustees for approval, then dispatch the chosen provider.
- Core data structures exist for **body corporates and common areas**, without overcommitting to complex workflows yet.


