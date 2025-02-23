export interface FilterOption {
  id: string;
  label: string;
  value: string;
}

export interface FilterSection {
  id: string;
  title: string;
  options: FilterOption[];
}

export interface NotificationItem {
  id: string;
  message: string;
  timestamp: string;
  type: "info" | "warning" | "error" | "success";
}

export interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
}
