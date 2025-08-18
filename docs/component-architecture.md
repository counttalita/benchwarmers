# Component Architecture Documentation

## Overview

This document describes the component architecture of the marketplace platform, focusing on the new engagement management and status flow visual components.

## Component Hierarchy

### 1. Page-Level Components

#### Admin Pages
```
src/app/admin/
├── invoicing/page.tsx          # Manual invoicing management
├── engagements/page.tsx        # Engagement management dashboard
└── companies/page.tsx          # Company approval management
```

#### User Pages
```
src/app/
├── dashboard/page.tsx          # User dashboard
├── profile/page.tsx            # User profile and subscription
├── offers/page.tsx             # Offer management
└── matching/page.tsx           # Talent matching interface
```

### 2. Reusable Components

#### Engagement Components
```
src/components/engagements/
└── engagement-list.tsx         # Reusable engagement list with status flow
```

#### Dashboard Components
```
src/components/dashboard/
├── admin-dashboard.tsx         # Admin dashboard with engagement stats
├── seeker-dashboard.tsx        # Seeker dashboard with project pipeline
├── provider-dashboard.tsx      # Provider dashboard with opportunity stats
└── shared/
    └── engagement-stats.tsx    # Reusable engagement statistics
```

#### Matching Components
```
src/components/matching/
├── match-results.tsx           # Enhanced with engagement status
└── match-explanation-tooltip.tsx
```

#### Profile Components
```
src/components/profile/
├── subscription-management.tsx # Subscription management UI
└── billing-history.tsx         # Billing history display
```

## Component Relationships

### 1. Data Flow Architecture

```mermaid
graph TD
    A[API Endpoints] --> B[Page Components]
    B --> C[Reusable Components]
    C --> D[UI Components]
    
    A1[/api/admin/engagements] --> B1[AdminEngagementsPage]
    A2[/api/admin/invoicing] --> B2[AdminInvoicingPage]
    A3[/api/engagements] --> B3[UserDashboard]
    
    B1 --> C1[EngagementList]
    B2 --> C1
    B3 --> C1
    
    C1 --> D1[StatusBadge]
    C1 --> D2[ActionButton]
    C1 --> D3[ProgressIndicator]
```

### 2. State Management

#### Local State
```typescript
// Page-level state
const [engagements, setEngagements] = useState<Engagement[]>([])
const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
const [loading, setLoading] = useState(true)

// Component-level state
const [expandedEngagement, setExpandedEngagement] = useState<string | null>(null)
const [filterStatus, setFilterStatus] = useState<string>('all')
```

#### Props Interface
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

## Component Design Patterns

### 1. Container/Presentational Pattern

#### Container Component (Page)
```tsx
// src/app/admin/engagements/page.tsx
export default function AdminEngagementsPage() {
  const [engagements, setEngagements] = useState<Engagement[]>([])
  
  const loadEngagements = async () => {
    // Data fetching logic
  }
  
  const handleStatusUpdate = async (engagementId: string, status: string) => {
    // Status update logic
  }
  
  return (
    <EngagementList
      engagements={engagements}
      userType="admin"
      onStatusUpdate={handleStatusUpdate}
      showBulkActions={true}
    />
  )
}
```

#### Presentational Component
```tsx
// src/components/engagements/engagement-list.tsx
export default function EngagementList({ engagements, userType, onStatusUpdate }: EngagementListProps) {
  // UI rendering logic
  return (
    <div>
      {/* Status badges, action buttons, etc. */}
    </div>
  )
}
```

### 2. Compound Component Pattern

#### Status Badge Component
```tsx
const StatusBadge = ({ status, children }: { status: string, children: React.ReactNode }) => {
  const { color, icon } = getStatusConfig(status)
  
  return (
    <Badge className={color}>
      {icon}
      {children}
    </Badge>
  )
}

// Usage
<StatusBadge status="accepted">
  Accepted
</StatusBadge>
```

### 3. Render Props Pattern

#### Action Button Component
```tsx
const ActionButton = ({ 
  action, 
  onAction, 
  children, 
  renderIcon 
}: ActionButtonProps) => {
  return (
    <Button onClick={() => onAction(action)}>
      {renderIcon && renderIcon()}
      {children}
    </Button>
  )
}

// Usage
<ActionButton 
  action="accept" 
  onAction={handleAction}
  renderIcon={() => <CheckCircle className="h-4 w-4" />}
>
  Accept
</ActionButton>
```

## Component Composition

### 1. Engagement List Composition

```tsx
<EngagementList>
  {/* Filters */}
  <EngagementFilters />
  
  {/* Bulk Actions */}
  <BulkActionBar />
  
  {/* Engagement Cards */}
  {engagements.map(engagement => (
    <EngagementCard key={engagement.id}>
      <EngagementHeader />
      <EngagementDetails />
      <EngagementActions />
      <EngagementExpandedDetails />
    </EngagementCard>
  ))}
</EngagementList>
```

### 2. Status Flow Integration

```tsx
// Status-specific rendering
{engagement.status === 'staged' && (
  <StagedActions onScheduleInterview={handleScheduleInterview} />
)}

{engagement.status === 'interviewing' && (
  <InterviewingActions onAccept={handleAccept} onReject={handleReject} />
)}

{engagement.status === 'accepted' && (
  <AcceptedActions onProcessInvoice={handleProcessInvoice} />
)}
```

## API Integration

### 1. Data Fetching Pattern

