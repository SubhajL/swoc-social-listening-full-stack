import { Alert, AlertDescription } from "@/components/ui/alert";

interface MapErrorProps {
  error: string;
}

const MapError = ({ error }: MapErrorProps) => {
  return (
    <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-gray-100 rounded-lg">
      <div className="text-center">
        <div className="text-red-500 text-xl mb-2">⚠️</div>
        <p className="text-gray-600">{error}</p>
      </div>
    </div>
  );
};

export default MapError;
