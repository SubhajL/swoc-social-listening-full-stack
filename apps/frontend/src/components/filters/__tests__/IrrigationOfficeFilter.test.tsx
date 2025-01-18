import { render, screen, fireEvent } from '@testing-library/react';
import { IrrigationOfficeFilter } from '../IrrigationOfficeFilter';
import { IrrigationOffices } from '@/types/processed-post';

describe('IrrigationOfficeFilter', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    render(
      <IrrigationOfficeFilter
        selectedOffice={null}
        onOfficeChange={mockOnChange}
      />
    );

    const combobox = screen.getByRole('combobox', { name: 'สำนักงานชลประทาน' });
    expect(combobox).toHaveTextContent('ทั้งหมด');
  });

  it('shows all irrigation offices', () => {
    render(
      <IrrigationOfficeFilter
        selectedOffice={null}
        onOfficeChange={mockOnChange}
      />
    );

    const combobox = screen.getByRole('combobox', { name: 'สำนักงานชลประทาน' });
    fireEvent.click(combobox);

    IrrigationOffices.forEach((office) => {
      expect(screen.getByRole('option', { name: office })).toBeInTheDocument();
    });
  });

  it('shows selected office', () => {
    const selectedOffice = IrrigationOffices[0];
    render(
      <IrrigationOfficeFilter
        selectedOffice={selectedOffice}
        onOfficeChange={mockOnChange}
      />
    );

    const combobox = screen.getByRole('combobox', { name: 'สำนักงานชลประทาน' });
    expect(combobox).toHaveTextContent(selectedOffice);
  });
}); 