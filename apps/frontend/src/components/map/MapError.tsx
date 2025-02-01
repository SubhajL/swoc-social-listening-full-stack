import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface MapErrorProps {
  error: Error | null;
  onRetry?: () => void;
}

const MapError: React.FC<MapErrorProps> = ({ error, onRetry }) => {
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (error) {
      setShowError(true);
    }
  }, [error]);

  if (!showError || !error) {
    return null;
  }

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTitle>Map Loading Error</AlertTitle>
      <AlertDescription className="mt-2">
        <p className="text-sm mb-4">{error.message || 'An unexpected error occurred while loading the map.'}</p>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowError(false);
              onRetry();
            }}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};

export default MapError;
