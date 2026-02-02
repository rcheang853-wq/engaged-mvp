import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Form,
  FormField,
  FormLabel,
  FormInput,
  FormTextarea,
  FormError,
  FormHelp,
  FormSection,
  PasswordInput,
} from '@/components/ui/form-components';

describe('Form Components', () => {
  describe('Form', () => {
    it('renders form element correctly', () => {
      render(
        <Form data-testid="test-form">
          <div>Form content</div>
        </Form>
      );

      const form = screen.getByTestId('test-form');
      expect(form.tagName).toBe('FORM');
      expect(form).toHaveClass('space-y-6');
    });

    it('forwards form props correctly', () => {
      const handleSubmit = jest.fn(e => e.preventDefault());
      render(
        <Form onSubmit={handleSubmit} data-testid="test-form">
          <button type="submit">Submit</button>
        </Form>
      );

      fireEvent.submit(screen.getByTestId('test-form'));
      expect(handleSubmit).toHaveBeenCalled();
    });
  });

  describe('FormField', () => {
    it('renders with correct spacing classes', () => {
      render(
        <FormField data-testid="form-field">
          <div>Field content</div>
        </FormField>
      );

      expect(screen.getByTestId('form-field')).toHaveClass('space-y-2');
    });

    it('applies custom className', () => {
      render(
        <FormField className="custom-class" data-testid="form-field">
          <div>Field content</div>
        </FormField>
      );

      expect(screen.getByTestId('form-field')).toHaveClass('space-y-2', 'custom-class');
    });
  });

  describe('FormLabel', () => {
    it('renders label with correct text', () => {
      render(<FormLabel htmlFor="test-input">Test Label</FormLabel>);

      const label = screen.getByText('Test Label');
      expect(label.tagName).toBe('LABEL');
      expect(label).toHaveAttribute('for', 'test-input');
    });

    it('shows required indicator when required prop is true', () => {
      render(<FormLabel required>Required Field</FormLabel>);

      expect(screen.getByText('Required Field')).toBeInTheDocument();
      expect(screen.getByText('*')).toBeInTheDocument();
      expect(screen.getByText('*')).toHaveClass('text-red-500');
    });

    it('does not show required indicator when required prop is false', () => {
      render(<FormLabel required={false}>Optional Field</FormLabel>);

      expect(screen.getByText('Optional Field')).toBeInTheDocument();
      expect(screen.queryByText('*')).not.toBeInTheDocument();
    });
  });

  describe('FormInput', () => {
    it('renders input with default variant', () => {
      render(<FormInput data-testid="test-input" />);

      const input = screen.getByTestId('test-input');
      expect(input.tagName).toBe('INPUT');
      expect(input).toHaveAttribute('type', 'text');
    });

    it('applies error variant when error prop is true', () => {
      render(<FormInput error={true} data-testid="test-input" />);

      const input = screen.getByTestId('test-input');
      expect(input).toHaveClass('border-red-500', 'focus-visible:ring-red-500');
    });

    it('accepts different input types', () => {
      render(<FormInput type="email" data-testid="test-input" />);

      expect(screen.getByTestId('test-input')).toHaveAttribute('type', 'email');
    });

    it('forwards input props correctly', async () => {
      const user = userEvent.setup();
      render(
        <FormInput
          placeholder="Enter text"
          data-testid="test-input"
        />
      );

      const input = screen.getByTestId('test-input');
      expect(input).toHaveAttribute('placeholder', 'Enter text');

      await user.type(input, 'test value');
      expect(input).toHaveValue('test value');
    });
  });

  describe('FormTextarea', () => {
    it('renders textarea element', () => {
      render(<FormTextarea data-testid="test-textarea" />);

      const textarea = screen.getByTestId('test-textarea');
      expect(textarea.tagName).toBe('TEXTAREA');
    });

    it('applies error styles when error prop is true', () => {
      render(<FormTextarea error={true} data-testid="test-textarea" />);

      const textarea = screen.getByTestId('test-textarea');
      expect(textarea).toHaveClass('border-red-500', 'focus-visible:ring-red-500');
    });

    it('accepts textarea-specific props', async () => {
      const user = userEvent.setup();
      render(
        <FormTextarea
          placeholder="Enter long text"
          rows={5}
          data-testid="test-textarea"
        />
      );

      const textarea = screen.getByTestId('test-textarea');
      expect(textarea).toHaveAttribute('placeholder', 'Enter long text');
      expect(textarea).toHaveAttribute('rows', '5');

      await user.type(textarea, 'test content');
      expect(textarea).toHaveValue('test content');
    });
  });

  describe('FormError', () => {
    it('renders error message when children provided', () => {
      render(<FormError>This is an error message</FormError>);

      const error = screen.getByText('This is an error message');
      expect(error).toHaveClass('text-sm', 'font-medium', 'text-red-600');
    });

    it('does not render when children is empty or null', () => {
      const { container: container1 } = render(<FormError>{null}</FormError>);
      const { container: container2 } = render(<FormError>{''}</FormError>);
      const { container: container3 } = render(<FormError>{undefined}</FormError>);

      expect(container1.firstChild).toBeNull();
      expect(container2.firstChild).toBeNull();
      expect(container3.firstChild).toBeNull();
    });

    it('applies custom className', () => {
      render(
        <FormError className="custom-error">Error message</FormError>
      );

      expect(screen.getByText('Error message')).toHaveClass(
        'text-sm',
        'font-medium',
        'text-red-600',
        'custom-error'
      );
    });
  });

  describe('FormHelp', () => {
    it('renders help text with correct styling', () => {
      render(<FormHelp>This is help text</FormHelp>);

      const help = screen.getByText('This is help text');
      expect(help).toHaveClass('text-sm', 'text-gray-500');
    });

    it('applies custom className', () => {
      render(
        <FormHelp className="custom-help">Help text</FormHelp>
      );

      expect(screen.getByText('Help text')).toHaveClass(
        'text-sm',
        'text-gray-500',
        'custom-help'
      );
    });
  });

  describe('FormSection', () => {
    it('renders section with children', () => {
      render(
        <FormSection data-testid="form-section">
          <div>Section content</div>
        </FormSection>
      );

      expect(screen.getByTestId('form-section')).toBeInTheDocument();
      expect(screen.getByText('Section content')).toBeInTheDocument();
    });

    it('renders title when provided', () => {
      render(
        <FormSection title="Section Title">
          <div>Section content</div>
        </FormSection>
      );

      expect(screen.getByText('Section Title')).toBeInTheDocument();
      expect(screen.getByText('Section Title').tagName).toBe('H3');
    });

    it('renders description when provided', () => {
      render(
        <FormSection description="Section description">
          <div>Section content</div>
        </FormSection>
      );

      expect(screen.getByText('Section description')).toBeInTheDocument();
    });

    it('renders both title and description', () => {
      render(
        <FormSection title="Section Title" description="Section description">
          <div>Section content</div>
        </FormSection>
      );

      expect(screen.getByText('Section Title')).toBeInTheDocument();
      expect(screen.getByText('Section description')).toBeInTheDocument();
    });
  });

  describe('PasswordInput', () => {
    it('renders password input by default', () => {
      render(<PasswordInput data-testid="password-input" />);

      const input = screen.getByTestId('password-input');
      expect(input).toHaveAttribute('type', 'password');
    });

    it('shows toggle button by default', () => {
      render(<PasswordInput data-testid="password-input" />);

      const toggleButton = screen.getByRole('button');
      expect(toggleButton).toBeInTheDocument();
    });

    it('hides toggle button when showToggle is false', () => {
      render(<PasswordInput showToggle={false} data-testid="password-input" />);

      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('toggles password visibility when toggle button is clicked', async () => {
      const user = userEvent.setup();
      render(<PasswordInput data-testid="password-input" />);

      const input = screen.getByTestId('password-input');
      const toggleButton = screen.getByRole('button');

      // Initially should be password type
      expect(input).toHaveAttribute('type', 'password');

      // Click to show password
      await user.click(toggleButton);
      expect(input).toHaveAttribute('type', 'text');

      // Click to hide password again
      await user.click(toggleButton);
      expect(input).toHaveAttribute('type', 'password');
    });

    it('applies error styling when error prop is true', () => {
      render(<PasswordInput error={true} data-testid="password-input" />);

      const input = screen.getByTestId('password-input');
      expect(input).toHaveClass('border-red-500', 'focus-visible:ring-red-500');
    });

    it('forwards input props correctly', async () => {
      const user = userEvent.setup();
      render(
        <PasswordInput
          placeholder="Enter password"
          data-testid="password-input"
        />
      );

      const input = screen.getByTestId('password-input');
      expect(input).toHaveAttribute('placeholder', 'Enter password');

      await user.type(input, 'secret123');
      expect(input).toHaveValue('secret123');
    });

    it('includes relative positioning for toggle button', () => {
      render(<PasswordInput data-testid="password-input" />);

      const container = screen.getByTestId('password-input').parentElement;
      expect(container).toHaveClass('relative');
    });

    it('applies correct padding for toggle button space', () => {
      render(<PasswordInput data-testid="password-input" />);

      const input = screen.getByTestId('password-input');
      expect(input).toHaveClass('pr-10');
    });

    it('has proper accessibility for toggle button', async () => {
      const user = userEvent.setup();
      render(<PasswordInput data-testid="password-input" />);

      const toggleButton = screen.getByRole('button');
      expect(toggleButton).toHaveAttribute('type', 'button');

      // Button should be focusable and clickable
      await user.click(toggleButton);
      expect(toggleButton).toHaveAttribute('type', 'button');
    });
  });
});