# Testing Guide: Tenant Portal & Expense Management Features

This guide provides all front-end paths and testing steps for the newly implemented features.

## Table of Contents
1. [Expense Management](#expense-management)
2. [Tenant Incident Logging](#tenant-incident-logging)
3. [Admin Incident Management](#admin-incident-management)
4. [Service Provider Management](#service-provider-management)

---

## Expense Management

### User Access
- **Landlords**: Full access
- **Rental Agents**: Full access
- **Tenants**: No access (expenses are landlord/agent managed)

### Front-End Paths

#### 1. Property Expenses List Page
**Path**: `/dashboard/properties/[propertyId]/expenses`

**How to Access**:
- Navigate to a property detail page
- Click on "Expenses" in the property menu/navigation
- Or go directly: `/dashboard/properties/{property-id}/expenses`

**Features to Test**:
- ✅ View list of all expenses for the property
- ✅ See expense details: date, description, amount, category, tax year
- ✅ Navigate to expense detail page
- ✅ Navigate to edit expense page
- ✅ Navigate to add new expense page
- ✅ Switch between tabs: Expenses, Depreciation, Tax Report

#### 2. Add New Expense
**Path**: `/dashboard/properties/[propertyId]/expenses/new`

**How to Access**:
- From expenses list page, click "Add Expense" button
- Or go directly: `/dashboard/properties/{property-id}/expenses/new`

**Features to Test**:
- ✅ Select expense category (standard or custom)
- ✅ Enter amount, description, date
- ✅ Set payment method
- ✅ Mark as tax deductible
- ✅ Set tax year
- ✅ Upload receipts/invoices (multiple files)
- ✅ Submit and verify expense appears in list

#### 3. Expense Detail Page
**Path**: `/dashboard/properties/[propertyId]/expenses/[expenseId]`

**How to Access**:
- Click on an expense from the expenses list
- Or go directly: `/dashboard/properties/{property-id}/expenses/{expense-id}`

**Features to Test**:
- ✅ View full expense details
- ✅ See category information
- ✅ View uploaded receipts/invoices
- ✅ See who paid for the expense
- ✅ Navigate to edit page

#### 4. Edit Expense
**Path**: `/dashboard/properties/[propertyId]/expenses/[expenseId]/edit`

**How to Access**:
- From expense detail page, click "Edit" button
- Or go directly: `/dashboard/properties/{property-id}/expenses/{expense-id}/edit`

**Features to Test**:
- ✅ Update expense details
- ✅ Change category, amount, description
- ✅ Modify tax year and deductible status
- ✅ Save changes and verify updates

#### 5. Depreciation Calculator
**Path**: `/dashboard/properties/[propertyId]/expenses` → "Depreciation" tab

**How to Access**:
- From expenses page, click "Depreciation" tab

**Features to Test**:
- ✅ Enter asset name and type
- ✅ Set purchase date and cost
- ✅ Set depreciation rate and method (straight line or declining balance)
- ✅ Set useful life in years
- ✅ Set tax year
- ✅ Calculate depreciation
- ✅ Verify depreciation record is created
- ✅ See calculated current value

#### 6. Tax Report Generator
**Path**: `/dashboard/properties/[propertyId]/expenses` → "Tax Report" tab

**How to Access**:
- From expenses page, click "Tax Report" tab

**Features to Test**:
- ✅ Select tax year
- ✅ Generate report
- ✅ View expenses grouped by category
- ✅ View depreciation records
- ✅ See total expenses and depreciation
- ✅ Export report as CSV
- ✅ Verify CSV contains correct data

---

## Tenant Incident Logging

### User Access
- **Tenants**: Full access to their own incidents
- **Landlords**: Can view incidents for their properties
- **Rental Agents**: Can view and manage incidents for managed properties

### Front-End Paths

#### 1. Tenant Incidents List
**Path**: `/tenant/incidents`

**How to Access**:
- Navigate to tenant portal
- Click on "Incidents" in navigation
- Or go directly: `/tenant/incidents`

**Features to Test**:
- ✅ View all incidents reported by the tenant
- ✅ See incident status, priority, and date
- ✅ Filter/search incidents (if implemented)
- ✅ Navigate to incident detail page
- ✅ Navigate to create new incident page

#### 2. Create New Incident (Tenant)
**Path**: `/tenant/incidents/new`

**How to Access**:
- From incidents list, click "Report New Incident" or "Add Incident"
- Or go directly: `/tenant/incidents/new`

**Features to Test**:
- ✅ Select property (if tenant has multiple properties)
- ✅ Enter incident title
- ✅ Enter detailed description
- ✅ Set priority (low, medium, high, urgent)
- ✅ Upload photos (multiple images)
- ✅ Submit incident
- ✅ Verify incident appears in list with "reported" status

#### 3. Tenant Incident Detail Page
**Path**: `/tenant/incidents/[id]`

**How to Access**:
- Click on an incident from the incidents list
- Or go directly: `/tenant/incidents/{incident-id}`

**Features to Test**:
- ✅ View full incident details
- ✅ See current status and priority
- ✅ View status history timeline
- ✅ See who changed status and when
- ✅ View uploaded photos
- ✅ See property information
- ✅ See assigned agent/landlord (if assigned)

---

## Admin Incident Management

### User Access
- **Landlords**: Can manage incidents for their properties
- **Rental Agents**: Can manage incidents for properties they manage

### Front-End Paths

#### 1. Property Incidents List (Admin)
**Path**: `/dashboard/properties/[propertyId]/incidents`

**How to Access**:
- Navigate to a property detail page
- Click on "Incidents" in the property menu
- Or go directly: `/dashboard/properties/{property-id}/incidents`

**Features to Test**:
- ✅ View all incidents for the property
- ✅ See incident status, priority, tenant name
- ✅ Filter by status or priority (if implemented)
- ✅ Navigate to incident detail/management page

#### 2. Incident Management Page (Admin)
**Path**: `/dashboard/properties/[propertyId]/incidents/[id]`

**How to Access**:
- Click on an incident from the property incidents list
- Or go directly: `/dashboard/properties/{property-id}/incidents/{incident-id}`

**Features to Test**:
- ✅ View full incident details
- ✅ See tenant information
- ✅ View property address
- ✅ Update incident status (reported → assigned → in_progress → awaiting_quote → awaiting_approval → resolved → closed)
- ✅ Add notes when changing status
- ✅ Assign incident to yourself
- ✅ Request quotes from service providers (when status is assigned/in_progress)
- ✅ View received quotes
- ✅ Approve/reject quotes
- ✅ View incident photos
- ✅ View status history

#### 3. Request Quote from Service Provider
**Path**: `/dashboard/properties/[propertyId]/incidents/[id]` → Quote Request Form

**How to Access**:
- From incident management page, scroll to "Request Quote" section
- Only visible when incident status is "assigned" or "in_progress"

**Features to Test**:
- ✅ Select service provider from dropdown (filtered by property area)
- ✅ Set quote due date (optional)
- ✅ Add additional notes for service provider
- ✅ Submit quote request
- ✅ Verify email is sent to service provider
- ✅ Verify quote request appears in incident quotes section

---

## Service Provider Management

### User Access
- **Landlords**: Full access
- **Rental Agents**: Full access
- **Tenants**: No access

### Front-End Paths

#### 1. Service Providers Directory
**Path**: `/dashboard/service-providers`

**How to Access**:
- Navigate to dashboard
- Click on "Service Providers" in navigation
- Or go directly: `/dashboard/service-providers`

**Features to Test**:
- ✅ View list of all service providers
- ✅ See provider name, specialization, contact info
- ✅ Filter by area/specialization (if implemented)
- ✅ Navigate to provider detail page
- ✅ Navigate to add new provider page

#### 2. Add New Service Provider
**Path**: `/dashboard/service-providers/new`

**How to Access**:
- From service providers list, click "Add Provider" or "New Provider"
- Or go directly: `/dashboard/service-providers/new`

**Features to Test**:
- ✅ Enter contact name (required)
- ✅ Enter business name (optional)
- ✅ Enter email (required)
- ✅ Enter phone and WhatsApp number (optional)
- ✅ Select specialization
- ✅ Enter license number (optional)
- ✅ Enter insurance information (optional)
- ✅ Add service areas (suburb + province)
- ✅ Add multiple service areas
- ✅ Remove service areas
- ✅ Submit and verify provider appears in list

#### 3. Service Provider Detail Page
**Path**: `/dashboard/service-providers/[id]`

**How to Access**:
- Click on a service provider from the list
- Or go directly: `/dashboard/service-providers/{provider-id}`

**Features to Test**:
- ✅ View all provider contact information
- ✅ See specialization and status
- ✅ View service areas
- ✅ See license and insurance info
- ✅ Navigate to edit page (if implemented)
- ✅ Contact provider via email/phone links

---

## Testing Checklist

### Prerequisites
1. ✅ Set up test user accounts:
   - Landlord account
   - Rental Agent account
   - Tenant account
2. ✅ Create test properties
3. ✅ Assign tenant to property
4. ✅ Set up Postmark email (for quote requests)

### Expense Management Testing
- [ ] Create expense with receipt upload
- [ ] Edit expense
- [ ] View expense details
- [ ] Calculate depreciation for an asset
- [ ] Generate tax report for a tax year
- [ ] Export tax report as CSV
- [ ] Verify expenses grouped by category in report

### Incident Management Testing (Tenant)
- [ ] Tenant logs new incident with photos
- [ ] Tenant views their incident list
- [ ] Tenant views incident detail with status history
- [ ] Verify incident appears in admin view

### Incident Management Testing (Admin)
- [ ] Admin views property incidents list
- [ ] Admin assigns incident to themselves
- [ ] Admin updates incident status
- [ ] Admin requests quote from service provider
- [ ] Verify email sent to service provider
- [ ] Admin views received quotes
- [ ] Admin approves quote

### Service Provider Testing
- [ ] Add new service provider
- [ ] Add multiple service areas
- [ ] View service provider details
- [ ] Verify provider appears in quote request dropdown (filtered by area)

### Integration Testing
- [ ] Create incident → Request quote → Service provider receives email
- [ ] Service provider replies via email → Quote appears in system
- [ ] Approve quote → Incident status updates
- [ ] Create expense → Generate tax report → Verify totals

---

## Quick Reference: All Routes

### Expense Routes
```
/dashboard/properties/[propertyId]/expenses                    # List
/dashboard/properties/[propertyId]/expenses/new                # Create
/dashboard/properties/[propertyId]/expenses/[expenseId]       # Detail
/dashboard/properties/[propertyId]/expenses/[expenseId]/edit  # Edit
```

### Tenant Incident Routes
```
/tenant/incidents                    # List
/tenant/incidents/new               # Create
/tenant/incidents/[id]              # Detail
```

### Admin Incident Routes
```
/dashboard/properties/[propertyId]/incidents           # List
/dashboard/properties/[propertyId]/incidents/[id]      # Manage
```

### Service Provider Routes
```
/dashboard/service-providers         # List
/dashboard/service-providers/new     # Create
/dashboard/service-providers/[id]   # Detail
```

---

## Common Issues & Solutions

### Issue: "No expenses found" when you know there are expenses
**Solution**: Check that you're viewing the correct property ID in the URL

### Issue: Service providers not appearing in quote request dropdown
**Solution**: 
- Verify service provider has service area matching property's suburb/province
- Check that property has correct suburb and province set

### Issue: Email not sending for quote requests
**Solution**:
- Verify `POSTMARK_API_KEY` or `POSTMARK_SERVER_API_TOKEN` is set in `.env.local`
- Verify `POSTMARK_FROM_EMAIL` is set
- Check server logs for email errors

### Issue: File uploads failing
**Solution**:
- Verify Supabase storage is configured
- Check file size limits (max 10MB)
- Verify file types are allowed (images for incidents, images/PDFs for expenses)

### Issue: Tax report showing no data
**Solution**:
- Verify expenses have the correct tax year set
- Check that depreciation records have matching tax year
- Ensure expenses are marked as tax deductible if needed

---

## API Endpoints (for reference)

### Expense Upload
```
POST /api/expenses/upload
Body: FormData with file and expenseId
```

### Incident Upload
```
POST /api/incidents/upload
Body: FormData with file and incidentId
```

### Incident Status Update
```
PATCH /api/incidents/[incidentId]/status
Body: { status, notes, changedBy }
```

### Quote Email Webhook
```
POST /api/quotes/email-webhook
Body: Postmark webhook payload
```

---

## Next Steps for Production

1. **Email Configuration**: Set up Postmark inbound email handling for quote replies
2. **File Storage**: Configure Supabase storage buckets for expenses and incidents
3. **Permissions**: Add role-based access control checks
4. **Validation**: Add client and server-side validation
5. **Error Handling**: Improve error messages and user feedback
6. **Search/Filter**: Add search and filter capabilities to lists
7. **Notifications**: Add email/notification system for status changes
8. **WhatsApp Integration**: Implement WhatsApp messaging for service providers (future)

