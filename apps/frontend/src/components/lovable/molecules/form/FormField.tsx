import { FormLabel } from "../../atoms/form/FormLabel";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

export const FormField = ({ label, children, className }: FormFieldProps) => (
  <div className={cn("space-y-2", className)}>
    <FormLabel>{label}</FormLabel>
    {children}
  </div>
);
