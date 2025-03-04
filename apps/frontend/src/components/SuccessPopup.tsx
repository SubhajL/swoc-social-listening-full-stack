import { X } from 'lucide-react';

interface SuccessPopupProps {
  title: string;
  timestamp: string;
  onClose: () => void;
}

export const SuccessPopup = ({ title, timestamp, onClose }: SuccessPopupProps) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="bg-white rounded-xl p-6 shadow-lg max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-gray-600">{timestamp}</p>
      </div>
    </div>
  );
}; 