# Testing Guide: Lease Lifecycle & Inspection Management

## Prerequisites

1. **Database Setup**: Ensure your database is running and `DATABASE_URL` is set in `.env.local`
2. **Dependencies**: All packages installed (`npm install`)

## Step 1: Push Database Schema Changes

Push the new schema changes to your database:

```bash
npx drizzle-kit push
```

This will create all the new tables:
- `lease_escalations`
- `moving_inspections`
- `moving_inspection_categories`
- `moving_inspection_items`
- `moving_inspection_defects`
- `moving_inspection_attachments`
- `moving_inspection_documents`
- `moving_inspection_comparisons`

And update the `lease_agreements` table with lifecycle and signing fields.

## Step 2: Seed Inspection Categories

Seed the default inspection categories:

```bash
npx bun db/seed
```

This will create 7 default categories:
- Kitchen
- Bathroom
- Living Room
- Bedroom(s)
- Outdoor/Patio
- Garage/Parking
- General

## Step 3: Start Development Server

```bash
npm run dev
```

## Step 4: Manual Testing Checklist

### 4.1 Test Lease Lifecycle States

1. **Navigate to a lease agreement** (e.g., `/dashboard/properties/[propertyId]`)
2. **Check lifecycle state field** - Should default to "waiting"
3. **Test state transitions**:
   - Use the `updateLeaseLifecycleStateAction` to change states
   - Verify states: `waiting` → `signed` → `moving_in_pending` → `active` → `escalation_due` → `moving_out_pending` → `completed`

### 4.2 Test Moving-In Inspection Creation

1. **Navigate to**: `/dashboard/moving-inspections`
2. **Click "New Inspection"**
3. **Create a moving-in inspection**:
   - Select a lease agreement
   - Choose "Moving In" type
   - Verify inspection is created with status "draft"

### 4.3 Test Inspection Checklist

1. **Open an inspection** from the list
2. **Verify categories are displayed** (Kitchen, Bathroom, etc.)
3. **Add items to categories**:
   - Use `createMovingInspectionItemAction`
   - Add items like "Refrigerator", "Stove", "Walls", etc.
   - Set condition: good/fair/poor/defective
4. **Verify items display correctly** grouped by category

### 4.4 Test Defect Tracking

1. **Mark an item as "defective"**
2. **Add a defect**:
   - Click to expand defects section
   - Fill in defect form (description, severity)
   - Submit
3. **Verify defect appears** under the item
4. **Test multiple defects** per item

### 4.5 Test Document Upload

1. **Upload a PDF/Word document**:
   - Use `uploadMovingInspectionDocumentAction`
   - Verify document is stored
   - Check extraction status (should be "pending" initially)

### 4.6 Test Digital Signing

1. **Navigate to inspection detail page**
2. **Click "Sign Inspection"** (if button exists)
3. **Test signature pad**:
   - Draw signature on canvas
   - Click "Clear" to reset
   - Click "Confirm Signature"
4. **Verify signature is saved**:
   - Check `tenantSignatureData` or `landlordSignatureData` in database
   - Verify `signedByTenant` or `signedByLandlord` is true
5. **Test both parties signing**:
   - Sign as tenant
   - Sign as landlord
   - Verify `signedAt` timestamp is set when both sign

### 4.7 Test Moving-Out Inspection

1. **Create moving-out inspection from moving-in**:
   - Use `createMovingOutFromMovingInAction`
   - Select a completed moving-in inspection
   - Verify moving-out inspection is created with items copied
2. **Update item conditions** for moving-out
3. **Test comparison**:
   - Use `compareInspectionsAction`
   - Verify comparison records are created
   - Check condition changes: improved/same/deteriorated/new_defect

### 4.8 Test Lease Escalations

1. **Create an escalation**:
   - Use `createLeaseEscalationAction`
   - Set escalation date, amounts, type
   - Upload escalation document
2. **View escalations** for a lease
3. **Test escalation signing**:
   - Sign as tenant
   - Sign as landlord
   - Verify both signatures are recorded

### 4.9 Test Lease Agreement Signing

1. **Navigate to lease agreement**
2. **Test signing workflow**:
   - Use `signLeaseAgreementAction`
   - Sign as tenant
   - Sign as landlord
   - Verify lifecycle state updates to "signed"

## Step 5: Database Verification

Check the database directly to verify data:

```sql
-- Check inspections
SELECT * FROM moving_inspections;

-- Check items
SELECT * FROM moving_inspection_items;

-- Check defects
SELECT * FROM moving_inspection_defects;

-- Check categories
SELECT * FROM moving_inspection_categories;

-- Check lease lifecycle states
SELECT id, lifecycle_state, signed_by_tenant, signed_by_landlord FROM lease_agreements;

-- Check escalations
SELECT * FROM lease_escalations;
```

## Step 6: UI Testing

### 6.1 List Page
- Navigate to `/dashboard/moving-inspections`
- Verify inspections list displays
- Check filtering by type (moving_in/moving_out)
- Verify status badges display correctly

### 6.2 Detail Page
- Click on an inspection
- Verify checklist displays grouped by category
- Test adding items
- Test marking items as defective
- Test adding defects

### 6.3 Signature Component
- Verify signature pad renders
- Test drawing signature
- Test clear button
- Test confirm button
- Verify signature saves correctly

## Common Issues & Troubleshooting

### Issue: Migration fails
**Solution**: Check that all schema files are properly exported in `db/schema/index.ts`

### Issue: Relations not working
**Solution**: Drizzle relational queries require relations to be defined. For now, queries use manual joins. To add relations, create a `relations.ts` file in `db/schema/`.

### Issue: Signature not saving
**Solution**: Check that `signatureData` is being passed correctly as base64 string to the action

### Issue: Categories not showing
**Solution**: Run seed script: `npx bun db/seed`

### Issue: TypeScript errors
**Solution**: Run `npm run types` to check for type errors

## Next Steps

1. **Add Relations**: Define Drizzle relations for better query performance
2. **Add UI for Creating Inspections**: Create form to create new inspections
3. **Add File Upload UI**: Create component for uploading documents/photos
4. **Add Comparison View**: Create UI to view moving-in vs moving-out comparisons
5. **Add Email Notifications**: Send emails when inspections are completed/signed

## API Testing

You can also test actions directly using server actions:

```typescript
// Example: Create inspection
import { createMovingInspectionAction } from "@/actions/moving-inspections-actions"

const result = await createMovingInspectionAction({
  leaseAgreementId: "lease-id",
  inspectionType: "moving_in",
  status: "draft",
  inspectedBy: "user-id"
})
```

## Notes

- All actions require authentication (Clerk)
- Make sure you're logged in as a rental agent or landlord
- Tenant users can view and sign inspections but not create them

