import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input, Textarea } from '../ui/Input';

describe('Input', () => {
  it('renders input element', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('renders label when provided', () => {
    render(<Input label="Email Address" />);
    expect(screen.getByText('Email Address')).toBeInTheDocument();
  });

  it('does not render label when not provided', () => {
    render(<Input placeholder="No label" />);
    expect(screen.queryByRole('label')).not.toBeInTheDocument();
  });

  it('renders error message when provided', () => {
    render(<Input error="This field is required" />);
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('does not render error when not provided', () => {
    render(<Input placeholder="No error" />);
    expect(screen.queryByText(/required/i)).not.toBeInTheDocument();
  });

  it('applies error styling when error is present', () => {
    render(<Input error="Error message" data-testid="input" />);
    const input = screen.getByTestId('input');
    expect(input).toHaveClass('border-red-300');
  });

  it('passes through additional props', () => {
    render(<Input type="email" name="email" data-testid="email-input" />);
    const input = screen.getByTestId('email-input');
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAttribute('name', 'email');
  });

  it('handles value changes', () => {
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} data-testid="input" />);

    const input = screen.getByTestId('input');
    fireEvent.change(input, { target: { value: 'test value' } });

    expect(handleChange).toHaveBeenCalled();
  });

  it('can be disabled', () => {
    render(<Input disabled data-testid="input" />);
    const input = screen.getByTestId('input');
    expect(input).toBeDisabled();
    expect(input).toHaveClass('disabled:bg-neutral-50');
  });

  it('applies custom className', () => {
    render(<Input className="custom-class" data-testid="input" />);
    const input = screen.getByTestId('input');
    expect(input).toHaveClass('custom-class');
  });

  it('has proper focus styling classes', () => {
    render(<Input data-testid="input" />);
    const input = screen.getByTestId('input');
    expect(input).toHaveClass('focus:outline-none', 'focus:border-[#4F46E5]');
  });

  it('has proper hover styling classes', () => {
    render(<Input data-testid="input" />);
    const input = screen.getByTestId('input');
    expect(input).toHaveClass('hover:border-neutral-300');
  });

  it('renders with required attribute', () => {
    render(<Input required data-testid="input" />);
    const input = screen.getByTestId('input');
    expect(input).toBeRequired();
  });

  it('shows placeholder text', () => {
    render(<Input placeholder="Type here..." />);
    expect(screen.getByPlaceholderText('Type here...')).toBeInTheDocument();
  });
});

describe('Textarea', () => {
  it('renders textarea element', () => {
    render(<Textarea placeholder="Enter description" />);
    expect(screen.getByPlaceholderText('Enter description')).toBeInTheDocument();
  });

  it('renders label when provided', () => {
    render(<Textarea label="Description" />);
    expect(screen.getByText('Description')).toBeInTheDocument();
  });

  it('does not render label when not provided', () => {
    render(<Textarea placeholder="No label" />);
    expect(screen.queryByRole('label')).not.toBeInTheDocument();
  });

  it('renders error message when provided', () => {
    render(<Textarea error="Description is required" />);
    expect(screen.getByText('Description is required')).toBeInTheDocument();
  });

  it('applies error styling when error is present', () => {
    render(<Textarea error="Error" data-testid="textarea" />);
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toHaveClass('border-red-300');
  });

  it('has default rows of 3', () => {
    render(<Textarea data-testid="textarea" />);
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toHaveAttribute('rows', '3');
  });

  it('allows custom rows', () => {
    render(<Textarea rows={5} data-testid="textarea" />);
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toHaveAttribute('rows', '5');
  });

  it('handles value changes', () => {
    const handleChange = vi.fn();
    render(<Textarea onChange={handleChange} data-testid="textarea" />);

    const textarea = screen.getByTestId('textarea');
    fireEvent.change(textarea, { target: { value: 'long text content' } });

    expect(handleChange).toHaveBeenCalled();
  });

  it('can be disabled', () => {
    render(<Textarea disabled data-testid="textarea" />);
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toBeDisabled();
  });

  it('applies custom className', () => {
    render(<Textarea className="custom-class" data-testid="textarea" />);
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toHaveClass('custom-class');
  });

  it('has resize-none class', () => {
    render(<Textarea data-testid="textarea" />);
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toHaveClass('resize-none');
  });

  it('passes through additional props', () => {
    render(<Textarea name="description" maxLength={500} data-testid="textarea" />);
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toHaveAttribute('name', 'description');
    expect(textarea).toHaveAttribute('maxLength', '500');
  });

  it('renders with required attribute', () => {
    render(<Textarea required data-testid="textarea" />);
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toBeRequired();
  });

  it('has proper focus styling classes', () => {
    render(<Textarea data-testid="textarea" />);
    const textarea = screen.getByTestId('textarea');
    expect(textarea).toHaveClass('focus:outline-none', 'focus:border-[#4F46E5]');
  });
});
