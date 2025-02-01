/// <reference types="vitest" />
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { FilterPanel } from '../FilterPanel';
import { CategoryName } from '@/types/processed-post';

// Mock scrollIntoView and hasPointerCapture for JSDOM
Element.prototype.scrollIntoView = vi.fn();
Element.prototype.hasPointerCapture = () => false;

// Mock Radix UI checkbox component with proper state management
vi.mock('@radix-ui/react-checkbox', () => ({
  Root: ({ checked, onCheckedChange, id, ...props }: any) => (
    <button
      role="checkbox"
      aria-checked={checked}
      data-state={checked ? 'checked' : 'unchecked'}
      onClick={() => onCheckedChange(!checked)}
      id={id}
      {...props}
    />
  ),
  Indicator: ({ children }: any) => children
}));

// Mock Select component
vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }: any) => (
    <div>
      <button 
        role="combobox" 
        aria-label="จังหวัด"
        onClick={() => onValueChange('Bangkok')}
      >
        {value || 'ทุกจังหวัด'}
      </button>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: any) => children,
  SelectValue: ({ placeholder }: any) => placeholder,
  SelectContent: ({ children }: any) => <div role="listbox">{children}</div>,
  SelectItem: ({ value, children }: any) => (
    <div role="option" data-value={value}>
      {children}
    </div>
  )
}));

describe('FilterPanel', () => {
  const defaultProps = {
    selectedSubCategories: [],
    onSubCategoryChange: vi.fn(),
    selectedProvince: null,
    onProvinceChange: vi.fn(),
    selectedOffice: null,
    onOfficeChange: vi.fn(),
    provinces: ['Bangkok', 'Chiang Mai', 'Phuket']
  };

  it('renders all categories and their subcategories', () => {
    render(<FilterPanel {...defaultProps} />);
    expect(screen.getByText('การรายงานและแจ้งเหตุ')).toBeInTheDocument();
    expect(screen.getByText('การขอการสนับสนุน')).toBeInTheDocument();
    expect(screen.getByText('การขอข้อมูล')).toBeInTheDocument();
    expect(screen.getByText('ข้อเสนอแนะ')).toBeInTheDocument();
  });

  it('handles subcategory selection', async () => {
    const user = userEvent.setup();
    render(<FilterPanel {...defaultProps} />);

    // Find and click a subcategory checkbox
    const checkbox = screen.getByRole('checkbox', { name: 'อาคารชลประทานชำรุด' });
    await user.click(checkbox);

    expect(defaultProps.onSubCategoryChange).toHaveBeenCalledWith('อาคารชลประทานชำรุด', true);
  });

  it('handles province selection', async () => {
    const user = userEvent.setup();
    render(<FilterPanel {...defaultProps} />);

    // Find the province select container
    const provinceContainer = screen.getByTestId('province-select');
    const combobox = within(provinceContainer).getByRole('combobox', { name: 'จังหวัด' });
    await user.click(combobox);

    expect(defaultProps.onProvinceChange).toHaveBeenCalledWith('Bangkok');
  });

  it('shows selected subcategories as checked', () => {
    render(
      <FilterPanel
        {...defaultProps}
        selectedSubCategories={['อาคารชลประทานชำรุด']}
      />
    );

    const checkbox = screen.getByRole('checkbox', { name: 'อาคารชลประทานชำรุด' });
    expect(checkbox).toHaveAttribute('aria-checked', 'true');
  });
}); 