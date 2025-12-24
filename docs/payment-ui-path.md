# Payment UI Path Guide

This document explains how to access and use the payment functionality in the application.

## Overview

The payment system allows you to:
1. Configure payment provider credentials (Investec) per property
2. Sync bank accounts and beneficiaries from Investec
3. Associate bank accounts with payable templates
4. Execute payments for generated payable instances

## UI Paths

### 1. Configure Payment Instructions

**Path**: `/dashboard/properties/[propertyId]/payment-instructions`

**How to Access**:
- Navigate to a property: `/dashboard/properties/[propertyId]`
- Click on "Payment Instructions" link (to be added to property page)
- Or directly navigate to: `/dashboard/properties/[propertyId]/payment-instructions`

**What You Can Do**:
- Enter Investec credentials (Client ID, Client Secret, API Key)
- Test connection to Investec API
- Sync bank accounts from Investec
- Sync beneficiaries from Investec
- View synced accounts and beneficiaries

### 2. Sync Bank Accounts

**Location**: Payment Instructions page

**Steps**:
1. Go to Payment Instructions page for a property
2. After saving credentials, click "Sync Bank Accounts" button
3. System fetches all accounts from Investec and caches them locally
4. Accounts are displayed in a list

### 3. Sync Beneficiaries

**Location**: Payment Instructions page

**Steps**:
1. Go to Payment Instructions page for a property
2. After syncing bank accounts, click "Sync Beneficiaries" button
3. System fetches all beneficiaries from Investec and caches them locally
4. Beneficiaries are displayed in a list

### 4. Associate Bank Account with Payable Template

**Location**: Property Templates Section → Payable Templates

**Steps**:
1. Navigate to property page: `/dashboard/properties/[propertyId]`
2. Go to "Templates" section
3. Edit a payable template
4. Select a bank account from the dropdown
5. Save the template

**Note**: The bank account selector will only show accounts after you've synced them in Payment Instructions.

### 5. Execute Payments

**Location**: Billing Schedule → Payable Periods

**Path**: `/dashboard/properties/[propertyId]/billing-schedule`

**Steps**:
1. Navigate to property's billing schedule page
2. Click on "Payable" tab
3. Find a payable period that has a generated payable instance
4. Expand the period to see payable instances
5. Click "Pay" button next to a payable instance
6. Select beneficiary, enter references
7. Click "Execute Payment"

**Note**: Payment button only appears for payable instances that:
- Have been generated (status: "ready" or "pending")
- Have a payable template with a bank account configured
- Have a payment instruction set up for the property

## Complete Workflow

### Initial Setup

1. **Configure Payment Instructions**
   - Go to: `/dashboard/properties/[propertyId]/payment-instructions`
   - Enter Investec credentials
   - Click "Test Connection" to verify
   - Click "Save Instructions"

2. **Sync Bank Accounts**
   - On Payment Instructions page
   - Click "Sync Bank Accounts"
   - Review the list of accounts

3. **Sync Beneficiaries**
   - On Payment Instructions page
   - Click "Sync Beneficiaries"
   - Review the list of beneficiaries

4. **Associate Bank Account with Payable Template**
   - Go to property page → Templates section
   - Edit a payable template
   - Select a bank account
   - Save

### Executing Payments

1. **Generate Payable Instances**
   - Payable instances are generated automatically when bills are matched to periods
   - Or generate manually from billing schedule

2. **Execute Payment**
   - Go to: `/dashboard/properties/[propertyId]/billing-schedule`
   - Click "Payable" tab
   - Find payable instance with "ready" status
   - Click "Pay" button
   - Select beneficiary
   - Enter references (my reference, their reference)
   - Click "Execute Payment"

3. **View Payment Status**
   - Payment status is updated in real-time
   - Check payment history in the payments table

## Navigation Links

- **Property Page**: `/dashboard/properties/[propertyId]`
- **Payment Instructions**: `/dashboard/properties/[propertyId]/payment-instructions`
- **Billing Schedule**: `/dashboard/properties/[propertyId]/billing-schedule`

## Troubleshooting

### "No bank accounts found"
- Make sure you've synced bank accounts in Payment Instructions page
- Verify your Investec credentials are correct

### "No beneficiaries found"
- Make sure you've synced beneficiaries in Payment Instructions page
- Beneficiaries must be set up in Investec online banking first

### "Payment button not showing"
- Verify payable template has a bank account associated
- Check that payment instructions are configured for the property
- Ensure payable instance status is "ready" or "pending"

### "Connection test failed"
- Verify Investec credentials are correct
- Check that API key is included if required
- Ensure you have internet connectivity

