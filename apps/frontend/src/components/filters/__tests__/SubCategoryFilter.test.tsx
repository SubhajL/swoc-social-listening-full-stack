import { render, screen, fireEvent } from '@testing-library/react';
import { SubCategoryFilter } from '../SubCategoryFilter';
import { CategoryName, SubCategories } from '@/types/processed-post';

describe('SubCategoryFilter', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders nothing when no category is selected', () => {
    const { container } = render(
      <SubCategoryFilter
        category={null}
        selectedSubCategory={null}
        onSubCategoryChange={mockOnChange}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders subcategories for REPORT_INCIDENT', () => {
    render(
      <SubCategoryFilter
        category={CategoryName.REPORT_INCIDENT}
        selectedSubCategory={null}
        onSubCategoryChange={mockOnChange}
      />
    );

    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);

    SubCategories[CategoryName.REPORT_INCIDENT].forEach(subCategory => {
      expect(screen.getByText(subCategory)).toBeInTheDocument();
    });
  });

  it('shows selected subcategory', () => {
    const selectedSubCategory = SubCategories[CategoryName.REPORT_INCIDENT][1];
    render(
      <SubCategoryFilter
        category={CategoryName.REPORT_INCIDENT}
        selectedSubCategory={selectedSubCategory}
        onSubCategoryChange={mockOnChange}
      />
    );

    expect(screen.getByText(selectedSubCategory)).toBeInTheDocument();
  });
}); 