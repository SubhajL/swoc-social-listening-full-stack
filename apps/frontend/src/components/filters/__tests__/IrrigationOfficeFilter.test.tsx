import { render, screen, fireEvent } from '@testing-library/react';
import { IrrigationOfficeFilter } from '../IrrigationOfficeFilter';
import { IrrigationOffices } from '@/types/processed-post';

describe('IrrigationOfficeFilter', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders correctly', () => {
    render(
      <IrrigationOfficeFilter
        selectedOffice={null}
        onOfficeChange={mockOnChange}
      />
    );

    expect(screen.getByText('สำนักงานชลประทาน')).toBeInTheDocument();
    expect(screen.getByText('เลือกสำนักงานชลประทาน')).toBeInTheDocument();
  });

  it('shows all irrigation offices', async () => {
    render(
      <IrrigationOfficeFilter
        selectedOffice={null}
        onOfficeChange={mockOnChange}
      />
    );

    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);

    // Check that all offices are listed
    IrrigationOffices.forEach(office => {
      expect(screen.getByText(office)).toBeInTheDocument();
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

    expect(screen.getByText(selectedOffice)).toBeInTheDocument();
  });
}); 