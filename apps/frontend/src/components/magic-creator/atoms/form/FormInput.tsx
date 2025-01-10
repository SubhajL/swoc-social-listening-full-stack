import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export const FormInput = ({ className, ...props }: FormInputProps) => (
  <Input 
    className={cn("bg-background", className)}
    {...props}
  />
);
