# Manual Appwrite Database Setup

Since the automated script has compatibility issues with the current Appwrite SDK, here's a manual setup guide for creating the database collections.

## Your Appwrite Configuration

- **Endpoint**: https://fra.cloud.appwrite.io/v1
- **Project ID**: 68a16a3b001c134c498e
- **Database ID**: 68a16ac70039f8237937
- **Bucket ID**: 68a16a550011a2d895dd

## Manual Collection Setup

Go to your Appwrite Console → Databases → benchwarmers-db and create the following collections:

### 1. Companies Collection
**Collection ID**: `companies`

**Attributes**:
- `name` (String, 255, Required)
- `domain` (String, 255, Required)
- `type` (Enum: provider, seeker, both, Required, Default: provider)
- `status` (Enum: pending, active, suspended, Required, Default: pending)
- `stripeAccountId` (String, 255, Optional)
- `verifiedAt` (DateTime, Optional)
- `createdAt` (DateTime, Required)
- `updatedAt` (DateTime, Required)

### 2. Users Collection
**Collection ID**: `users`

**Attributes**:
- `companyId` (String, 255, Required)
- `email` (Email, Required)
- `name` (String, 255, Required)
- `passwordHash` (String, 255, Required)
- `role` (Enum: admin, member, Required, Default: member)
- `twoFactorEnabled` (Boolean, Required, Default: false)
- `twoFactorSecret` (String, 255, Optional)
- `emailVerified` (DateTime, Optional)
- `createdAt` (DateTime, Required)
- `updatedAt` (DateTime, Required)

### 3. Talent Profiles Collection
**Collection ID**: `talent_profiles`

**Attributes**:
- `companyId` (String, 255, Required)
- `name` (String, 255, Required)
- `title` (String, 255, Required)
- `seniorityLevel` (Enum: junior, mid, senior, lead, principal, Required)
- `skills` (String, 10000, Required) - JSON as string
- `certifications` (String, 10000, Optional) - JSON as string
- `location` (String, 255, Required)
- `remotePreference` (String, 255, Required)
- `rateMin` (Float, Optional)
- `rateMax` (Float, Optional)
- `currency` (String, 10, Required, Default: USD)
- `availabilityCalendar` (String, 10000, Optional) - JSON as string
- `isVisible` (Boolean, Required, Default: true)
- `rating` (Float, Required, Default: 0)
- `reviewCount` (Integer, Required, Default: 0)
- `createdAt` (DateTime, Required)
- `updatedAt` (DateTime, Required)

### 4. Talent Requests Collection
**Collection ID**: `talent_requests`

**Attributes**:
- `companyId` (String, 255, Required)
- `title` (String, 255, Required)
- `description` (String, 10000, Required)
- `requiredSkills` (String, 10000, Required) - JSON as string
- `preferredSkills` (String, 10000, Optional) - JSON as string
- `budgetMin` (Float, Optional)
- `budgetMax` (Float, Optional)
- `currency` (String, 10, Required, Default: USD)
- `startDate` (DateTime, Required)
- `durationWeeks` (Integer, Required)
- `locationPreference` (String, 255, Required)
- `status` (Enum: open, matching, closed, Required, Default: open)
- `createdAt` (DateTime, Required)
- `updatedAt` (DateTime, Required)

### 5. Matches Collection
**Collection ID**: `matches`

**Attributes**:
- `requestId` (String, 255, Required)
- `profileId` (String, 255, Required)
- `score` (Float, Required)
- `scoreBreakdown` (String, 10000, Required) - JSON as string
- `status` (Enum: pending, viewed, interested, not_interested, Required, Default: pending)
- `createdAt` (DateTime, Required)
- `updatedAt` (DateTime, Required)

### 6. Offers Collection
**Collection ID**: `offers`

**Attributes**:
- `matchId` (String, 255, Required)
- `seekerCompanyId` (String, 255, Required)
- `providerCompanyId` (String, 255, Required)
- `rate` (Float, Required)
- `currency` (String, 10, Required, Default: USD)
- `startDate` (DateTime, Required)
- `durationWeeks` (Integer, Required)
- `terms` (String, 10000, Optional)
- `totalAmount` (Float, Required)
- `platformFee` (Float, Required)
- `providerAmount` (Float, Required)
- `status` (Enum: pending, accepted, declined, countered, Required, Default: pending)
- `createdAt` (DateTime, Required)
- `updatedAt` (DateTime, Required)

### 7. Payments Collection
**Collection ID**: `payments`

**Attributes**:
- `offerId` (String, 255, Required)
- `stripePaymentIntentId` (String, 255, Optional)
- `amount` (Float, Required)
- `currency` (String, 10, Required, Default: USD)
- `platformFeeAmount` (Float, Required)
- `providerAmount` (Float, Required)
- `status` (Enum: pending, held_in_escrow, released, refunded, Required, Default: pending)
- `heldAt` (DateTime, Optional)
- `releasedAt` (DateTime, Optional)
- `createdAt` (DateTime, Required)
- `updatedAt` (DateTime, Required)

### 8. Engagements Collection
**Collection ID**: `engagements`

**Attributes**:
- `offerId` (String, 255, Required)
- `status` (Enum: active, completed, terminated, disputed, Required, Default: active)
- `startDate` (DateTime, Required)
- `endDate` (DateTime, Optional)
- `totalHours` (Float, Optional)
- `totalAmount` (Float, Required)
- `completionVerified` (Boolean, Required, Default: false)
- `createdAt` (DateTime, Required)
- `updatedAt` (DateTime, Required)

### 9. Reviews Collection
**Collection ID**: `reviews`

**Attributes**:
- `engagementId` (String, 255, Required)
- `profileId` (String, 255, Required)
- `rating` (Integer, Required)
- `comment` (String, 10000, Optional)
- `isPublic` (Boolean, Required, Default: true)
- `createdAt` (DateTime, Required)
- `updatedAt` (DateTime, Required)

## Permissions Setup

For each collection, set the following permissions:

**Read Access**: `users` (authenticated users)
**Create Access**: `users` (authenticated users)  
**Update Access**: `users` (authenticated users)
**Delete Access**: `users` (authenticated users)

## Storage Bucket Setup

Your storage bucket `68a16a550011a2d895dd` should be configured with:

- **File Security**: Enabled
- **Maximum File Size**: 50MB
- **Allowed File Extensions**: jpg, jpeg, png, pdf, doc, docx (or leave empty for all)

**Permissions**:
- **Read Access**: `users`
- **Create Access**: `users`
- **Update Access**: `users`
- **Delete Access**: `users`

## Testing the Setup

After creating all collections manually, you can test the setup by:

1. Running the development server: `npm run dev`
2. Visiting `/test-appwrite` to test file upload
3. The page should show your configuration and allow file uploads

## Next Steps

Once the collections are set up manually:

1. Update the collection IDs in your code if they differ from the suggested ones
2. Test CRUD operations with the collections
3. Implement the authentication system
4. Start building the application features