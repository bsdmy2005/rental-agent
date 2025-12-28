# Manual Testing Setup Guide: Lease Lifecycle & Inspections

## Understanding the Lease Flow

### When Leases Are Created

Leases are created in **3 scenarios**:

1. **During Property Onboarding Wizard** (Step 4 - Tenants)
   - When you add a tenant with lease dates (start/end)
   - Creates a lease record with dates (file can be uploaded later)
   - Location: `/dashboard/properties/onboard`

2. **When Creating Tenant Separately**
   - Via `/dashboard/tenants/add`
   - If you upload a lease PDF, it creates the lease immediately
   - If you only provide dates, creates lease record without file

3. **Upload Lease Later**
   - Go to tenant detail page: `/dashboard/tenants/[tenantId]`
   - Upload lease PDF file
   - Updates existing lease or creates new one

### How to Check Leases for a Property

**Option 1: Via Tenant Detail Page**
- Navigate to `/dashboard/tenants`
- Click on a tenant
- Lease information is displayed in the "Lease Agreement" card
- Shows lease dates, status, and download link

**Option 2: Via Database Query**
```sql
-- Get all leases for a property
SELECT la.*, t.name as tenant_name
FROM lease_agreements la
JOIN tenants t ON la.tenant_id = t.id
WHERE la.property_id = 'your-property-id';
```

**Option 3: Via Code (Server Action)**
```typescript
import { getLeaseAgreementsByPropertyIdQuery } from "@/queries/lease-agreements-queries"

const leases = await getLeaseAgreementsByPropertyIdQuery(propertyId)
```

## Step-by-Step Manual Testing Setup

### Prerequisites
1. ✅ Database migrations pushed (`npx drizzle-kit push`)
2. ✅ Categories seeded (`npx bun db/seed`)
3. ✅ Development server running (`npm run dev`)
4. ✅ Logged in as Rental Agent or Landlord

### Test Scenario: Complete Flow from Scratch

#### Step 1: Create a Property

1. Navigate to `/dashboard/properties`
2. Click "Add Property" or go to `/dashboard/properties/add`
3. Fill in:
   - Property Name: "Test Property 123"
   - Address: "123 Test Street"
   - Property Type: "Apartment"
   - Rental Amount: R5000
4. Click "Create Property"
5. **Note the Property ID** from the URL: `/dashboard/properties/[propertyId]`

#### Step 2: Create a Tenant with Lease

**Option A: Via Property Onboarding (if starting fresh)**
1. Go to `/dashboard/properties/onboard`
2. Complete wizard steps 1-3 (property, bills, templates)
3. In Step 4 (Tenants):
   - Click "Add Tenant"
   - Enter tenant details:
     - Name: "John Doe"
     - ID Number: "1234567890123"
     - Email: "john@example.com"
     - Phone: "+27123456789"
   - Enter lease dates:
     - Start Date: Today's date
     - End Date: 12 months from now
   - (Optional) Upload lease PDF
   - Click "Save Tenant"
4. Complete wizard

**Option B: Via Tenant Form (if property exists)**
1. Navigate to `/dashboard/tenants/add`
2. Select your property from dropdown
3. Fill in tenant details:
   - Name: "John Doe"
   - ID Number: "1234567890123"
   - Email: "john@example.com"
   - Phone: "+27123456789"
   - Rental Amount: R5000
4. Enter lease dates:
   - Lease Start Date: Today
   - Lease End Date: 12 months from now
5. (Optional) Upload lease PDF file
6. Click "Create Tenant"
7. **Note the Tenant ID** from URL: `/dashboard/tenants/[tenantId]`

#### Step 3: Verify Lease Was Created

1. Go to `/dashboard/tenants`
2. Click on the tenant you just created
3. Check the "Lease Agreement" card:
   - Should show lease dates
   - Status should be "pending" or "processed"
   - If file uploaded, should show download link
4. **Note the Lease Agreement ID** (check browser console or database)

**Or check via database:**
```sql
SELECT * FROM lease_agreements 
WHERE property_id = 'your-property-id';
```

#### Step 4: Check Lease Lifecycle State

The lease should have `lifecycle_state = 'waiting'` by default.

Check via database:
```sql
SELECT id, lifecycle_state, signed_by_tenant, signed_by_landlord 
FROM lease_agreements 
WHERE id = 'your-lease-id';
```

#### Step 5: Create Moving-In Inspection

**Via UI (if form exists):**
1. Navigate to `/dashboard/moving-inspections`
2. Click "New Inspection"
3. Select the lease agreement
4. Choose "Moving In" type
5. Click "Create"

