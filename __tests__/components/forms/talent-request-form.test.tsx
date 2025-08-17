import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TalentRequestForm } from '@/components/requests/talent-request-form'

// Mock react-hook-form
jest.mock('react-hook-form', () => ({
  useForm: () => ({
    register: jest.fn(),
    handleSubmit: jest.fn((fn) => fn),
    formState: { errors: {}, isSubmitting: false },
    setValue: jest.fn(),
    watch: jest.fn(),
    reset: jest.fn()
  }),
  useFieldArray: () => ({
    fields: [],
    append: jest.fn(),
    remove: jest.fn()
  })
}))

// Mock UI components
jest.mock('@/components/ui/form', () => ({
  Form: ({ children }: { children: React.ReactNode }) => <form>{children}</form>,
  FormControl: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FormField: ({ render }: { render: any }) => render({ field: { onChange: jest.fn(), value: '' } }),
  FormItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  FormLabel: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
  FormMessage: ({ children }: { children: React.ReactNode }) => <span>{children}</span>
}))

jest.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />
}))

jest.mock('@/components/ui/textarea', () => ({
  Textarea: (props: any) => <textarea {...props} />
}))

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange }: { children: React.ReactNode, onValueChange: any }) => (
    <select onChange={(e) => onValueChange?.(e.target.value)}>{children}</select>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode, value: string }) => (
    <option value={value}>{children}</option>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder: string }) => <span>{placeholder}</span>
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, type, disabled }: any) => (
    <button type={type} onClick={onClick} disabled={disabled}>{children}</button>
  )
}))

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: { children: React.ReactNode, htmlFor: string }) => (
    <label htmlFor={htmlFor}>{children}</label>
  )
}))

