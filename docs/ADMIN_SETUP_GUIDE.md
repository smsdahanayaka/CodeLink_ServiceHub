# CodeLink ServiceHub - Administrator Setup Guide

## Initial System Configuration

This guide helps administrators set up the system for their organization.

---

## Table of Contents

1. [Pre-Setup Checklist](#1-pre-setup-checklist)
2. [User & Role Setup](#2-user--role-setup)
3. [Product Catalog Setup](#3-product-catalog-setup)
4. [Shop Network Setup](#4-shop-network-setup)
5. [Workflow Configuration](#5-workflow-configuration)
6. [Notification Setup](#6-notification-setup)
7. [Logistics Setup](#7-logistics-setup)
8. [Best Practices](#8-best-practices)

---

## 1. Pre-Setup Checklist

Before starting, gather this information:

### Company Information
- [ ] Company name and logo
- [ ] Contact email and phone
- [ ] Business address

### Team Information
- [ ] List of team members (name, email, phone)
- [ ] Role assignments for each member
- [ ] Department structure

### Product Information
- [ ] Product categories
- [ ] Product list with model numbers
- [ ] Warranty periods for each product
- [ ] Serial number formats

### Partner Information
- [ ] Shop/dealer list with addresses
- [ ] Contact persons for each shop
- [ ] GST/Tax numbers (if applicable)

### Process Information
- [ ] Claim handling workflow steps
- [ ] SLA requirements
- [ ] Notification requirements

---

## 2. User & Role Setup

### 2.1 Understanding Default Roles

| Role | Best For | Key Permissions |
|------|----------|-----------------|
| **Admin** | System administrators | Full access to everything |
| **Manager** | Team leads, supervisors | Manage team, view reports, process claims |
| **Technician** | Service engineers | Process repairs, update claim status |
| **Receptionist** | Front desk staff | Create claims, register warranties |

### 2.2 Creating Custom Roles

**Example: Quality Inspector Role**

1. Go to **Users & Roles** → **Roles**
2. Click **Add Role**
3. Configure:
   ```
   Name: Quality Inspector
   Description: Reviews repaired products before delivery

   Permissions:
   ✅ Claims - View
   ✅ Claims - Process
   ✅ Warranty Cards - View
   ✅ Products - View
   ❌ Users - (none)
   ❌ Settings - (none)
   ```
4. Click **Create**

### 2.3 Adding Team Members

**Recommended Order:**
1. Create roles first
2. Add managers
3. Add team members

**For Each User:**
1. Go to **Users & Roles** → **Users**
2. Click **Add User**
3. Fill in details and assign appropriate role
4. User receives login credentials via email

### 2.4 Role Permission Matrix

| Permission | Admin | Manager | Technician | Receptionist |
|------------|-------|---------|------------|--------------|
| Users - View | ✅ | ✅ | ❌ | ❌ |
| Users - Create | ✅ | ❌ | ❌ | ❌ |
| Products - View | ✅ | ✅ | ✅ | ✅ |
| Products - Edit | ✅ | ✅ | ❌ | ❌ |
| Claims - View | ✅ | ✅ | ✅ | ✅ |
| Claims - Create | ✅ | ✅ | ✅ | ✅ |
| Claims - Process | ✅ | ✅ | ✅ | ❌ |
| Workflows - Edit | ✅ | ✅ | ❌ | ❌ |
| Logistics - View | ✅ | ✅ | ✅ | ✅ |
| Logistics - Manage | ✅ | ✅ | ❌ | ❌ |
| Settings - Edit | ✅ | ❌ | ❌ | ❌ |

---

## 3. Product Catalog Setup

### 3.1 Setting Up Categories

**Recommended Category Structure:**

```
Electronics
├── TVs
│   ├── LED TVs
│   └── Smart TVs
├── Audio
│   ├── Speakers
│   └── Headphones
└── Appliances
    ├── Washing Machines
    └── Refrigerators
```

**Steps:**
1. Go to **Products** → **Categories**
2. Create parent categories first (Electronics, Appliances)
3. Create sub-categories with parent reference

### 3.2 Adding Products

**Required Information per Product:**

| Field | Required | Example |
|-------|----------|---------|
| Name | Yes | "Smart TV 55 inch 4K" |
| Model Number | Recommended | "TV-55-4K-2024" |
| SKU | Optional | "SKU001234" |
| Category | Recommended | "Smart TVs" |
| Warranty Period | Yes | 12 (months) |
| Serial Prefix | Optional | "STV" |

### 3.3 Bulk Import (CSV)

For large product catalogs, prepare a CSV file:

```csv
name,model_number,sku,category,warranty_months
"Smart TV 55 inch",TV-55-4K,SKU001,Smart TVs,12
"LED TV 32 inch",TV-32-LED,SKU002,LED TVs,12
"Bluetooth Speaker",SPK-BT-100,SKU003,Speakers,6
```

---

## 4. Shop Network Setup

### 4.1 Shop Information Template

Gather this for each shop:

```
Shop Name:        _______________________
Shop Code:        _______________________  (unique identifier)
Address:          _______________________
City:             _______________________
State:            _______________________
Postal Code:      _______________________
Phone:            _______________________
Email:            _______________________
Contact Person:   _______________________
GST Number:       _______________________
```

### 4.2 Shop Status Management

| Status | When to Use |
|--------|-------------|
| Active | Shop can create warranties and claims |
| Inactive | Temporarily disabled (e.g., renovation) |
| Suspended | Access revoked (e.g., compliance issues) |

### 4.3 Shop Codes Best Practice

Use meaningful codes:
- By region: `MUM-001`, `DEL-002`, `BLR-003`
- By type: `DEALER-001`, `SERVICE-001`
- Sequential: `SHOP-0001`, `SHOP-0002`

---

## 5. Workflow Configuration

### 5.1 Default Workflow

The system includes a default warranty claim workflow:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Claim     │ ──► │  Pending    │ ──► │   Under     │
│  Received   │     │   Review    │     │   Repair    │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                                              ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Completed  │ ◄── │   Ready     │ ◄── │   Quality   │
│             │     │   Delivery  │     │    Check    │
└─────────────┘     └─────────────┘     └─────────────┘
```

### 5.2 Customizing Workflows

**Add SLA to Steps:**
1. Open the workflow
2. Edit each step
3. Set SLA Hours (e.g., 24 hours for review)
4. Set Warning Hours (e.g., warn at 20 hours)

**Add Form Fields:**
1. Edit the step
2. Add fields to collect data:
   - Repair notes (textarea)
   - Parts used (multi-select)
   - Repair cost (number)
   - Test results (select)

### 5.3 Workflow Templates

Choose from pre-built templates:

| Template | Best For | Steps |
|----------|----------|-------|
| Standard Repair | Most repairs | 6 steps |
| Quick Exchange | Replacements | 3 steps |
| Parts Waiting | Requires ordering | 7 steps |
| Simple Service | Quick fixes | 4 steps |

### 5.4 Step Configuration Options

| Option | Description |
|--------|-------------|
| Required Role | Only users with this role can process |
| SLA Hours | Maximum time to complete step |
| Auto-assign | Automatically assign to specific user |
| Form Fields | Data to collect at this step |
| Notifications | Send alerts on enter/exit |

---

## 6. Notification Setup

### 6.1 Email Configuration

To enable email notifications, configure in environment:

```env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your-api-key
SENDGRID_FROM_EMAIL=noreply@yourcompany.com
SENDGRID_FROM_NAME=Your Company ServiceHub
```

### 6.2 SMS Configuration

To enable SMS notifications:

```env
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

### 6.3 Notification Templates

**Creating a Template:**
1. Go to **Settings** → **Notification Templates**
2. Click **Add Template**
3. Configure:
   ```
   Name: Claim Created - Customer SMS
   Type: SMS
   Subject: (not needed for SMS)
   Body: Hi {{customerName}}, your warranty claim
         {{claimNumber}} has been registered. We will
         update you on progress.
   ```

### 6.4 Available Template Variables

| Variable | Description |
|----------|-------------|
| `{{claimNumber}}` | Claim reference number |
| `{{customerName}}` | Customer's full name |
| `{{customerPhone}}` | Customer's phone |
| `{{customerEmail}}` | Customer's email |
| `{{productName}}` | Product name |
| `{{serialNumber}}` | Product serial number |
| `{{shopName}}` | Shop name |
| `{{status}}` | Current claim status |
| `{{priority}}` | Claim priority |
| `{{createdAt}}` | Claim creation date |

### 6.5 Recommended Notification Templates

| Event | Channel | Recipient |
|-------|---------|-----------|
| Claim Created | SMS + Email | Customer |
| Status Changed | SMS | Customer |
| Pickup Scheduled | SMS | Customer |
| Delivery Scheduled | SMS | Customer |
| Claim Completed | SMS + Email | Customer |
| SLA Warning | Email | Assigned User |
| SLA Breach | Email | Manager |

---

## 7. Logistics Setup

### 7.1 Collector Setup

**For Each Collector:**
1. Go to **Logistics** → **Collectors**
2. Click **Add Collector**
3. Fill in:
   ```
   Name:           Rajesh Kumar
   Phone:          9876543210
   Email:          rajesh@company.com
   Vehicle Number: MH-12-AB-1234
   Vehicle Type:   Bike
   Assigned Areas: Mumbai, Thane, Navi Mumbai
   Status:         Active
   ```

### 7.2 Area Assignment Strategy

**By Geography:**
- Collector A: North Zone
- Collector B: South Zone
- Collector C: East Zone

**By Distance:**
- Collector A: Within 10km radius
- Collector B: 10-25km radius
- Collector C: 25km+ radius

### 7.3 Time Slot Configuration

Default time slots:
- Morning: 09:00 - 12:00
- Afternoon: 12:00 - 15:00
- Evening: 15:00 - 18:00
- Night: 18:00 - 21:00

---

## 8. Best Practices

### 8.1 Security Best Practices

| Practice | Recommendation |
|----------|----------------|
| Passwords | Minimum 8 characters, mix of letters/numbers |
| Role Assignment | Give minimum required permissions |
| Regular Review | Review user access quarterly |
| Inactive Users | Disable accounts of departed employees |

### 8.2 Data Organization

| Entity | Naming Convention |
|--------|-------------------|
| Shop Codes | Region-Number (e.g., MUM-001) |
| Serial Numbers | Prefix-Year-Sequence (e.g., TV-24-00001) |
| Claim Numbers | Auto-generated |

### 8.3 Workflow Optimization

| Tip | Benefit |
|-----|---------|
| Set realistic SLAs | Achievable targets |
| Use form fields | Capture consistent data |
| Enable notifications | Keep customers informed |
| Review regularly | Identify bottlenecks |

### 8.4 Maintenance Tasks

**Daily:**
- Check pending claims
- Review SLA breaches
- Process failed notifications

**Weekly:**
- Review collector performance
- Check inventory of parts
- Backup important data

**Monthly:**
- Review user access
- Analyze claim statistics
- Update product information

---

## Setup Completion Checklist

### Essential Setup
- [ ] Admin account configured
- [ ] At least one custom role created
- [ ] Team members added
- [ ] Products added to catalog
- [ ] Shops registered

### Recommended Setup
- [ ] Custom workflow configured
- [ ] SLA times set for each step
- [ ] Notification templates created
- [ ] Email provider configured
- [ ] SMS provider configured

### Optional Setup
- [ ] Collectors added
- [ ] Logistics enabled
- [ ] Advanced permissions configured
- [ ] Custom form fields added

---

## Troubleshooting

### Common Issues

**Users can't log in:**
- Verify email is correct
- Check user status is Active
- Reset password if needed

**Notifications not sending:**
- Verify provider credentials
- Check notification queue
- Review error logs

**Workflow not progressing:**
- Check required permissions
- Verify form fields are filled
- Check for conditional rules

---

## Support

For additional help:
- **Technical Support:** support@codelink.com
- **Documentation:** Full user manual available
- **Training:** Contact us for onboarding sessions

---

*Last Updated: December 2024*
