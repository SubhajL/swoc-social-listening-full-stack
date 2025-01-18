/// <reference types="vitest" />
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { FilterPanel } from '../FilterPanel';
import { CategoryName, SubCategories } from '@/types/processed-post';

// Mock scrollIntoView since it's not implemented in JSDOM
Element.prototype.scrollIntoView = vi.fn();

describe('FilterPanel', () => {
  const defaultProps = {
    selectedSubCategories: [] as string[],
    onSubCategoryChange: vi.fn(),
    provinces: ['กรุงเทพมหานคร', 'เชียงใหม่'],
    selectedProvince: null as string | null,
    onProvinceChange: vi.fn(),
    selectedOffice: null as string | null,
    onOfficeChange: vi.fn(),
  };

  it('renders all categories and their subcategories', () => {
    render(<FilterPanel {...defaultProps} />);

    // Check each category and its subcategories
    Object.entries(SubCategories).forEach(([category, categorySubCategories]) => {
      // Check if category heading exists
      expect(screen.getByRole('heading', { name: category })).toBeInTheDocument();

      // Check each subcategory
      (categorySubCategories as string[]).forEach((subCategory: string) => {
        const checkbox = screen.getByRole('checkbox', { name: subCategory });
        expect(checkbox).toBeInTheDocument();
        expect(checkbox).toHaveAttribute('aria-checked', 'false');
      });
    });
  });

  it('handles subcategory selection', async () => {
    const user = userEvent.setup();
    const handleSubCategoryChange = vi.fn();

    render(<FilterPanel {...defaultProps} onSubCategoryChange={handleSubCategoryChange} />);

    // Click a subcategory checkbox
    const checkbox = screen.getByRole('checkbox', { name: 'อาคารชลประทานชำรุด' });
    await user.click(checkbox);

    expect(handleSubCategoryChange).toHaveBeenCalledWith('อาคารชลประทานชำรุด', true);
    expect(checkbox).toHaveAttribute('aria-checked', 'true');
  });

  it('handles province selection', async () => {
    const user = userEvent.setup();
    const handleProvinceChange = vi.fn();

    render(<FilterPanel {...defaultProps} onProvinceChange={handleProvinceChange} />);

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
      />
    );

    const checkbox = screen.getByRole('checkbox', { name: 'อาคารชลประทานชำรุด' });
    expect(checkbox).toHaveAttribute('aria-checked', 'true');
  });
}); 