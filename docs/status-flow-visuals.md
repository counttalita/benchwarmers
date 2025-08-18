# Status Flow Visuals and Engagement Management

## Overview

This document describes the status flow visual system implemented across the platform to provide clear visual indicators for engagement progression through the interview workflow.

## Engagement Status Flow

### Status Definitions

| Status | Description | Visual Indicator | Actions Available |
|--------|-------------|------------------|-------------------|
| `staged` | Talent has been shortlisted for a project | Blue badge with UserCheck icon | Schedule Interview, Reject |
| `interviewing` | Interview has been scheduled and is in progress | Orange badge with Calendar icon | Accept, Reject |
| `accepted` | Interview was successful, engagement is ready to start | Green badge with CheckCircle icon | Process Invoice (Admin) |
| `rejected` | Interview was unsuccessful or talent was rejected | Red badge with UserX icon | None |
| `active` | Engagement is currently running | Purple badge with TrendingUp icon | Monitor, Complete |
| `completed` | Engagement has finished successfully | Gray badge with CheckCircle icon | Review, Archive |
| `terminated` | Engagement was terminated early | Red badge with UserX icon | Review, Archive |
| `disputed` | Engagement has a dispute that needs resolution | Yellow badge with AlertTriangle icon | Resolve Dispute |

### Visual Components

#### Status Badges
- **Color-coded**: Each status has a distinct color scheme
- **Icon-based**: Status-specific icons for quick recognition
- **Consistent styling**: All badges follow the same design pattern

#### Status Icons
- `staged`: UserCheck icon (blue)
- `interviewing`: Calendar icon (orange)
- `accepted`: CheckCircle icon (green)
- `rejected`: UserX icon (red)
- `active`: TrendingUp icon (purple)
- `completed`: CheckCircle icon (gray)
- `terminated`: UserX icon (red)
- `disputed`: AlertTriangle icon (yellow)

## Components

### 1. Engagement List Component (`src/components/engagements/engagement-list.tsx`)

A reusable component for displaying engagements with status flow visuals.

#### Features
- **Status filtering**: Filter by engagement status
- **Sorting options**: Sort by date, status, or amount
- **Bulk actions**: Select multiple engagements for batch operations
- **Expandable details**: Click to view additional information
- **Status-specific actions**: Context-aware buttons based on current status

#### Props
```typescript
interface EngagementListProps {
  engagements: Engagement[]
  userType: 'seeker' | 'provider' | 'admin'
  onStatusUpdate?: (engagementId: string, status: string, notes?: string) => void
  onViewDetails?: (engagementId: string) => void
  showFilters?: boolean
  showBulkActions?: boolean
  onBulkAction?: (engagementIds: string[], action: string) => void
}
```

#### Usage
```tsx
<EngagementList
  engagements={engagements}
  userType="admin"
  onStatusUpdate={handleStatusUpdate}
  onViewDetails={handleViewDetails}
  showFilters={true}
  showBulkActions={true}
  onBulkAction={handleBulkAction}
/>
```

### 2. Admin Invoicing Page (`src/app/admin/invoicing/page.tsx`)

Specialized page for managing manual invoicing of accepted engagements.

#### Features
- **Bulk selection**: Select multiple engagements for processing
- **Invoice processing**: Mark engagements as processed
- **Financial details**: Display amounts, fees, and net amounts
- **Status tracking**: Track invoice processing status

#### Bulk Actions
- **Select All**: Select all visible engagements
- **Process Selected**: Process invoices for selected engagements
- **Individual Processing**: Process invoices one by one

### 3. Admin Engagements Page (`src/app/admin/engagements/page.tsx`)

Comprehensive engagement management interface for administrators.

#### Features
- **Statistics dashboard**: Overview of engagement metrics
- **Status breakdown**: Visual representation of engagement distribution
- **Bulk operations**: Export and process multiple engagements
- **Real-time updates**: Refresh data and see latest status

#### Statistics Displayed
- Total engagements across all statuses
- Pipeline metrics (shortlisted + interviewing)
- Active engagements (accepted + active)
- Engagements needing invoice processing

### 4. Enhanced Match Results (`src/components/matching/match-results.tsx`)

Updated match results component with engagement status integration.

#### Features
- **Engagement status display**: Show current engagement status for matches
- **Status-specific actions**: Actions based on engagement progression
- **Interview workflow**: Schedule interviews and manage progression
- **Invoice indicators**: Visual alerts for accepted engagements

## API Endpoints

### 1. Admin Engagements API (`/api/admin/engagements`)

#### GET `/api/admin/engagements`
Retrieves all engagements with statistics for admin dashboard.

**Query Parameters:**
- `status`: Filter by engagement status
- `page`: Page number for pagination
- `limit`: Number of items per page

**Response:**
```json
{
  "engagements": [...],
  "stats": {
    "total": 100,
    "staged": 20,
    "interviewing": 15,
    "accepted": 25,
    "active": 30,
    "completed": 5,
    "rejected": 3,
    "terminated": 1,
    "disputed": 1,
    "needsInvoice": 25
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalCount": 100,
    "totalPages": 5
  }
}
```