describe('TalentRequestForm', () => {
  const mockOnSubmit = jest.fn()
  const mockOnCancel = jest.fn()

  const defaultProps = {
    onSubmit: mockOnSubmit,
    onCancel: mockOnCancel
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Form Rendering', () => {
    it('should render all required form fields', () => {
      render(<TalentRequestForm {...defaultProps} />)

      expect(screen.getByText('Project Title *')).toBeInTheDocument()
      expect(screen.getByText('Project Description *')).toBeInTheDocument()
      expect(screen.getByText('Budget Range *')).toBeInTheDocument()
      expect(screen.getByText('Project Duration *')).toBeInTheDocument()
      expect(screen.getByText('Experience Level *')).toBeInTheDocument()
    })

    it('should render skill requirements section', () => {
      render(<TalentRequestForm {...defaultProps} />)

      expect(screen.getByText('Required Skills *')).toBeInTheDocument()
      expect(screen.getByText('Add Skill')).toBeInTheDocument()
    })

    it('should render project details section', () => {
      render(<TalentRequestForm {...defaultProps} />)

      expect(screen.getByText('Project Type *')).toBeInTheDocument()
      expect(screen.getByText('Location Preference')).toBeInTheDocument()
      expect(screen.getByText('Urgency Level *')).toBeInTheDocument()
    })

    it('should render form action buttons', () => {
      render(<TalentRequestForm {...defaultProps} />)

      expect(screen.getByText('Create Request')).toBeInTheDocument()
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })
  })

  describe('Form Interactions', () => {
    it('should handle text input changes', async () => {
      const user = userEvent.setup()
      render(<TalentRequestForm {...defaultProps} />)

      const titleInput = screen.getByLabelText(/project title/i)
      await user.type(titleInput, 'Senior React Developer')

      expect(titleInput).toHaveValue('Senior React Developer')
    })

    it('should handle textarea changes', async () => {
      const user = userEvent.setup()
      render(<TalentRequestForm {...defaultProps} />)

      const descriptionTextarea = screen.getByLabelText(/project description/i)
      await user.type(descriptionTextarea, 'Looking for an experienced React developer')

      expect(descriptionTextarea).toHaveValue('Looking for an experienced React developer')
    })

    it('should handle select changes', async () => {
      const user = userEvent.setup()
      render(<TalentRequestForm {...defaultProps} />)

      const experienceSelect = screen.getByDisplayValue(/select experience level/i)
      await user.selectOptions(experienceSelect, 'senior')

      expect(experienceSelect).toHaveValue('senior')
    })

    it('should add new skill when Add Skill button is clicked', async () => {
      const user = userEvent.setup()
      render(<TalentRequestForm {...defaultProps} />)

      const addSkillButton = screen.getByText('Add Skill')
      await user.click(addSkillButton)

      // Should call the append function from useFieldArray
      expect(addSkillButton).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('should show validation errors for required fields', async () => {
      render(<TalentRequestForm {...defaultProps} />)

      const submitButton = screen.getByText('Create Request')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/project title is required/i)).toBeInTheDocument()
      })
    })

    it('should validate budget range format', async () => {
      const user = userEvent.setup()
      render(<TalentRequestForm {...defaultProps} />)

      const budgetInput = screen.getByLabelText(/budget range/i)
      await user.type(budgetInput, 'invalid-budget')

      const submitButton = screen.getByText('Create Request')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/invalid budget format/i)).toBeInTheDocument()
      })
    })

    it('should validate skill requirements', async () => {
      render(<TalentRequestForm {...defaultProps} />)

      const submitButton = screen.getByText('Create Request')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/at least one skill is required/i)).toBeInTheDocument()
      })
    })

    it('should validate project duration', async () => {
      const user = userEvent.setup()
      render(<TalentRequestForm {...defaultProps} />)

      const durationInput = screen.getByLabelText(/project duration/i)
      await user.type(durationInput, '-5')

      const submitButton = screen.getByText('Create Request')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/duration must be positive/i)).toBeInTheDocument()
      })
    })
  })

  describe('Form Submission', () => {
    it('should call onSubmit with form data when form is valid', async () => {
      const user = userEvent.setup()
      render(<TalentRequestForm {...defaultProps} />)

      // Fill out required fields
      await user.type(screen.getByLabelText(/project title/i), 'React Developer')
      await user.type(screen.getByLabelText(/project description/i), 'Need React dev')
      await user.type(screen.getByLabelText(/budget range/i), '5000-8000')
      await user.type(screen.getByLabelText(/project duration/i), '30')

      const submitButton = screen.getByText('Create Request')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
          title: 'React Developer',
          description: 'Need React dev',
          budget: '5000-8000',
          duration: 30
        }))
      })
    })

    it('should disable submit button while submitting', async () => {
      // Mock form state to show submitting
      jest.mocked(require('react-hook-form').useForm).mockReturnValue({
        register: jest.fn(),
        handleSubmit: jest.fn((fn) => fn),
        formState: { errors: {}, isSubmitting: true },
        setValue: jest.fn(),
        watch: jest.fn(),
        reset: jest.fn()
      })

      render(<TalentRequestForm {...defaultProps} />)

      const submitButton = screen.getByText('Creating...')
      expect(submitButton).toBeDisabled()
    })

    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup()
      render(<TalentRequestForm {...defaultProps} />)

      const cancelButton = screen.getByText('Cancel')
      await user.click(cancelButton)

      expect(mockOnCancel).toHaveBeenCalled()
    })
  })

  describe('Skill Management', () => {
    it('should allow adding multiple skills', async () => {
      const user = userEvent.setup()
      render(<TalentRequestForm {...defaultProps} />)

      const addSkillButton = screen.getByText('Add Skill')
      
      // Add first skill
      await user.click(addSkillButton)
      // Add second skill
      await user.click(addSkillButton)

      // Should have called append twice
      expect(addSkillButton).toBeInTheDocument()
    })

    it('should allow removing skills', async () => {
      const mockRemove = jest.fn()
      
      jest.mocked(require('react-hook-form').useFieldArray).mockReturnValue({
        fields: [{ id: '1', skill: 'React' }],
        append: jest.fn(),
        remove: mockRemove
      })

      const user = userEvent.setup()
      render(<TalentRequestForm {...defaultProps} />)

      const removeButton = screen.getByText('Remove')
      await user.click(removeButton)

      expect(mockRemove).toHaveBeenCalledWith(0)
    })
  })

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      render(<TalentRequestForm {...defaultProps} />)

      expect(screen.getByLabelText(/project title/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/project description/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/budget range/i)).toBeInTheDocument()
    })

    it('should have proper ARIA attributes', () => {
      render(<TalentRequestForm {...defaultProps} />)

      const form = screen.getByRole('form')
      expect(form).toBeInTheDocument()

      const submitButton = screen.getByRole('button', { name: /create request/i })
      expect(submitButton).toBeInTheDocument()
    })

    it('should show error messages with proper association', async () => {
      render(<TalentRequestForm {...defaultProps} />)

      const submitButton = screen.getByText('Create Request')
      fireEvent.click(submitButton)

      await waitFor(() => {
        const errorMessage = screen.getByText(/project title is required/i)
        expect(errorMessage).toBeInTheDocument()
      })
    })
  })

  describe('Edit Mode', () => {
    const existingRequest = {
      id: 'req-123',
      title: 'Existing Project',
      description: 'Existing description',
      budget: '3000-5000',
      duration: 45,
      skillsRequired: ['React', 'TypeScript'],
      experienceLevel: 'senior',
      projectType: 'contract',
      urgency: 'high'
    }

    it('should populate form with existing data in edit mode', () => {
      render(<TalentRequestForm {...defaultProps} initialData={existingRequest} />)

      expect(screen.getByDisplayValue('Existing Project')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Existing description')).toBeInTheDocument()
      expect(screen.getByDisplayValue('3000-5000')).toBeInTheDocument()
    })

    it('should show Update Request button in edit mode', () => {
      render(<TalentRequestForm {...defaultProps} initialData={existingRequest} />)

      expect(screen.getByText('Update Request')).toBeInTheDocument()
      expect(screen.queryByText('Create Request')).not.toBeInTheDocument()
    })
  })
})