**Via Server Action (for testing):**
```typescript
import { createMovingInspectionAction } from "@/actions/moving-inspections-actions"
import { auth } from "@clerk/nextjs/server"

const { userId } = await auth()

const result = await createMovingInspectionAction({
  leaseAgreementId: "your-lease-id",
  inspectionType: "moving_in",
  status: "draft",
  inspectedBy: userId!
})
```

#### Step 6: Add Items to Inspection

1. Go to `/dashboard/moving-inspections/[inspectionId]`
2. You should see categories (Kitchen, Bathroom, etc.)
3. Add items to each category:
   - Kitchen: "Refrigerator", "Stove", "Microwave"
   - Bathroom: "Shower", "Toilet", "Sink"
   - Living Room: "Couch", "TV Stand", "Walls"
4. Set conditions: good/fair/poor/defective

**Via Server Action:**
```typescript
import { createMovingInspectionItemAction } from "@/actions/moving-inspections-actions"

// First, get category IDs
const categories = await db.query.movingInspectionCategories.findMany()

// Add item
await createMovingInspectionItemAction({
  inspectionId: "inspection-id",
  categoryId: categories.find(c => c.name === "Kitchen")!.id,
  name: "Refrigerator",
  condition: "good",
  notes: null,
  displayOrder: 1
})
```

#### Step 7: Test Defect Tracking

1. Mark an item as "defective"
2. Expand defects section
3. Add defect:
   - Description: "Door handle is loose"
   - Severity: "minor"
4. Verify defect appears

#### Step 8: Test Digital Signing

1. Navigate to inspection detail page
2. Click "Sign Inspection" (or create sign page)
3. Draw signature on canvas
4. Click "Confirm Signature"
5. Verify signature is saved

**Check database:**
```sql
SELECT signed_by_tenant, tenant_signature_data 
FROM moving_inspections 
WHERE id = 'inspection-id';
```

## Quick Database Queries for Testing

### Check All Leases for a Property
```sql
SELECT 
  la.id as lease_id,
  la.lifecycle_state,
  la.signed_by_tenant,
  la.signed_by_landlord,
  la.effective_start_date,
  la.effective_end_date,
  t.name as tenant_name,
  p.name as property_name
FROM lease_agreements la
JOIN tenants t ON la.tenant_id = t.id
JOIN properties p ON la.property_id = p.id
WHERE la.property_id = 'your-property-id';
```

### Check Inspections for a Lease
```sql
SELECT 
  mi.id,
  mi.inspection_type,
  mi.status,
  mi.signed_by_tenant,
  mi.signed_by_landlord,
  COUNT(mii.id) as item_count
FROM moving_inspections mi
LEFT JOIN moving_inspection_items mii ON mi.id = mii.inspection_id
WHERE mi.lease_agreement_id = 'your-lease-id'
GROUP BY mi.id;
```

### Check Inspection Items by Category
```sql
SELECT 
  mic.name as category,
  mii.name as item,
  mii.condition,
  COUNT(mid.id) as defect_count
FROM moving_inspection_items mii
JOIN moving_inspection_categories mic ON mii.category_id = mic.id
LEFT JOIN moving_inspection_defects mid ON mii.id = mid.item_id
WHERE mii.inspection_id = 'inspection-id'
GROUP BY mic.name, mii.name, mii.condition
ORDER BY mic.display_order, mii.display_order;
```

## Testing Checklist

- [ ] Property created
- [ ] Tenant created
- [ ] Lease created (check via tenant detail page or database)
- [ ] Lease lifecycle state is "waiting"
- [ ] Moving-in inspection created
- [ ] Categories are seeded (7 categories)
- [ ] Items added to inspection
- [ ] Defects added to items
- [ ] Signature pad works
- [ ] Inspection can be signed
- [ ] Lease can be signed
- [ ] Moving-out inspection can be created from moving-in

## Common Issues

### Issue: No lease found for tenant
**Solution**: 
- Check if lease was created during tenant creation
- If not, upload lease via tenant detail page
- Or create lease manually via database/action

### Issue: Categories not showing
**Solution**: Run seed script: `npx bun db/seed`

### Issue: Can't create inspection
**Solution**: 
- Ensure lease exists first
- Check that you're logged in as rental agent/landlord
- Verify lease_agreement_id is correct

### Issue: Signature not saving
**Solution**:
- Check browser console for errors
- Verify signature data is base64 string
- Check database for signature_data field

## Next Steps After Basic Setup

1. **Test Moving-Out Inspection**:
   - Create moving-out from moving-in
   - Compare conditions
   - Test damage charges

2. **Test Lease Escalations**:
   - Create escalation
   - Upload escalation document
   - Sign escalation

3. **Test Lifecycle Transitions**:
   - Update lease lifecycle state
   - Test automated transitions
   - Verify state changes trigger workflows

