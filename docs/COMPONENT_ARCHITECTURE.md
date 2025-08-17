# Component Architecture and UI Library

## Overview

Talent Brew is a B2B talent marketplace connecting companies with benched professionals to organisations seeking specialised skills. The platform implements a comprehensive component architecture built on modern React patterns and design principles. The UI library follows atomic design methodology, emphasizing reusability, accessibility, and maintainability.

## Architecture Principles

### Design System Approach
- **Atomic Design**: Components organized from atoms to organisms
- **Composition over Inheritance**: Flexible component composition
- **Accessibility First**: WCAG 2.1 AA compliance
- **Type Safety**: Full TypeScript coverage with strict typing
- **Performance**: Optimized rendering and code splitting

### Component Hierarchy
```
src/components/
├── ui/                 # Base UI components (atoms)
├── forms/              # Form components (molecules)
├── layout/             # Layout components (organisms)
├── domain/             # Business domain components
└── providers/          # Context providers and wrappers
```

## UI Component Library (`src/components/ui/`)

### Base Components (Atoms)

#### Button Component (`button.tsx`)
```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  asChild?: boolean
}
```

**Features:**
- Multiple variants and sizes
- Loading states with spinner
- Icon support
- Accessibility attributes
- Keyboard navigation

#### Input Component (`input.tsx`)
```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
  label?: string
  helperText?: string
}
```

**Features:**
- Error state handling
- Label association
- Helper text support
- Validation styling
- Focus management

#### Card Component (`card.tsx`)
```typescript
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'elevated'
}
```

**Components:**
- `Card`: Main container
- `CardHeader`: Header section
- `CardTitle`: Title component
- `CardDescription`: Description text
- `CardContent`: Main content area
- `CardFooter`: Footer section

#### Badge Component (`badge.tsx`)
```typescript
interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
  size?: 'sm' | 'default' | 'lg'
}
```

**Use Cases:**
- Status indicators
- Category tags
- Notification counts
- Skill tags

#### Select Component (`select.tsx`)
Built on Radix UI primitives:
```typescript
interface SelectProps {
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  children: React.ReactNode
}
```

**Components:**
- `Select`: Root component
- `SelectTrigger`: Trigger button
- `SelectValue`: Selected value display
- `SelectContent`: Dropdown content
- `SelectItem`: Individual options
- `SelectSeparator`: Visual separator

#### Form Components (`form.tsx`)
React Hook Form integration:
```typescript
interface FormFieldProps {
  control: Control<any>
  name: string
  render: ({ field, fieldState, formState }) => React.ReactElement
}
```

**Components:**
- `Form`: Root form wrapper
- `FormField`: Field controller
- `FormItem`: Field container
- `FormLabel`: Accessible label
- `FormControl`: Input wrapper
- `FormDescription`: Helper text
- `FormMessage`: Error message

### Specialized UI Components

#### Skeleton Loaders (`skeleton-loaders.tsx`)
```typescript
interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
}
```

**Variants:**
- `ProfileSkeleton`: User profile loading state
- `CardSkeleton`: Card content loading
- `TableSkeleton`: Data table loading
- `ListSkeleton`: List item loading

#### Bench Loader (`bench-loader.tsx`)
Custom loading animation:
```typescript
interface BenchLoaderProps {
  size?: 'sm' | 'md' | 'lg'
  message?: string
  fullScreen?: boolean
}
```

**Features:**
- Animated bench icon
- Customizable messages
- Multiple sizes
- Full-screen overlay option

## Domain Components

### Authentication Components (`src/components/auth/`)

#### Login Form (`login-form.tsx`)
```typescript
interface LoginFormProps {
  onSuccess?: (user: User) => void
  redirectTo?: string
  showRegisterLink?: boolean
}
```

**Features:**
- Email/password authentication
- Phone number authentication
- Two-factor authentication support
- Social login integration
- Form validation with Zod

#### Registration Form (`registration-form.tsx`)
```typescript
interface RegistrationFormProps {
  userType: 'seeker' | 'provider'
  onSuccess?: (company: Company) => void
}
```

**Features:**
- Multi-step registration process
- Company information collection
- Domain verification
- Terms acceptance
- Email verification

#### Two-Factor Setup (`two-factor-setup.tsx`)
```typescript
interface TwoFactorSetupProps {
  userId: string
  onComplete?: () => void
  onSkip?: () => void
}
```

**Features:**
- QR code generation
- Backup codes
- Verification testing
- Recovery options

#### Domain Verification Status (`domain-verification-status.tsx`)
```typescript
interface DomainVerificationStatusProps {
  domain: string
  status: 'pending' | 'verified' | 'failed'
  onRetry?: () => void
}
```

### Talent Components (`src/components/talent/`)

#### Profile Creation Form (`profile-creation-form.tsx`)
```typescript
interface ProfileCreationFormProps {
  companyId: string
  onSuccess?: (profile: TalentProfile) => void
  initialData?: Partial<TalentProfile>
}
```

