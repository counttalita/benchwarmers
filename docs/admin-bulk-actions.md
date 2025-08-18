# Admin Bulk Actions Documentation

## Overview

The admin bulk actions system provides administrators with the ability to perform operations on multiple engagements simultaneously, improving efficiency and reducing manual work.

## Features

### 1. Bulk Selection System

#### Checkbox Selection
- **Individual Selection**: Click checkboxes to select specific engagements
- **Select All**: Toggle to select/deselect all visible engagements
- **Visual Feedback**: Selected items are highlighted and count is displayed

#### Selection States
```typescript
interface SelectionState {
  selectedItems: Set<string>
  totalItems: number
  selectedCount: number
  isAllSelected: boolean
}
```

### 2. Bulk Action Types

#### Invoice Processing
- **Process Selected**: Mark multiple accepted engagements as invoice processed
- **Batch Status Update**: Update invoice status for multiple engagements
- **Export Invoice Data**: Export invoice information for selected engagements

#### Engagement Management
- **Status Updates**: Bulk update engagement statuses
- **Export Data**: Export engagement data to CSV/Excel
- **Send Notifications**: Send bulk notifications to engagement parties

#### Administrative Actions
- **User Management**: Bulk user operations (suspend, activate, etc.)
- **Company Management**: Bulk company approval/rejection
- **Data Export**: Export various data sets for analysis

## Implementation

### 1. Admin Invoicing Page (`src/app/admin/invoicing/page.tsx`)

#### Bulk Selection Implementation
```typescript
const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

const toggleSelectAll = () => {
  if (selectedItems.size === items.length) {
    setSelectedItems(new Set())
  } else {
    setSelectedItems(new Set(items.map(item => item.id)))
  }
}

const toggleSelectItem = (itemId: string) => {
  const newSelected = new Set(selectedItems)
  if (newSelected.has(itemId)) {
    newSelected.delete(itemId)
  } else {
    newSelected.add(itemId)
  }
  setSelectedItems(newSelected)
}
```

#### Bulk Processing Implementation
```typescript
const handleBulkProcess = async () => {
  if (selectedItems.size === 0) return
  
  setBulkProcessing(true)
  try {
    const promises = Array.from(selectedItems).map(engagementId =>
      fetch('/api/admin/invoicing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engagementId,
          invoiceStatus: 'sent',
          sentDate: new Date().toISOString()
        })
      })
    )
    
    await Promise.all(promises)
    setSelectedItems(new Set())
    loadItems()
  } catch (error) {
    console.error('Failed to bulk process:', error)
  } finally {
    setBulkProcessing(false)
  }
}
```

### 2. Engagement List Component (`src/components/engagements/engagement-list.tsx`)

#### Bulk Actions Interface
```typescript
interface BulkActionProps {
  selectedEngagements: Set<string>
  onBulkAction: (engagementIds: string[], action: string) => void
  userType: 'admin' | 'seeker' | 'provider'
}
```

#### Bulk Action UI
```tsx
{showBulkActions && selectedEngagements.size > 0 && (
  <Card className="border-blue-200 bg-blue-50">
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          {selectedEngagements.size} engagement(s) selected
        </span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleBulkAction('export')}
          >
            <FileText className="h-4 w-4 mr-1" />
            Export
          </Button>
          {userType === 'admin' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction('process_invoices')}
            >
              <FileText className="h-4 w-4 mr-1" />
              Process Invoices
            </Button>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
)}
```

## API Endpoints

### 1. Bulk Invoice Processing (`/api/admin/invoicing`)

#### POST Request
```typescript
interface BulkInvoiceRequest {
  engagementIds: string[]
  invoiceStatus: 'sent' | 'paid' | 'overdue'
  sentDate?: string
  paidDate?: string
  notes?: string
}
```

#### Response
```typescript
interface BulkInvoiceResponse {
  success: boolean
  processed: number
  failed: number
  errors?: Array<{
    engagementId: string
    error: string
  }>
}
```

### 2. Bulk Engagement Operations (`/api/admin/engagements/bulk`)

#### POST Request
```typescript
interface BulkEngagementRequest {
  engagementIds: string[]
  action: 'export' | 'status_update' | 'notify'
  data?: {
    status?: string
    message?: string
    exportFormat?: 'csv' | 'excel'
  }
}
```

## User Interface Components

### 1. Selection Controls

#### Select All Checkbox
```tsx
<input
  type="checkbox"
  checked={selectedItems.size === items.length && items.length > 0}
  onChange={toggleSelectAll}
  className="rounded border-gray-300"
/>
<span className="text-sm text-gray-600">Select All</span>
```

#### Individual Item Checkbox
```tsx
<input
  type="checkbox"
  checked={selectedItems.has(item.id)}
  onChange={() => toggleSelectItem(item.id)}
  className="mt-1 rounded border-gray-300"
/>
```

### 2. Bulk Action Buttons

#### Processing Button
```tsx
<Button 
  onClick={handleBulkProcess} 
  disabled={bulkProcessing}
  className="bg-green-600 hover:bg-green-700"
>
  {bulkProcessing ? (
    <>
      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      Processing...
    </>
  ) : (
    <>
      <FileText className="h-4 w-4 mr-2" />
      Process Selected
    </>
  )}
</Button>
```

### 3. Progress Indicators

#### Loading States
- Spinner animations during processing
- Disabled buttons to prevent multiple submissions
- Progress bars for long-running operations

#### Success/Error Feedback
- Toast notifications for operation results
- Detailed error messages for failed operations
- Success confirmations with operation summaries

## Error Handling