```typescript
const useEngagements = (filters: EngagementFilters) => {
  const [data, setData] = useState<Engagement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  useEffect(() => {
    const fetchEngagements = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/engagements?' + new URLSearchParams(filters))
        const result = await response.json()
        setData(result.engagements)
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchEngagements()
  }, [filters])
  
  return { data, loading, error }
}
```

### 2. Mutation Pattern

```typescript
const useEngagementMutation = () => {
  const [mutating, setMutating] = useState(false)
  
  const updateStatus = async (engagementId: string, status: string) => {
    setMutating(true)
    try {
      const response = await fetch(`/api/engagements/${engagementId}/interview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      
      if (!response.ok) {
        throw new Error('Failed to update status')
      }
      
      return await response.json()
    } finally {
      setMutating(false)
    }
  }
  
  return { updateStatus, mutating }
}
```

## Styling Architecture

### 1. CSS-in-JS Pattern

```tsx
const statusStyles = {
  staged: 'bg-blue-100 text-blue-800',
  interviewing: 'bg-orange-100 text-orange-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800'
}

const StatusBadge = ({ status }: { status: string }) => (
  <Badge className={statusStyles[status as keyof typeof statusStyles]}>
    {getStatusLabel(status)}
  </Badge>
)
```

### 2. Responsive Design

```tsx
const EngagementCard = ({ engagement }: { engagement: Engagement }) => (
  <Card className="hover:shadow-lg transition-shadow">
    <CardContent className="p-6">
      <div className="flex flex-col md:flex-row items-start gap-4">
        {/* Mobile-first responsive layout */}
        <div className="w-full md:w-auto">
          <StatusBadge status={engagement.status} />
        </div>
        <div className="flex-1 min-w-0">
          {/* Content */}
        </div>
      </div>
    </CardContent>
  </Card>
)
```

## Error Handling

### 1. Error Boundaries

```tsx
class EngagementErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true }
  }
  
  componentDidCatch(error, errorInfo) {
    logger.error('Engagement component error', { error, errorInfo })
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={() => this.setState({ hasError: false })} />
    }
    
    return this.props.children
  }
}
```

### 2. Loading States

```tsx
const EngagementList = ({ loading, engagements }: EngagementListProps) => {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      {engagements.map(engagement => (
        <EngagementCard key={engagement.id} engagement={engagement} />
      ))}
    </div>
  )
}
```

## Testing Strategy

### 1. Component Testing

```typescript
describe('EngagementList', () => {
  it('should render engagement cards', () => {
    const engagements = mockEngagements()
    const { getAllByTestId } = render(
      <EngagementList engagements={engagements} userType="admin" />
    )
    
    expect(getAllByTestId('engagement-card')).toHaveLength(engagements.length)
  })
  
  it('should show correct status badges', () => {
    const engagement = { ...mockEngagement(), status: 'accepted' }
    const { getByText } = render(
      <EngagementList engagements={[engagement]} userType="admin" />
    )
    
    expect(getByText('Accepted')).toBeInTheDocument()
  })
})
```

### 2. Integration Testing

```typescript
describe('Engagement Status Flow', () => {
  it('should update status when action is triggered', async () => {
    const mockUpdateStatus = jest.fn()
    const { getByText } = render(
      <EngagementList 
        engagements={[mockEngagement({ status: 'staged' })]}
        onStatusUpdate={mockUpdateStatus}
        userType="admin"
      />
    )
    
    fireEvent.click(getByText('Schedule Interview'))
    
    expect(mockUpdateStatus).toHaveBeenCalledWith(
      'engagement-1',
      'interviewing'
    )
  })
})
```

## Performance Optimization

### 1. Memoization

```tsx
const EngagementCard = React.memo(({ engagement, onAction }: EngagementCardProps) => {
  const handleAction = useCallback((action: string) => {
    onAction(engagement.id, action)
  }, [engagement.id, onAction])
  
  return (
    <Card>
      {/* Card content */}
    </Card>
  )
})
```

### 2. Virtualization

```tsx
import { FixedSizeList as List } from 'react-window'

const VirtualizedEngagementList = ({ engagements }: { engagements: Engagement[] }) => {
  const Row = ({ index, style }: { index: number, style: CSSProperties }) => (
    <div style={style}>
      <EngagementCard engagement={engagements[index]} />
    </div>
  )
  
  return (
    <List
      height={600}
      itemCount={engagements.length}
      itemSize={200}
    >
      {Row}
    </List>
  )
}
```

## Accessibility

### 1. ARIA Labels

```tsx
const StatusBadge = ({ status }: { status: string }) => (
  <Badge 
    className={getStatusColor(status)}
    aria-label={`Engagement status: ${getStatusLabel(status)}`}
  >
    {getStatusIcon(status)}
    {getStatusLabel(status)}
  </Badge>
)
```

### 2. Keyboard Navigation

```tsx
const ActionButton = ({ action, onAction, children }: ActionButtonProps) => (
  <Button
    onClick={() => onAction(action)}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onAction(action)
      }
    }}
  >
    {children}
  </Button>
)
```

## Future Enhancements

### 1. Component Library

- **Design System**: Create a comprehensive design system
- **Storybook**: Document components with Storybook
- **Theme Support**: Add theme customization capabilities

### 2. Advanced Patterns

- **Context API**: Use React Context for global state
- **Custom Hooks**: Extract reusable logic into custom hooks
- **Suspense**: Implement React Suspense for data loading

### 3. Performance Improvements

- **Code Splitting**: Implement dynamic imports for better performance
- **Bundle Optimization**: Optimize bundle size and loading
- **Caching**: Implement intelligent caching strategies
