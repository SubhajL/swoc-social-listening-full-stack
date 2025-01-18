/// <reference types="vitest" />
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterPanel } from '../FilterPanel';
import { CategoryName, SubCategories } from '@/types/processed-post';
import { vi } from 'vitest';

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
      onClick={() => {
        onCheckedChange(!checked);
        // Force a re-render by updating the data-state
        const button = document.getElementById(id);
        if (button) {
          button.setAttribute('data-state', !checked ? 'checked' : 'unchecked');
          button.setAttribute('aria-checked', String(!checked));
        }
      }}
      id={id}
      {...props}
    />
  ),
  Indicator: ({ children }: any) => children
}));

describe('FilterPanel', () => {
  const defaultProps = {
    selectedSubCategories: [],
    selectedProvince: null,
    selectedOffice: null,
    onOfficeChange: () => {},
    provinces: ['กรุงเทพมหานคร', 'เชียงใหม่']
  };

  it('renders all categories and their subcategories', () => {
    render(<FilterPanel {...defaultProps} onSubCategoryChange={() => {}} onProvinceChange={() => {}} />);

    // Check each category and its subcategories
    Object.entries(SubCategories).forEach(([category, categorySubCategories]) => {
      // Check if category heading exists
      const headings = screen.getAllByRole('heading');
      expect(headings.some(h => h.textContent === category)).toBe(true);

      // Check each subcategory using exact label text
      (categorySubCategories as string[]).forEach((subCategory: string) => {
        const checkbox = screen.getByLabelText(subCategory, { exact: true });
        expect(checkbox).toBeInTheDocument();
        expect(checkbox).toHaveAttribute('data-state', 'unchecked');
      });
    });
  });

  it('handles subcategory selection', async () => {
    const user = userEvent.setup();
    const handleSubCategoryChange = vi.fn();

    render(<FilterPanel {...defaultProps} onSubCategoryChange={handleSubCategoryChange} onProvinceChange={() => {}} />);

    // Click a subcategory checkbox using exact label text
    const checkbox = screen.getByLabelText('อาคารชลประทานชำรุด', { exact: true });
    await user.click(checkbox);

    expect(handleSubCategoryChange).toHaveBeenCalledWith('อาคารชลประทานชำรุด', true);
    await waitFor(() => {
      expect(checkbox).toHaveAttribute('data-state', 'checked');
    });
  });

  it('handles province selection', async () => {
    const user = userEvent.setup();
    const handleProvinceChange = vi.fn();

    render(<FilterPanel {...defaultProps} onSubCategoryChange={() => {}} onProvinceChange={handleProvinceChange} />);

    // Click the province select trigger
    const trigger = screen.getByRole('combobox', { name: 'จังหวัด' });
    await user.click(trigger);

    // Wait for and click the province option
    const option = await screen.findByRole('option', { name: 'เชียงใหม่' });
    await user.click(option);

    expect(handleProvinceChange).toHaveBeenCalledWith('เชียงใหม่');
  });

  it('shows selected subcategories as checked', () => {
    render(
      <FilterPanel
        {...defaultProps}
        selectedSubCategories={['อาคารชลประทานชำรุด']}
        onSubCategoryChange={() => {}}
        onProvinceChange={() => {}}
      />
    );

    const checkbox = screen.getByLabelText('อาคารชลประทานชำรุด', { exact: true });
    expect(checkbox).toHaveAttribute('data-state', 'checked');
  });
}); 