### 1. Validation Errors
```typescript
const validateBulkAction = (engagementIds: string[], action: string) => {
  if (engagementIds.length === 0) {
    throw new Error('No engagements selected')
  }
  
  if (!['export', 'process_invoices', 'status_update'].includes(action)) {
    throw new Error('Invalid action')
  }
  
  return true
}
```

### 2. Partial Failures
```typescript
const handlePartialFailure = (results: BulkActionResult[]) => {
  const successful = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)
  
  if (failed.length > 0) {
    showError(`Failed to process ${failed.length} items: ${failed.map(f => f.error).join(', ')}`)
  }
  
  if (successful.length > 0) {
    showSuccess(`Successfully processed ${successful.length} items`)
  }
}
```

### 3. Retry Mechanisms
```typescript
const retryFailedOperations = async (failedOperations: FailedOperation[]) => {
  const retryPromises = failedOperations.map(op => 
    retryOperation(op, { maxRetries: 3, delay: 1000 })
  )
  
  const results = await Promise.allSettled(retryPromises)
  return results.map(r => r.status === 'fulfilled' ? r.value : r.reason)
}
```

## Performance Considerations

### 1. Batch Processing
```typescript
const processInBatches = async (items: string[], batchSize: number = 10) => {
  const batches = chunk(items, batchSize)
  const results = []
  
  for (const batch of batches) {
    const batchResults = await Promise.all(
      batch.map(item => processItem(item))
    )
    results.push(...batchResults)
    
    // Add delay between batches to prevent overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  return results
}
```

### 2. Optimistic Updates
```typescript
const optimisticUpdate = (selectedIds: string[], action: string) => {
  // Update UI immediately
  updateUIState(selectedIds, action)
  
  // Perform actual operation
  performBulkAction(selectedIds, action).then(result => {
    if (!result.success) {
      // Revert optimistic update on failure
      revertUIState(selectedIds, action)
    }
  })
}
```

### 3. Memory Management
```typescript
const cleanupSelection = () => {
  setSelectedItems(new Set())
  setBulkProcessing(false)
  setError(null)
}
```

## Security Considerations

### 1. Permission Validation
```typescript
const validatePermissions = (user: User, action: string) => {
  if (user.role !== 'admin') {
    throw new Error('Insufficient permissions')
  }
  
  const allowedActions = getAdminActions(user.permissions)
  if (!allowedActions.includes(action)) {
    throw new Error('Action not allowed')
  }
}
```

### 2. Rate Limiting
```typescript
const rateLimitedBulkAction = rateLimit(bulkAction, {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
})
```

### 3. Input Sanitization
```typescript
const sanitizeBulkRequest = (request: BulkRequest) => {
  return {
    ...request,
    engagementIds: request.engagementIds.filter(id => 
      /^[a-zA-Z0-9-_]+$/.test(id)
    ),
    action: sanitizeString(request.action),
    data: sanitizeObject(request.data)
  }
}
```

## Testing

### 1. Unit Tests
```typescript
describe('Bulk Actions', () => {
  it('should select all items when select all is clicked', () => {
    const { getByLabelText, getAllByRole } = render(<EngagementList />)
    const selectAllCheckbox = getByLabelText('Select All')
    
    fireEvent.click(selectAllCheckbox)
    
    const checkboxes = getAllByRole('checkbox')
    checkboxes.forEach(checkbox => {
      expect(checkbox).toBeChecked()
    })
  })
  
  it('should process selected items in bulk', async () => {
    const mockBulkAction = jest.fn()
    const { getByText } = render(
      <EngagementList onBulkAction={mockBulkAction} />
    )
    
    // Select items and trigger bulk action
    fireEvent.click(getByText('Process Selected'))
    
    expect(mockBulkAction).toHaveBeenCalledWith(
      expect.arrayContaining(['engagement-1', 'engagement-2']),
      'process_invoices'
    )
  })
})
```

### 2. Integration Tests
```typescript
describe('Bulk API Endpoints', () => {
  it('should process bulk invoice requests', async () => {
    const response = await request(app)
      .post('/api/admin/invoicing')
      .send({
        engagementIds: ['engagement-1', 'engagement-2'],
        invoiceStatus: 'sent'
      })
      .expect(200)
    
    expect(response.body.success).toBe(true)
    expect(response.body.processed).toBe(2)
  })
})
```

## Monitoring and Analytics

### 1. Performance Metrics
```typescript
const trackBulkActionMetrics = (action: string, count: number, duration: number) => {
  analytics.track('bulk_action_performed', {
    action,
    itemCount: count,
    duration,
    timestamp: new Date().toISOString()
  })
}
```

### 2. Error Tracking
```typescript
const trackBulkActionError = (action: string, error: Error, context: any) => {
  logger.error('Bulk action failed', {
    action,
    error: error.message,
    context,
    timestamp: new Date().toISOString()
  })
}
```

## Future Enhancements

### 1. Advanced Features
- **Scheduled Bulk Actions**: Schedule bulk operations for off-peak hours
- **Bulk Action Templates**: Save and reuse common bulk action configurations
- **Real-time Progress**: WebSocket updates for long-running bulk operations
- **Undo Functionality**: Ability to undo bulk operations

### 2. User Experience Improvements
- **Drag and Drop Selection**: Visual drag and drop for selecting items
- **Keyboard Shortcuts**: Keyboard shortcuts for common bulk actions
- **Bulk Action History**: Track and display history of bulk operations
- **Custom Bulk Actions**: Allow users to create custom bulk action workflows

### 3. Technical Improvements
- **Background Processing**: Move bulk operations to background jobs
- **Incremental Processing**: Process items incrementally with progress updates
- **Distributed Processing**: Distribute bulk operations across multiple servers
- **Caching**: Cache bulk operation results for better performance
