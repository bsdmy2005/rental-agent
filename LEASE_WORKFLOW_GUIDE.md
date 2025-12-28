# Lease Initiation Workflow Guide

## Overview

There are **multiple ways** to create tenants and leases in the system. You do NOT need to create a property without a tenant first. Here are all the workflows:

## Workflow Options

### Option 1: Property Onboarding Wizard (Existing Flow)

**Path:** `/dashboard/properties/onboard`

1. **Step 1:** Create Property
2. **Step 2:** Add Bill Templates
3. **Step 3:** Add Payable Templates
4. **Step 4:** Add Tenants
   - Can add multiple tenants
   - Can upload lease PDFs OR just provide dates
   - If lease PDF uploaded → Creates lease with `initiation_method = 'upload_existing'`
   - If only dates provided → Creates tenant, lease created later
5. **Step 5:** Review & Complete

**When Tenant is Created:** During Step 4 of onboarding
**When Lease is Created:** 
- If lease PDF uploaded → Immediately during Step 4
- If only dates provided → Lease record created, but PDF uploaded later via tenant detail page

---

### Option 2: Create Tenant Separately, Then Initiate Lease

**Path:** `/dashboard/tenants/add`

1. **Create Property** (if not exists)
2. **Create Tenant** via `/dashboard/tenants/add`
   - Select property
   - Fill tenant details
   - Optionally upload lease PDF (existing signed lease)
   - OR just provide lease dates
3. **Later:** Initiate new lease via `/dashboard/properties/[propertyId]/leases/new`
   - Select existing tenant
   - Fill lease terms
   - System generates PDF and sends to tenant

**When Tenant is Created:** When you submit the tenant form
**When Lease is Created:**
- If lease PDF uploaded → Immediately when tenant created
- If lease initiated later → When you click "Initiate New Lease"

---

### Option 3: Initiate Lease Directly (New Flow)

**Path:** `/dashboard/properties/[propertyId]/leases/new`

1. **Create Property** (if not exists)
2. **Click "Initiate New Lease"** on property page
3. **Choose tenant type:**
   - **Option A:** Select existing tenant (if property already has tenants)
   - **Option B:** Create new tenant (fill tenant details in form)
4. **Fill lease terms** (dates, rent, escalation, etc.)
5. **Click "Create Lease & Send to Tenant"**
   - System creates tenant (if new)
   - System generates lease PDF
   - System sends email to tenant with signing link
   - Lease status: `initiation_method = 'initiate_new'`, `initiation_status = 'sent_to_tenant'`

**When Tenant is Created:** 
- If selecting existing tenant → No new tenant created
- If creating new tenant → Created when lease is initiated

**When Lease is Created:** Immediately when you submit the lease initiation form

---

## Key Differences Between Workflows

### Upload Existing Lease (`initiation_method = 'upload_existing'`)

- **Use Case:** Lease already signed offline, just need to upload PDF
- **Workflow:** Upload PDF → System extracts dates → Lease record created
- **Status:** `lifecycle_state = 'waiting'` (can be updated to 'signed' if both parties already signed)
- **No email sent** (lease already signed)

### Initiate New Lease (`initiation_method = 'initiate_new'`)

- **Use Case:** Need to create lease from scratch, send to tenant for signing
- **Workflow:** Fill form → Generate PDF → Send email → Tenant signs → Landlord signs → Final PDF
- **Status:** Goes through: `draft` → `sent_to_tenant` → `tenant_signed` → `fully_executed`
- **Email workflow:** Tenant receives email → Signs → Landlord notified → Signs → Both get final copy

---

## Common Scenarios

### Scenario 1: New Property, New Tenant, Need Digital Signing

**Recommended Flow:** Option 3 (Initiate Lease Directly)

1. Create property
2. Go to property page → Click "Initiate New Lease"
3. Select "New Tenant" → Fill tenant details
4. Fill lease terms
5. Submit → Tenant receives email → Signs → You sign → Done

### Scenario 2: Property Exists, Tenant Exists, Need to Upload Signed Lease

**Recommended Flow:** Option 2 (Create Tenant Separately)

1. Go to `/dashboard/tenants/add`
2. Select property
3. Fill tenant details
4. Upload signed lease PDF
5. Done (lease is uploaded and associated)

### Scenario 3: Property Onboarding with Multiple Tenants

**Recommended Flow:** Option 1 (Onboarding Wizard)

1. Use property onboarding wizard
2. In Step 4, add all tenants
3. Upload lease PDFs or provide dates
4. Complete onboarding

---

## Tenant Creation Points

Tenants can be created at **three different points**:

1. **During Property Onboarding** (Step 4)
   - Multiple tenants can be added
   - Can upload leases or just dates

2. **Via Tenant Form** (`/dashboard/tenants/add`)
   - Independent tenant creation
   - Can upload lease PDF or leave for later

3. **During Lease Initiation** (`/dashboard/properties/[propertyId]/leases/new`)
   - If selecting "New Tenant" option
   - Tenant created automatically when lease is initiated

---

## Lease Status Flow

### For Uploaded Leases (`upload_existing`)

```
Upload PDF → lifecycle_state = 'waiting'
(Can manually update to 'signed' if both parties already signed)
```

### For Initiated Leases (`initiate_new`)

```
Create Draft → initiation_status = 'draft'
  ↓
Send Email → initiation_status = 'sent_to_tenant'
  ↓
Tenant Signs → initiation_status = 'tenant_signed', lifecycle_state = 'waiting'
  ↓
Landlord Signs → initiation_status = 'fully_executed', lifecycle_state = 'signed'
  ↓
Final PDF Generated → Both parties receive email
```

---

## Best Practices

1. **For new properties with new tenants:** Use "Initiate New Lease" from property page
2. **For existing tenants:** Use tenant form to add tenant, then initiate lease separately if needed
3. **For bulk onboarding:** Use property onboarding wizard
4. **For pre-signed leases:** Upload via tenant form or onboarding wizard

---

## UI Entry Points

1. **Property Page** → "Initiate New Lease" button
2. **Tenants Page** → "Add Tenant" button
3. **Property Onboarding** → Step 4 (Tenants)
4. **Tenant Detail Page** → Upload lease (if not uploaded yet)

---

## Summary

**You do NOT need to create a property without a tenant first.** You can:

- Create property → Add tenant during onboarding
- Create property → Add tenant separately → Initiate lease later
- Create property → Initiate lease → Tenant created automatically

The system is flexible and supports all these workflows!

