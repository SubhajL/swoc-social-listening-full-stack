import { Alert, AlertDescription } from "@/components/ui/alert";

interface MapErrorProps {
  error: string;
}

const MapError = ({ error }: MapErrorProps) => (
  <Alert variant="destructive" className="m-4">
    <AlertDescription>{error}</AlertDescription>
  </Alert>
);

export default MapError;
