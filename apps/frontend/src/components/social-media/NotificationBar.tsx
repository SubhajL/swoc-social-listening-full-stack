import React from "react";
import { NotificationItem } from "@/types/social-media";
import { AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react";

interface NotificationBarProps {
  notification: NotificationItem;
}

export const NotificationBar: React.FC<NotificationBarProps> = ({
  notification,
}) => {
  const getIcon = () => {
    switch (notification.type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getBackgroundColor = () => {
    switch (notification.type) {
      case "success":
        return "bg-green-50";
      case "error":
        return "bg-red-50";
      case "warning":
        return "bg-yellow-50";
      default:
        return "bg-blue-50";
    }
  };

  return (
    <div
      className={`p-4 rounded-lg flex items-center space-x-3 ${getBackgroundColor()}`}
    >
      {getIcon()}
      <div className="flex-1">
        <p className="text-sm text-gray-700">{notification.message}</p>
      </div>
      <span className="text-xs text-gray-500">{notification.timestamp}</span>
    </div>
  );
};