**Features:**
- Multi-step profile creation
- Skills autocomplete
- Rate setting interface
- Availability calendar
- Portfolio upload
- Experience validation

#### Skills Autocomplete (`skills-autocomplete.tsx`)
```typescript
interface SkillsAutocompleteProps {
  value: string[]
  onChange: (skills: string[]) => void
  placeholder?: string
  maxSkills?: number
}
```

**Features:**
- Fuzzy search
- Skill suggestions
- Category filtering
- Custom skill addition
- Validation rules

#### Rate Setting Interface (`rate-setting-interface.tsx`)
```typescript
interface RateSettingProps {
  rates: RateStructure
  onChange: (rates: RateStructure) => void
  currency?: string
}
```

**Features:**
- Hourly/project rates
- Currency selection
- Rate tiers
- Minimum rates
- Market rate suggestions

#### Availability Calendar (`availability-calendar.tsx`)
```typescript
interface AvailabilityCalendarProps {
  availability: AvailabilitySlot[]
  onChange: (availability: AvailabilitySlot[]) => void
  timeZone?: string
}
```

**Features:**
- Weekly schedule
- Time zone support
- Recurring availability
- Blackout dates
- Capacity management

#### Profile Preview (`profile-preview.tsx`)
```typescript
interface ProfilePreviewProps {
  profile: TalentProfile
  viewMode: 'public' | 'private'
  onEdit?: () => void
}
```

### Request Components (`src/components/requests/`)

#### Talent Request Form (`talent-request-form.tsx`)
```typescript
interface TalentRequestFormProps {
  companyId: string
  onSuccess?: (request: TalentRequest) => void
  initialData?: Partial<TalentRequest>
}
```

**Features:**
- Multi-step request creation
- Requirements specification
- Budget range selection
- Timeline setting
- Skill requirements
- Project type selection

#### Request Dashboard (`request-dashboard.tsx`)
```typescript
interface RequestDashboardProps {
  companyId: string
  filters?: RequestFilters
  onRequestSelect?: (request: TalentRequest) => void
}
```

**Features:**
- Request listing
- Status filtering
- Search functionality
- Bulk operations
- Analytics overview

### Offer Components (`src/components/offers/`)

#### Offer Form (`offer-form.tsx`)
```typescript
interface OfferFormProps {
  matchId: string
  onSuccess?: (offer: Offer) => void
  initialData?: Partial<Offer>
}
```

**Features:**
- Rate calculation
- Terms specification
- Timeline setting
- Payment structure
- Contract terms
- Validation rules

#### Offer Card (`offer-card.tsx`)
```typescript
interface OfferCardProps {
  offer: Offer
  viewMode: 'sender' | 'receiver'
  onAccept?: (offer: Offer) => void
  onDecline?: (offer: Offer) => void
  onCounter?: (offer: Offer) => void
}
```

**Features:**
- Offer details display
- Action buttons
- Status indicators
- Timeline tracking
- Terms comparison

### Matching Components (`src/components/matching/`)

#### Match Results (`match-results.tsx`)
```typescript
interface MatchResultsProps {
  requestId: string
  matches: Match[]
  onMatchSelect?: (match: Match) => void
}
```

**Features:**
- Match scoring display
- Profile previews
- Filtering options
- Sorting capabilities
- Bulk actions

#### Match Explanation Tooltip (`match-explanation-tooltip.tsx`)
```typescript
interface MatchExplanationProps {
  match: Match
  showDetails?: boolean
}
```

**Features:**
- Score breakdown
- Criteria explanation
- Skill matching
- Availability overlap
- Rate compatibility

### Admin Components (`src/components/admin/`)

#### Company Approval Card (`company-approval-card.tsx`)
```typescript
interface CompanyApprovalCardProps {
  company: Company
  onApprove?: (company: Company) => void
  onReject?: (company: Company, reason: string) => void
}
```

**Features:**
- Company information display
- Verification status
- Approval actions
- Rejection reasons
- Audit trail

#### Company Stats (`company-stats.tsx`)
```typescript
interface CompanyStatsProps {
  timeRange: 'week' | 'month' | 'quarter' | 'year'
  companyType?: 'seeker' | 'provider' | 'all'
}
```

**Features:**
- Registration metrics
- Engagement statistics
- Revenue tracking
- Growth trends
- Comparative analysis

#### User Management (`user-management.tsx`)
```typescript
interface UserManagementProps {
  companyId?: string
  filters?: UserFilters
  onUserAction?: (action: string, user: User) => void
}
```

**Features:**
- User listing
- Role management
- Status updates
- Bulk operations
- Activity tracking

### Notification Components (`src/components/notifications/`)

#### Notification Bell (`NotificationBell.tsx`)
```typescript
interface NotificationBellProps {
  userId: string
  onNotificationClick?: (notification: Notification) => void
}
```

**Features:**
- Unread count badge
- Real-time updates
- Dropdown preview
- Mark as read
- Priority indicators

#### Notification Center (`NotificationCenter.tsx`)
```typescript
interface NotificationCenterProps {
  userId: string
  filters?: NotificationFilters
  onNotificationAction?: (action: string, notification: Notification) => void
}
```