### 2. Admin Invoicing API (`/api/admin/invoicing`)

#### GET `/api/admin/invoicing`
Retrieves engagements requiring manual invoice processing.

#### POST `/api/admin/invoicing`
Updates invoice processing status for engagements.

**Request Body:**
```json
{
  "engagementId": "string",
  "invoiceStatus": "sent" | "paid" | "overdue",
  "sentDate": "ISO string",
  "paidDate": "ISO string",
  "notes": "string"
}
```

### 3. Engagement Interview API (`/api/engagements/[id]/interview`)

#### POST `/api/engagements/[id]/interview`
Updates engagement interview status and triggers notifications.

**Request Body:**
```json
{
  "status": "staged" | "interviewing" | "accepted" | "rejected",
  "notes": "string",
  "interviewDate": "ISO string",
  "interviewDuration": "number",
  "interviewerName": "string",
  "interviewType": "phone" | "video" | "in_person",
  "interviewLocation": "string",
  "interviewNotes": "string"
}
```

## User Interface Patterns

### Status Transitions

#### Staged → Interviewing
- **Trigger**: "Schedule Interview" button
- **Required Fields**: Interviewer name, date, duration, type
- **Notifications**: Sent to both parties about interview scheduling

#### Interviewing → Accepted
- **Trigger**: "Accept" button after successful interview
- **Actions**: Triggers manual invoicing workflow
- **Notifications**: Sent to all stakeholders about acceptance

#### Interviewing → Rejected
- **Trigger**: "Reject" button after unsuccessful interview
- **Actions**: Ends engagement process
- **Notifications**: Sent to both parties about rejection

### Visual Feedback

#### Loading States
- Spinner animations during status updates
- Disabled buttons during processing
- Progress indicators for bulk operations

#### Success Indicators
- Green checkmarks for successful operations
- Toast notifications for user feedback
- Status badge updates in real-time

#### Error Handling
- Red error badges for failed operations
- Error messages with actionable guidance
- Retry mechanisms for failed operations

## Bulk Operations

### Supported Bulk Actions

#### For Administrators
1. **Export Engagements**: Export selected engagements to CSV/Excel
2. **Process Invoices**: Batch process invoices for accepted engagements
3. **Status Updates**: Bulk update engagement statuses
4. **Send Notifications**: Send bulk notifications to engagement parties

#### For Seekers/Providers
1. **Export Data**: Export personal engagement data
2. **Status Updates**: Update multiple engagement statuses
3. **Send Messages**: Send bulk messages to engagement parties

### Bulk Action Workflow

1. **Selection**: Users select engagements using checkboxes
2. **Confirmation**: System shows count of selected items
3. **Action**: User chooses bulk action to perform
4. **Processing**: System processes actions with progress indicators
5. **Completion**: Success/failure feedback with results summary

## Accessibility Features

### Visual Accessibility
- High contrast color schemes for status badges
- Clear icon meanings with consistent patterns
- Text labels alongside icons for screen readers

### Keyboard Navigation
- Tab navigation through all interactive elements
- Keyboard shortcuts for common actions
- Focus indicators for all clickable elements

### Screen Reader Support
- ARIA labels for status badges and buttons
- Descriptive text for status changes
- Announcements for bulk action results

## Performance Considerations

### Optimization Strategies
- **Lazy loading**: Load engagement details on demand
- **Pagination**: Limit data loaded at once
- **Caching**: Cache frequently accessed engagement data
- **Debouncing**: Debounce search and filter inputs

### Data Management
- **Efficient queries**: Optimized database queries with proper indexing
- **Batch operations**: Process bulk actions efficiently
- **Real-time updates**: WebSocket updates for status changes

## Testing

### Component Testing
- Unit tests for status badge rendering
- Integration tests for status transitions
- E2E tests for complete workflows

### Visual Testing
- Screenshot testing for status indicators
- Cross-browser compatibility testing
- Mobile responsiveness testing

## Future Enhancements

### Planned Features
1. **Advanced Filtering**: Multi-criteria filtering and saved filters
2. **Custom Statuses**: User-defined status workflows
3. **Automated Notifications**: Smart notification scheduling
4. **Analytics Dashboard**: Advanced engagement analytics
5. **Mobile App**: Native mobile app for engagement management

### Technical Improvements
1. **Real-time Collaboration**: Live updates for multiple users
2. **Advanced Search**: Full-text search across engagement data
3. **API Versioning**: Versioned API endpoints for stability
4. **Performance Monitoring**: Real-time performance metrics

## Troubleshooting

### Common Issues

#### Status Not Updating
- Check user permissions for status changes
- Verify engagement exists and is in correct state
- Check for validation errors in request data

#### Bulk Actions Failing
- Ensure all selected engagements are in valid state
- Check user permissions for bulk operations
- Verify network connectivity for API calls

#### Visual Inconsistencies
- Clear browser cache and reload page
- Check for CSS conflicts in custom themes
- Verify component props are correctly passed

### Debug Information
- Browser console logs for JavaScript errors
- Network tab for API request/response details
- Component state inspection for React debugging
