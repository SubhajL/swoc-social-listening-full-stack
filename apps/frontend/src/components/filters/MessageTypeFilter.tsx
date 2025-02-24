import * as React from "react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export type MessageType = 'main' | 'question' | 'complaint' | 'suggestion';

export interface MessageTypeOption {
  id: MessageType;
  label: string;
}

const MESSAGE_TYPE_OPTIONS: MessageTypeOption[] = [
  { id: 'main', label: 'ข้อความหลัก' },
  { id: 'question', label: 'คำถาม' },
  { id: 'complaint', label: 'ข้อร้องเรียน' },
  { id: 'suggestion', label: 'ข้อเสนอแนะ' }
];

interface MessageTypeFilterProps {
  selectedTypes: MessageType[];
  onTypeChange: (types: MessageType[]) => void;
  className?: string;
}

export function MessageTypeFilter({
  selectedTypes,
  onTypeChange,
  className
}: MessageTypeFilterProps) {
  const handleTypeToggle = (type: MessageType) => {
    if (selectedTypes.includes(type)) {
      onTypeChange(selectedTypes.filter(t => t !== type));
    } else {
      onTypeChange([...selectedTypes, type]);
    }
  };

  return (
    <Card className={cn("p-4 space-y-4", className)}>
      <div className="text-sm text-[#64748B]">ประเภทข้อความ</div>
      <div className="space-y-2">
        {MESSAGE_TYPE_OPTIONS.map((option) => (
          <div
            key={option.id}
            className={cn(
              "flex items-center space-x-2 p-2 rounded-md",
              selectedTypes.includes(option.id) && "bg-[#EFF6FF]"
            )}
          >
            <Checkbox
              id={`message-type-${option.id}`}
              checked={selectedTypes.includes(option.id)}
              onCheckedChange={() => handleTypeToggle(option.id)}
              className="data-[state=checked]:bg-[#42A5F5] data-[state=checked]:border-[#42A5F5]"
            />
            <label
              htmlFor={`message-type-${option.id}`}
              className="text-sm text-[#0F172A] cursor-pointer"
            >
              {option.label}
            </label>
          </div>
        ))}
      </div>
    </Card>
  );
} 