**Features:**
- Notification listing
- Category filtering
- Bulk actions
- Search functionality
- Archive management

#### Notification Preferences (`NotificationPreferences.tsx`)
```typescript
interface NotificationPreferencesProps {
  userId: string
  onSave?: (preferences: NotificationPreferences) => void
}
```

**Features:**
- Channel preferences
- Category settings
- Frequency controls
- Quiet hours
- Emergency overrides

## Error Handling Components (`src/components/error/`)

### Error Boundary (`ErrorBoundary.tsx`)
```typescript
interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<ErrorFallbackProps>
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}
```

**Features:**
- Error catching
- Fallback UI
- Error reporting
- Recovery options
- Development tools

### Error Alert (`ErrorAlert.tsx`)
```typescript
interface ErrorAlertProps {
  error: Error | string
  variant?: 'error' | 'warning' | 'info'
  dismissible?: boolean
  onDismiss?: () => void
}
```

### Error Fallback (`ErrorFallback.tsx`)
```typescript
interface ErrorFallbackProps {
  error: Error
  resetError: () => void
  componentStack?: string
}
```

## Provider Components (`src/components/providers/`)

### Session Provider (`session-provider.tsx`)
```typescript
interface SessionProviderProps {
  children: React.ReactNode
  session?: Session | null
}
```

**Features:**
- NextAuth.js integration
- Session management
- Authentication state
- User context
- Route protection

## Hooks Integration

### Custom Hooks (`src/hooks/`)

#### useLoadingStates (`use-loading-states.ts`)
```typescript
interface LoadingStates {
  [key: string]: boolean
}

function useLoadingStates(initialStates?: LoadingStates): {
  loading: LoadingStates
  setLoading: (key: string, value: boolean) => void
  isAnyLoading: boolean
}
```

#### useNotifications (`useNotifications.ts`)
```typescript
function useNotifications(userId: string): {
  notifications: Notification[]
  unreadCount: number
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  deleteNotification: (id: string) => void
}
```

## Styling and Theming

### CSS Architecture
- **Tailwind CSS**: Utility-first CSS framework
- **CSS Variables**: Theme customization
- **Component Variants**: Consistent styling patterns
- **Responsive Design**: Mobile-first approach

### Theme Configuration
```typescript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          900: '#1e3a8a',
        },
        // ... other colors
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
}
```

### Component Styling Patterns
```typescript
// Using cn utility for conditional classes
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
```

## Accessibility Features

### WCAG 2.1 AA Compliance
- **Keyboard Navigation**: Full keyboard accessibility
- **Screen Reader Support**: ARIA labels and descriptions
- **Color Contrast**: Minimum 4.5:1 contrast ratio
- **Focus Management**: Visible focus indicators
- **Semantic HTML**: Proper HTML structure

### Accessibility Utilities
```typescript
// Focus management
import { useFocusTrap } from '@/hooks/use-focus-trap'

// Screen reader announcements
import { useAnnouncer } from '@/hooks/use-announcer'

// Keyboard shortcuts
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
```

## Performance Optimizations

### Code Splitting
- **Dynamic Imports**: Lazy loading of components
- **Route-based Splitting**: Page-level code splitting
- **Component-based Splitting**: Heavy component lazy loading

### Rendering Optimizations
- **React.memo**: Prevent unnecessary re-renders
- **useMemo/useCallback**: Expensive computation caching
- **Virtual Scrolling**: Large list optimization
- **Image Optimization**: Next.js Image component

### Bundle Analysis
```bash
# Analyze bundle size
npm run build
npm run analyze
```

## Testing Strategy

### Component Testing
- **React Testing Library**: User-centric testing
- **Jest**: Test runner and assertions
- **Mock Service Worker**: API mocking
- **Accessibility Testing**: axe-core integration

### Visual Testing
- **Storybook**: Component documentation and testing
- **Chromatic**: Visual regression testing
- **Percy**: Screenshot comparison

## Development Workflow

### Component Development
1. **Design System**: Follow atomic design principles
2. **TypeScript First**: Define interfaces before implementation
3. **Accessibility**: Include ARIA attributes and keyboard support
4. **Testing**: Write tests alongside component development
5. **Documentation**: Document props and usage examples

### Code Quality
- **ESLint**: Code linting and style enforcement
- **Prettier**: Code formatting
- **TypeScript**: Type checking
- **Husky**: Pre-commit hooks

## Future Enhancements

### Planned Improvements
1. **Design Tokens**: Centralized design system tokens
2. **Animation Library**: Framer Motion integration
3. **Micro-interactions**: Enhanced user experience
4. **Dark Mode**: Theme switching capability
5. **Internationalization**: Multi-language support

### Component Library Evolution
1. **Standalone Package**: Extract UI library as separate package
2. **Documentation Site**: Dedicated component documentation
3. **Design System**: Comprehensive design system
4. **Community Contributions**: Open source component library

---

**Last Updated**: August 2025  
**Version**: 1.0  
**Maintainer**: Frontend Team
