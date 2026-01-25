import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  StatusBadge,
  CategoryBadge,
  PriorityBadge,
  TeamBadge,
  RegionBadge,
} from '../ui/Badge';

describe('StatusBadge', () => {
  it('renders pending status', () => {
    render(<StatusBadge status="pending" />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('renders backlog status', () => {
    render(<StatusBadge status="backlog" />);
    expect(screen.getByText('Backlog')).toBeInTheDocument();
  });

  it('renders in_progress status', () => {
    render(<StatusBadge status="in_progress" />);
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('renders completed status', () => {
    render(<StatusBadge status="completed" />);
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('renders rejected status with strikethrough', () => {
    render(<StatusBadge status="rejected" />);
    const badge = screen.getByText('Rejected');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('line-through');
  });

  it('renders duplicate status', () => {
    render(<StatusBadge status="duplicate" />);
    expect(screen.getByText('Duplicate')).toBeInTheDocument();
  });

  it('renders unknown status as-is', () => {
    render(<StatusBadge status="custom_status" />);
    expect(screen.getByText('custom_status')).toBeInTheDocument();
  });

  it('has correct styling classes', () => {
    render(<StatusBadge status="completed" />);
    const badge = screen.getByText('Completed');
    expect(badge).toHaveClass('inline-flex', 'items-center', 'rounded-md');
  });
});

describe('CategoryBadge', () => {
  it('renders bug category with icon', () => {
    render(<CategoryBadge category="bug" />);
    expect(screen.getByText('Bug')).toBeInTheDocument();
    // Check for SVG icon
    const badge = screen.getByText('Bug').closest('span');
    expect(badge.querySelector('svg')).toBeInTheDocument();
  });

  it('renders new_feature category with icon', () => {
    render(<CategoryBadge category="new_feature" />);
    expect(screen.getByText('Feature')).toBeInTheDocument();
    const badge = screen.getByText('Feature').closest('span');
    expect(badge.querySelector('svg')).toBeInTheDocument();
  });

  it('renders optimization category with icon', () => {
    render(<CategoryBadge category="optimization" />);
    expect(screen.getByText('Optimize')).toBeInTheDocument();
    const badge = screen.getByText('Optimize').closest('span');
    expect(badge.querySelector('svg')).toBeInTheDocument();
  });

  it('renders unknown category without icon', () => {
    render(<CategoryBadge category="unknown_category" />);
    expect(screen.getByText('unknown_category')).toBeInTheDocument();
  });

  it('has correct base styling', () => {
    render(<CategoryBadge category="bug" />);
    const badge = screen.getByText('Bug').closest('span');
    expect(badge).toHaveClass('inline-flex', 'items-center', 'gap-1.5');
  });
});

describe('PriorityBadge', () => {
  it('renders low priority', () => {
    render(<PriorityBadge priority="low" />);
    expect(screen.getByText('Low')).toBeInTheDocument();
  });

  it('renders medium priority with amber styling', () => {
    render(<PriorityBadge priority="medium" />);
    const badge = screen.getByText('Med');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-amber-50', 'text-amber-700');
  });

  it('renders high priority with red styling', () => {
    render(<PriorityBadge priority="high" />);
    const badge = screen.getByText('High');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-red-50', 'text-red-700');
  });

  it('renders unknown priority with default styling', () => {
    render(<PriorityBadge priority="critical" />);
    expect(screen.getByText('critical')).toBeInTheDocument();
  });

  it('has correct base styling', () => {
    render(<PriorityBadge priority="low" />);
    const badge = screen.getByText('Low');
    expect(badge).toHaveClass('inline-flex', 'items-center', 'rounded');
  });
});

describe('TeamBadge', () => {
  it('renders Manufacturing team', () => {
    render(<TeamBadge team="Manufacturing" />);
    expect(screen.getByText('Manufacturing')).toBeInTheDocument();
  });

  it('renders Sales team', () => {
    render(<TeamBadge team="Sales" />);
    expect(screen.getByText('Sales')).toBeInTheDocument();
  });

  it('renders Service team', () => {
    render(<TeamBadge team="Service" />);
    expect(screen.getByText('Service')).toBeInTheDocument();
  });

  it('renders Energy team', () => {
    render(<TeamBadge team="Energy" />);
    expect(screen.getByText('Energy')).toBeInTheDocument();
  });

  it('renders unknown team as-is', () => {
    render(<TeamBadge team="Research" />);
    expect(screen.getByText('Research')).toBeInTheDocument();
  });

  it('has building icon', () => {
    render(<TeamBadge team="Sales" />);
    const badge = screen.getByText('Sales').closest('span');
    expect(badge.querySelector('svg')).toBeInTheDocument();
  });

  it('has correct styling', () => {
    render(<TeamBadge team="Sales" />);
    const badge = screen.getByText('Sales').closest('span');
    expect(badge).toHaveClass('text-indigo-700', 'bg-indigo-50', 'border-indigo-200');
  });
});

describe('RegionBadge', () => {
  it('renders EMEA region', () => {
    render(<RegionBadge region="EMEA" />);
    expect(screen.getByText('EMEA')).toBeInTheDocument();
  });

  it('renders North America as NA', () => {
    render(<RegionBadge region="North America" />);
    expect(screen.getByText('NA')).toBeInTheDocument();
  });

  it('renders APAC region', () => {
    render(<RegionBadge region="APAC" />);
    expect(screen.getByText('APAC')).toBeInTheDocument();
  });

  it('renders Global region', () => {
    render(<RegionBadge region="Global" />);
    expect(screen.getByText('Global')).toBeInTheDocument();
  });

  it('renders unknown region as-is', () => {
    render(<RegionBadge region="LATAM" />);
    expect(screen.getByText('LATAM')).toBeInTheDocument();
  });

  it('has globe icon', () => {
    render(<RegionBadge region="EMEA" />);
    const badge = screen.getByText('EMEA').closest('span');
    expect(badge.querySelector('svg')).toBeInTheDocument();
  });

  it('has correct styling', () => {
    render(<RegionBadge region="APAC" />);
    const badge = screen.getByText('APAC').closest('span');
    expect(badge).toHaveClass('text-purple-700', 'bg-purple-50', 'border-purple-200');
  });
});
