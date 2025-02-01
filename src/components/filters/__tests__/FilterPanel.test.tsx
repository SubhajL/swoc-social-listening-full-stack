/// <reference types="vitest" />
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { FilterPanel } from '../FilterPanel';

describe('FilterPanel', () => {
  const defaultProps = {
    selectedSubCategories: [],
    onSubCategoryChange: vi.fn(),
    selectedProvince: null,
    onProvinceChange: vi.fn(),
    selectedOffice: null,
    onOfficeChange: vi.fn(),
    provinces: ['Bangkok', 'Chiang Mai', 'Phuket'],
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
    const onSubCategoryChange = vi.fn();
    
    render(
      <FilterPanel
        {...defaultProps}
        onSubCategoryChange={onSubCategoryChange}
      />
    );

    const checkbox = screen.getByRole('checkbox', {
      name: 'อาคารชลประทานชำรุด',
    });
    await user.click(checkbox);

    expect(onSubCategoryChange).toHaveBeenCalledWith(['อาคารชลประทานชำรุด']);
  });

  it('handles province selection', async () => {
    const user = userEvent.setup();
    const onProvinceChange = vi.fn();
    
    render(
      <FilterPanel
        {...defaultProps}
        onProvinceChange={onProvinceChange}
      />
    );

    // Find and click the province combobox
    const combobox = screen.getByRole('combobox', { name: /จังหวัด/i });
    await user.click(combobox);

    // Wait for and select Bangkok from the dropdown
    const bangkokOption = await screen.findByRole('option', { name: 'Bangkok' });
    await user.click(bangkokOption);

    expect(onProvinceChange).toHaveBeenCalledWith('Bangkok');
  });

  it('shows selected subcategories as checked', () => {
    render(
      <FilterPanel
        {...defaultProps}
        selectedSubCategories={['อาคารชลประทานชำรุด']}
      />
    );

    const checkbox = screen.getByRole('checkbox', {
      name: 'อาคารชลประทานชำรุด',
    });
    expect(checkbox).toHaveAttribute('aria-checked', 'true');
  });
}); 