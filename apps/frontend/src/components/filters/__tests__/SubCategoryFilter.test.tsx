import { render, screen, fireEvent } from '@testing-library/react';
import { SubCategoryFilter } from '../SubCategoryFilter';
import { CategoryName, SubCategories } from '@/types/processed-post';

describe('SubCategoryFilter', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when no category is selected', () => {
    render(
      <SubCategoryFilter
        category={null}
        selectedSubCategory={null}
        onSubCategoryChange={mockOnChange}
      />
    );

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('renders subcategories for REPORT_INCIDENT', () => {
    render(
      <SubCategoryFilter
        category={CategoryName.REPORT_INCIDENT}
        selectedSubCategory={null}
        onSubCategoryChange={mockOnChange}
      />
    );

    const combobox = screen.getByRole('combobox', { name: 'หมวดหมู่ย่อย' });
    fireEvent.click(combobox);

    // Check for non-"ทั้งหมด" subcategories
    const nonAllSubCategories = SubCategories[CategoryName.REPORT_INCIDENT].filter(sub => sub !== 'ทั้งหมด');
    nonAllSubCategories.forEach((subCategory) => {
      expect(screen.getByRole('option', { name: subCategory })).toBeInTheDocument();
    });

    // Check for "ทั้งหมด" option
    const allOptions = screen.getAllByRole('option', { name: 'ทั้งหมด' });
    expect(allOptions.length).toBe(1);
  });

  it('shows selected subcategory', () => {
    const selectedSubCategory = SubCategories[CategoryName.REPORT_INCIDENT].find(sub => sub !== 'ทั้งหมด')!;
    render(
      <SubCategoryFilter
        category={CategoryName.REPORT_INCIDENT}
        selectedSubCategory={selectedSubCategory}
        onSubCategoryChange={mockOnChange}
      />
    );

    const combobox = screen.getByRole('combobox', { name: 'หมวดหมู่ย่อย' });
    expect(combobox).toHaveTextContent(selectedSubCategory);
  });
}); 