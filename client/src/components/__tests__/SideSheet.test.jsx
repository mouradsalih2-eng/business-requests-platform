import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SideSheet } from '../ui/SideSheet';

describe('SideSheet', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    document.body.style.overflow = 'unset';
  });

  afterEach(() => {
    document.body.style.overflow = 'unset';
  });

  it('renders with correct title', () => {
    render(
      <SideSheet isOpen={true} onClose={mockOnClose} title="Filter Options">
        <p>Content</p>
      </SideSheet>
    );
    expect(screen.getByText('Filter Options')).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(
      <SideSheet isOpen={true} onClose={mockOnClose} title="Settings">
        <div data-testid="settings-content">
          <p>Setting 1</p>
          <p>Setting 2</p>
        </div>
      </SideSheet>
    );
    expect(screen.getByTestId('settings-content')).toBeInTheDocument();
    expect(screen.getByText('Setting 1')).toBeInTheDocument();
  });

  it('applies translate-x-0 when open', () => {
    render(
      <SideSheet isOpen={true} onClose={mockOnClose} title="Test">
        <p>Content</p>
      </SideSheet>
    );

    const sheet = screen.getByRole('dialog');
    expect(sheet).toHaveClass('translate-x-0');
  });

  it('applies translate-x-full when closed', () => {
    render(
      <SideSheet isOpen={false} onClose={mockOnClose} title="Test">
        <p>Content</p>
      </SideSheet>
    );

    const sheet = screen.getByRole('dialog');
    expect(sheet).toHaveClass('translate-x-full');
  });

  it('locks body scroll when open', () => {
    render(
      <SideSheet isOpen={true} onClose={mockOnClose} title="Test">
        <p>Content</p>
      </SideSheet>
    );
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('unlocks body scroll when closed', () => {
    const { rerender } = render(
      <SideSheet isOpen={true} onClose={mockOnClose} title="Test">
        <p>Content</p>
      </SideSheet>
    );
    expect(document.body.style.overflow).toBe('hidden');

    rerender(
      <SideSheet isOpen={false} onClose={mockOnClose} title="Test">
        <p>Content</p>
      </SideSheet>
    );
    expect(document.body.style.overflow).toBe('unset');
  });

  it('calls onClose when Escape key is pressed', () => {
    render(
      <SideSheet isOpen={true} onClose={mockOnClose} title="Test">
        <p>Content</p>
      </SideSheet>
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when closed and Escape is pressed', () => {
    render(
      <SideSheet isOpen={false} onClose={mockOnClose} title="Test">
        <p>Content</p>
      </SideSheet>
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('calls onClose when backdrop is clicked', () => {
    render(
      <SideSheet isOpen={true} onClose={mockOnClose} title="Test">
        <p>Content</p>
      </SideSheet>
    );

    const backdrop = document.querySelector('[aria-hidden="true"]');
    fireEvent.click(backdrop);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when back button is clicked', () => {
    render(
      <SideSheet isOpen={true} onClose={mockOnClose} title="Test">
        <p>Content</p>
      </SideSheet>
    );

    const backButton = screen.getByRole('button', { name: /go back/i });
    fireEvent.click(backButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('has proper accessibility attributes', () => {
    render(
      <SideSheet isOpen={true} onClose={mockOnClose} title="Accessible Sheet">
        <p>Content</p>
      </SideSheet>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'sidesheet-title');
  });

  it('shows backdrop with opacity when open', () => {
    render(
      <SideSheet isOpen={true} onClose={mockOnClose} title="Test">
        <p>Content</p>
      </SideSheet>
    );

    const backdrop = document.querySelector('[aria-hidden="true"]');
    expect(backdrop).toHaveClass('opacity-100');
    expect(backdrop).not.toHaveClass('pointer-events-none');
  });

  it('hides backdrop when closed', () => {
    render(
      <SideSheet isOpen={false} onClose={mockOnClose} title="Test">
        <p>Content</p>
      </SideSheet>
    );

    const backdrop = document.querySelector('[aria-hidden="true"]');
    expect(backdrop).toHaveClass('opacity-0', 'pointer-events-none');
  });

  it('cleans up event listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

    const { unmount } = render(
      <SideSheet isOpen={true} onClose={mockOnClose} title="Test">
        <p>Content</p>
      </SideSheet>
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    removeEventListenerSpy.mockRestore();
  });

  it('restores body overflow on unmount', () => {
    const { unmount } = render(
      <SideSheet isOpen={true} onClose={mockOnClose} title="Test">
        <p>Content</p>
      </SideSheet>
    );

    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('unset');
  });

  it('has max-width constraint', () => {
    render(
      <SideSheet isOpen={true} onClose={mockOnClose} title="Test">
        <p>Content</p>
      </SideSheet>
    );

    const sheet = screen.getByRole('dialog');
    expect(sheet).toHaveClass('max-w-sm');
  });

  it('has scrollable content area', () => {
    render(
      <SideSheet isOpen={true} onClose={mockOnClose} title="Test">
        <div style={{ height: '2000px' }}>Long content</div>
      </SideSheet>
    );

    const contentArea = screen.getByText('Long content').parentElement;
    expect(contentArea).toHaveClass('overflow-y-auto');
  });
});
