import { render, screen, fireEvent } from '@testing-library/react';
import { MessageTypeFilter, MessageType } from '../MessageTypeFilter';
import { vi } from 'vitest';

// Mock scrollIntoView and hasPointerCapture for JSDOM
Element.prototype.scrollIntoView = vi.fn();
Element.prototype.hasPointerCapture = () => false;

describe('MessageTypeFilter', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all message type options', () => {
    render(
      <MessageTypeFilter
        selectedTypes={[]}
        onTypeChange={mockOnChange}
      />
    );

    expect(screen.getByText('ข้อความหลัก')).toBeInTheDocument();
    expect(screen.getByText('คำถาม')).toBeInTheDocument();
    expect(screen.getByText('ข้อร้องเรียน')).toBeInTheDocument();
    expect(screen.getByText('ข้อเสนอแนะ')).toBeInTheDocument();
  });

  it('shows selected message types as checked', () => {
    const selectedTypes: MessageType[] = ['main', 'question'];
    
    render(
      <MessageTypeFilter
        selectedTypes={selectedTypes}
        onTypeChange={mockOnChange}
      />
    );

    const mainCheckbox = screen.getByRole('checkbox', { name: 'ข้อความหลัก' });
    const questionCheckbox = screen.getByRole('checkbox', { name: 'คำถาม' });
    const complaintCheckbox = screen.getByRole('checkbox', { name: 'ข้อร้องเรียน' });
    const suggestionCheckbox = screen.getByRole('checkbox', { name: 'ข้อเสนอแนะ' });

    expect(mainCheckbox).toBeChecked();
    expect(questionCheckbox).toBeChecked();
    expect(complaintCheckbox).not.toBeChecked();
    expect(suggestionCheckbox).not.toBeChecked();
  });

  it('calls onTypeChange when a type is toggled', () => {
    render(
      <MessageTypeFilter
        selectedTypes={['main']}
        onTypeChange={mockOnChange}
      />
    );

    // Toggle an unselected type
    const questionCheckbox = screen.getByRole('checkbox', { name: 'คำถาม' });
    fireEvent.click(questionCheckbox);
    expect(mockOnChange).toHaveBeenCalledWith(['main', 'question']);

    // Toggle a selected type
    const mainCheckbox = screen.getByRole('checkbox', { name: 'ข้อความหลัก' });
    fireEvent.click(mainCheckbox);
    expect(mockOnChange).toHaveBeenCalledWith([]);
  });

  it('applies highlight background to selected items', () => {
    render(
      <MessageTypeFilter
        selectedTypes={['main']}
        onTypeChange={mockOnChange}
      />
    );

    const mainOption = screen.getByText('ข้อความหลัก').closest('div');
    const questionOption = screen.getByText('คำถาม').closest('div');

    expect(mainOption).toHaveClass('bg-[#EFF6FF]');
    expect(questionOption).not.toHaveClass('bg-[#EFF6FF]');
  });
}); 