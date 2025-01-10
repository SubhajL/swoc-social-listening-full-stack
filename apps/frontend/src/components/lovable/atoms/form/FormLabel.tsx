import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormLabelProps {
  children: React.ReactNode;
  className?: string;
}

export const FormLabel = ({ children, className }: FormLabelProps) => (
  <Label className={cn("text-sm font-medium text-gray-700", className)}>
    {children}
  </Label>
);
