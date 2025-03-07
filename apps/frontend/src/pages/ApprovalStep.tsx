import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Link, useNavigate, useLocation } from "react-router-dom";
import logo1 from "@/assets/logo1.png";
import logo2 from "@/assets/logo2.png";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, Search, Bell, Settings, Check, User, Send, X, Paperclip, Save } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useDocumentPreparationStore } from "@/stores/documentPreparationStore";
import { useState, useEffect, useCallback, useRef } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import axios from "axios";
import { checkAuthState, fixAuthIssues } from '@/utils/auth-test';
import { toast } from "sonner";
import { SocialPostInfo } from "@/components/SocialPostInfo";
import { WaterLevelInfo } from "@/components/WaterLevelInfo";
import { WaterManagementPlan } from "@/components/WaterManagementPlan";
import { ProcessedPost, ComplaintWithOrganization } from '@/types';
import { SuccessPopup } from '@/components/SuccessPopup';
import { Header as ApprovalHeader } from '@/components/ApprovalStepHeader';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { generateNameAcronym } from '@/utils/name-utils';
import { AppHeader } from '@/components/shared/AppHeader';
import { ComplaintInfoCard } from '@/components/shared/ComplaintInfoCard';
import { useComplaintStore } from "@/stores/complaintStore";

// Import SVG icons
import CalendarIcon from "@/assets/icon/Calendar.svg";
import ClipboardIcon from "@/assets/icon/Clipboard.svg";
import ShareIcon from "@/assets/icon/share-2.svg";
import PrinterIcon from "@/assets/icon/printer.svg";
import PaperclipIcon from "@/assets/icon/paperclip.svg";
import { cleanLocationString, formatLocationForDisplay, isEmptyLocation } from "@/lib/location-utils";

// Custom header component for the ApprovalStep page
const ApprovalStepHeader = () => {
  const navigate = useNavigate();

  const handleSettingsClick = () => {
    navigate('/system-setting');
  };

  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-12">
        <div className="flex items-center py-3">
          {/* Left section - Logos only */}
          <div className="flex items-center gap-4">
            <img 
              src={logo1} 
              alt="Royal Irrigation Department Logo" 
              className="h-20 w-auto object-contain"
            />
            <img 
              src={logo2} 
              alt="SWOC Logo" 
              className="h-20 w-auto object-contain"
            />
          </div>
        </div>
      </div>
    </header>
  );
};

// Define types for approval records
interface ApprovalRecord {
  id: number;
  postId: string;
  complaintId: string;
  link: string;
  type: string;
  province: string;
  startDate: string;
  endDate: string;
  totalDays: string;
  status: string;
  responsible: string;
  position: number; // RBAC position (1, 2, or 3)
  organizationId: string;
  organizationName: string;
}

// Define interfaces for approval team members
interface ApprovalTeamMember {
  id: number;
  name: string;
  email?: string;
  position: number;
  organizationId: string;
}

// Add new interface for approval step
interface ApprovalStepInfo {
  name: string;
  email: string;
  position: string;
  timestamp?: string;
  status: 'completed' | 'current' | 'pending';
}

// Helper function to get location data
const getLocationData = (data: ProcessedPost | ComplaintWithOrganization | null) => {
  if (!data) {
    return {
      amphure: '',
      province: ''
    };
  }

  if (isProcessedPost(data)) {
    // Handle ProcessedPost type
    return {
      amphure: Array.isArray(data.amphure) ? data.amphure[0] : '',
      province: Array.isArray(data.province) ? data.province[0] : data.province || ''
    };
  } else {
    // Handle ComplaintWithOrganization type
    return {
      amphure: data.location?.amphure || '',
      province: data.location?.province || ''
    };
  }
};

// Helper function to check if data is ProcessedPost
const isProcessedPost = (data: any): data is ProcessedPost => {
  return data && 'processed_post_id' in data;
};

// Helper function to check if data is ComplaintWithOrganization
const isComplaintWithOrganization = (data: any): data is ComplaintWithOrganization => {
  return data && 'organizationId' in data && 'organizationName' in data;
};

// Helper function to extract complaint issue text
const getIssue = (complaint: ProcessedPost | ComplaintWithOrganization | null): string => {
  if (!complaint) return '';
  if (isProcessedPost(complaint)) {
    return complaint.text || '';
  }
  return complaint.content || '';
};

// Helper function to convert data to the correct type
const convertData = (data: any): ProcessedPost | ComplaintWithOrganization | null => {
  if (!data) return null;
  
  // If it's already one of our types, return it as is
  if (isProcessedPost(data) || isComplaintWithOrganization(data)) {
    return data;
  }
  
  // If the data doesn't match either type, try to convert it
  try {
    if ('text' in data || 'processed_post_id' in data) {
      // Convert to ProcessedPost
      return {
        id: data.id || data.processed_post_id?.toString() || '0',
        processed_post_id: parseInt(data.id) || data.processed_post_id || 0,
        text: data.text || '',
        type: data.type || data.category_name || '',
        category_name: data.type || data.category_name || '',
        profile_name: data.profile_name || '',
        post_date: data.post_date ? new Date(data.post_date) : new Date(),
        post_url: data.post_url || data.link || '',
        latitude: data.latitude || 0,
        longitude: data.longitude || 0,
        tumbon: Array.isArray(data.tumbon) ? data.tumbon : [],
        amphure: Array.isArray(data.amphure) ? data.amphure : [],
        province: data.province || '',
        created_at: data.created_at || new Date().toISOString(),
        status: data.status || 'pending',
        severity: data.severity || 0,
        coordinate_source: data.coordinate_source || 'direct',
        organizationId: data.organizationId || '',
        organizationName: data.organizationName || ''
      } as ProcessedPost;
    } else {
      // Convert to ComplaintWithOrganization
      return {
        id: data.id || '',
        organizationId: data.organizationId || '',
        organizationName: data.organizationName || '',
        content: data.content || '',
        type: data.type || '',
        location: {
          amphure: data.location?.amphure || data.amphure || '',
          province: data.location?.province || data.province || ''
        },
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
        status: data.status || 'pending',
        severity: data.severity || 0
      } as ComplaintWithOrganization;
    }
  } catch (error) {
    console.error('[ApprovalStep] Error converting data:', error);
    return null;
  }
};

// ApprovalStep Component
const ApprovalStep = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const authStore = useAuthStore();
  const documentStore = useDocumentPreparationStore();
  const complaintStore = useComplaintStore();
  
  // Get document preparation state from store
  const {
    documentContent,
    isSaved,
    isApproved,
    saveTimestamp,
    approverInfo,
    setDocumentContent,
    setSaved,
    setApproved
  } = documentStore;
  
  // Local state
  const [showSavePopup, setShowSavePopup] = useState<boolean>(false);
  const [showApprovePopup, setShowApprovePopup] = useState<boolean>(false);
  const [popupTimestamp, setPopupTimestamp] = useState<string>("");
  const [preservedData, setPreservedData] = useState<ProcessedPost | ComplaintWithOrganization | null>(null);
  const hasSetComplaintData = useRef(false);
  const [hasContentChanged, setHasContentChanged] = useState<boolean>(false);
  
  // State for approval records
  const [approvalRecords, setApprovalRecords] = useState<ApprovalRecord[]>([]);
  const [filteredData, setFilteredData] = useState<ApprovalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  
  // Sorting and filtering state
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState({
    startDate: "",
    endDate: ""
  });
  
  // Get current user's RBAC role from auth store
  const userRbacRole = authStore?.user?.rbacRole || 1;
  
  // Calculate pagination values
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredData.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  
  // Mock approval steps data (replace with actual data later)
  const approvalSteps: ApprovalStepInfo[] = [
    {
      name: authStore.user?.name || 'ไม่ระบุ',  // Use current user's name
      email: authStore.user?.email || 'ไม่ระบุ',  // Use current user's email
      position: 'ประชาสัมพันธ์',
      timestamp: 'วันที่ 25 ธันวาคม 2567 เวลา 14:00น.',
      status: 'completed'
    },
    {
      name: 'นาย ศุภกฤษ์ แสนด่าย',
      email: 'Suprung.s@example.com',
      position: 'ผู้อำนวยการส่วนบริหารทั่วไป',
      status: 'current'
    },
    {
      name: 'นาย สมเกียรติ ประเสริฐศรี',
      email: 'Kanokwan@examle.com',
      position: 'ผู้อำนวยการสำนักงานชลประทาน',
      status: 'pending'
    }
  ];
  
  // Store the complaint data in the store when the component mounts
  useEffect(() => {
    // If we have preserved data from returning from approval pages, use it
    if (preservedData && !hasSetComplaintData.current) {
      console.log("[ApprovalStep] Using preserved data:", preservedData);
      const data = convertData(preservedData);
      if (data) {
        complaintStore.setComplaintData(data);
        hasSetComplaintData.current = true;
      }
    }
    // If we have complaint data from navigation state, use it
    else if (location.state && !hasSetComplaintData.current) {
      console.log("[ApprovalStep] Storing complaint data from state:", location.state);
      const data = convertData(location.state);
      if (data) {
        complaintStore.setComplaintData(data);
        hasSetComplaintData.current = true;
      }
    } 
    // If we don't have complaint data from navigation but we have it in the store, keep using it
    else if (!location.state && !preservedData && complaintStore.complaintData && !hasSetComplaintData.current) {
      console.log("[ApprovalStep] Using existing complaint data from store");
      hasSetComplaintData.current = true;
    }
    // If we have neither, we might want to redirect or show an error
    else if (!location.state && !preservedData && !complaintStore.complaintData && !hasSetComplaintData.current) {
      console.error("[ApprovalStep] No complaint data available");
      toast.error("ไม่พบข้อมูลข้อร้องเรียน กรุณาเลือกข้อร้องเรียนใหม่");
      
      // Navigate back to complaint selection page after a short delay
      const timer = setTimeout(() => {
        navigate('/complaint/create');
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [location.state, preservedData, complaintStore, navigate]);

  // Function to handle back navigation
  const handleBack = () => {
    if (complaintStore.complaintData) {
      console.log("[ApprovalStep] Navigating back with complaint data");
      
      try {
        // Store essential data in sessionStorage
        const essentialData = {
          from: 'ApprovalStep',
          returnToDocumentPreparation: true,
          timestamp: new Date().getTime(),
          complaintData: complaintStore.complaintData
        };
        
        sessionStorage.setItem('documentPreparationState', JSON.stringify(essentialData));
        navigate('/document-preparation');
      } catch (error) {
        console.error("[ApprovalStep] Error storing data:", error);
        navigate('/document-preparation');
      }
    } else {
      console.log("[ApprovalStep] No complaint data, navigating to home");
      navigate('/');
    }
  };
  
  // Function to get data based on RBAC role
  const getDataForCurrentRole = useCallback(() => {
    console.log('🔍 [ApprovalStep] Getting data for role:', userRbacRole, 'Total records:', approvalRecords.length);
    
    // Filter records based on user's RBAC role
    const filteredRecords = approvalRecords.filter(record => {
      if (userRbacRole === 1) {
        // RBAC 1 can see all records
        return true;
      } else {
        // Other roles can only see their own records and subsequent records
        return record.position >= userRbacRole;
      }
    });
    
    console.log('🔍 [ApprovalStep] Filtered records by role:', filteredRecords.length);
    return filteredRecords;
  }, [approvalRecords, userRbacRole]);
  
  // Function to load approval records
  const loadApprovalRecords = useCallback(async () => {
    console.group('🔍 [ApprovalStep] Loading approval records');
    setLoading(true);
    
    try {
      // Check authentication first
      if (!authStore.isAuthenticated || !authStore.token) {
        console.warn('⚠️ [ApprovalStep] Auth store not authenticated, attempting to fix');
        
        // Try to fix auth issues
        fixAuthIssues();
        
        // Check if fix worked
        const authState = useAuthStore.getState();
        if (!authState.isAuthenticated || !authState.token) {
          console.error('❌ [ApprovalStep] User is not authenticated after fix attempt');
          toast.error('Please log in to view approval records');
          navigate('/login', { state: { from: '/approval-step' } });
          setLoading(false);
          console.groupEnd();
          return;
        }
      }
      
      // Get the current token from auth store
      const currentToken = useAuthStore.getState().token;
      console.log('🔍 [ApprovalStep] Fetching approval records with token', 
        currentToken ? `${currentToken.substring(0, 10)}...` : 'none');
      
      // Get user role from auth store
      const userRole = useAuthStore.getState().user?.rbacRole || 1;
      console.log('🔍 [ApprovalStep] User role:', userRole);
      
      // Make API request with detailed logging
      console.log('🔍 [ApprovalStep] Making API request to /api/approval-records', {
        params: { rbacRole: userRole },
        headers: { Authorization: currentToken ? `Bearer ${currentToken.substring(0, 10)}...` : 'none' }
      });
      
      // Use axios directly since apiClient might not have the get method
      const response = await axios.get('/api/approval-records', {
        params: { rbacRole: userRole },
        headers: {
          'Authorization': `Bearer ${currentToken}`
        }
      });
      
      console.log('✅ [ApprovalStep] API response received:', {
        status: response.status,
        dataLength: response.data?.length || 0,
        data: response.data?.slice(0, 2) // Log just first 2 items to avoid console clutter
      });
      
      if (response.data && Array.isArray(response.data)) {
        console.log('✅ [ApprovalStep] Setting approval records:', response.data.length);
        setApprovalRecords(response.data);
        
        // Ensure we update filteredData as well to trigger re-render
        const filteredByRole = response.data.filter(record => {
          if (userRole === 1) return true;
          return record.position >= userRole;
        });
        
        console.log('✅ [ApprovalStep] Initial filtered data:', filteredByRole.length);
        
        if (response.data.length === 0) {
          console.log('ℹ️ [ApprovalStep] No approval records found');
          toast.info('No approval records found');
        }
      } else {
        console.warn('⚠️ [ApprovalStep] Unexpected response format:', response.data);
        toast.warning('Unexpected data format received');
      }
    } catch (error: any) {
      console.error('❌ [ApprovalStep] Error fetching approval records:', error);
      
      // Check if it's an authentication error
      if (error.response?.status === 401) {
        console.error('❌ [ApprovalStep] Authentication error (401)');
        toast.error('Your session has expired. Please log in again.');
        
        // Clear invalid auth data
        authStore.logout();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        navigate('/login', { state: { from: '/approval-step' } });
      } else {
        toast.error(`Error loading approval records: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
      console.groupEnd();
    }
  }, [authStore, navigate]);
  
  // Fetch records on component mount
  useEffect(() => {
    console.group('🔍 [ApprovalStep] Component mounted');
    console.log('Initial auth state:', { isAuthenticated: authStore.isAuthenticated, hasUser: !!authStore.user, hasToken: !!authStore.token });
    
    // Run auth diagnostics
    checkAuthState();
    
    // Try to load approval records
    loadApprovalRecords();
    
    console.groupEnd();
  }, [loadApprovalRecords]);
  
  // Apply filtering and sorting
  useEffect(() => {
    // Get data filtered by role
    let result = getDataForCurrentRole();
    
    // Apply global search
    if (searchTerm) {
      result = result.filter(record => 
        Object.values(record).some(value => 
          value && typeof value === 'string' && value.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
    
    // Apply date filter if needed
    if (dateFilter.startDate || dateFilter.endDate) {
      result = result.filter(record => isDateInRange(record.startDate || ''));
    }
    
    // Apply sorting
    if (sortColumn) {
      result.sort((a, b) => {
        const aValue = a[sortColumn as keyof typeof a];
        const bValue = b[sortColumn as keyof typeof b];
        
        // Handle undefined values and different types
        if (aValue === undefined && bValue === undefined) return 0;
        if (aValue === undefined) return sortDirection === "asc" ? -1 : 1;
        if (bValue === undefined) return sortDirection === "asc" ? 1 : -1;
        
        // Compare values based on their types
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortDirection === "asc" 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        
        // For other types, use basic comparison
        return sortDirection === "asc" 
          ? (aValue > bValue ? 1 : -1)
          : (bValue > aValue ? 1 : -1);
      });
    }
    
    setFilteredData(result);
    setTotalRecords(result.length);
  }, [searchTerm, sortColumn, sortDirection, dateFilter, getDataForCurrentRole, approvalRecords]);
  
  // Check if a date is within the filter range
  const isDateInRange = (dateStr: string) => {
    if (!dateStr) return true; // Include records with no date
    
    try {
      const date = new Date(dateStr);
      const startDate = dateFilter.startDate ? new Date(dateFilter.startDate) : null;
      const endDate = dateFilter.endDate ? new Date(dateFilter.endDate) : null;
      
      if (startDate && date < startDate) return false;
      if (endDate && date > endDate) return false;
      
      return true;
    } catch (error) {
      console.error('Error parsing date:', error);
      return true; // If there's an error, don't filter out the record
    }
  };
  
  // Pagination functions
  const paginate = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };
  
  const handleRecordsPerPageChange = (value: string) => {
    setRecordsPerPage(Number(value));
    setCurrentPage(1); // Reset to first page when changing records per page
  };
  
  // Sorting function
  const handleSort = (columnId: string) => {
    if (sortColumn === columnId) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new column and default to ascending
      setSortColumn(columnId);
      setSortDirection("asc");
    }
  };
  
  // Search function
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };
  
  // Date filter function
  const handleDateFilterChange = (type: 'startDate' | 'endDate', value: string) => {
    setDateFilter(prev => ({
      ...prev,
      [type]: value
    }));
    setCurrentPage(1); // Reset to first page when filtering
  };
  
  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      // Show all pages if total pages are less than or equal to maxPagesToShow
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Always show first page
      pageNumbers.push(1);
      
      // Calculate start and end page numbers
      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, currentPage + 1);
      
      // Adjust if we're near the beginning
      if (currentPage <= 2) {
        endPage = 4;
      }
      
      // Adjust if we're near the end
      if (currentPage >= totalPages - 1) {
        startPage = totalPages - 3;
      }
      
      // Add ellipsis after first page if needed
      if (startPage > 2) {
        pageNumbers.push('...');
      }
      
      // Add middle pages
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }
      
      // Add ellipsis before last page if needed
      if (endPage < totalPages - 1) {
        pageNumbers.push('...');
      }
      
      // Always show last page
      pageNumbers.push(totalPages);
    }
    
    return pageNumbers;
  };
  
  // Column definitions
  const columns = [
    {
      id: "postId",
      label: "หมายเลขอ้างอิง",
      sortable: true,
      filterable: false,
    },
    {
      id: "link",
      label: "ลิงค์ข้อความ",
      sortable: false,
      filterable: false,
    },
    {
      id: "type",
      label: "ประเภท",
      sortable: true,
      filterable: false,
    },
    {
      id: "province",
      label: "จังหวัด",
      sortable: true,
      filterable: false,
    },
    {
      id: "startDate",
      label: "วันเริ่มต้น",
      sortable: true,
      filterable: false,
      isDate: true,
    },
    {
      id: "endDate",
      label: "วันสิ้นสุด",
      sortable: true,
      filterable: false,
      isDate: true,
    },
    {
      id: "totalDays",
      label: "จำนวนวันรวม",
      sortable: true,
      filterable: false,
    },
    {
      id: "status",
      label: "สถานะ",
      sortable: true,
      filterable: false,
    },
    {
      id: "responsible",
      label: "ผู้รับผิดชอบ",
      sortable: true,
      filterable: false,
    }
  ];
  
  // Get location data for water info components
  const locationData = getLocationData(complaintStore.complaintData || null);

  // Format current date and time for timestamp
  const formatTimestamp = (): string => {
    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth() + 1;
    const year = now.getFullYear() + 543; // Convert to Buddhist Era
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    
    return `วันที่ ${day} ${getThaiMonth(month)} ${year} เวลา ${hours}:${minutes} น.`;
  };

  // Get Thai month name
  const getThaiMonth = (month: number): string => {
    const thaiMonths = [
      "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
      "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];
    return thaiMonths[month - 1];
  };

  // Handle save action
  const handleSave = () => {
    const timestamp = formatTimestamp();
    setPopupTimestamp(timestamp);
    setSaved(timestamp);
    setShowSavePopup(true);
    
    // Hide popup after 3 seconds
    setTimeout(() => {
      setShowSavePopup(false);
    }, 3000);
  };
  
  // Handle approve action
  const handleApprove = () => {
    const timestamp = formatTimestamp();
    setPopupTimestamp(timestamp);
    setApproved();
    setShowApprovePopup(true);
    
    // Hide popup after 3 seconds
    setTimeout(() => {
      setShowApprovePopup(false);
    }, 3000);
  };
  
  // Handle submit for approval action
  const handleSubmitForApproval = () => {
    if (!isApproved) return;
    
    // Navigate to approval dashboard
    navigate('/approval-dashboard', {
      state: {
        from: 'approval-step',
        complaintData: complaintStore.complaintData
      }
    });
  };
  
  return (
    <div className="min-h-screen bg-[#EBF5FF]">
      <AppHeader activeTab="response" />
      
      <main className="container mx-auto px-12 pt-2 pb-20">
        {/* Approval Steps Timeline */}
        <div className="mb-6">
          <Card className="p-8 shadow-sm">
            {/* Frame Header */}
            <h2 className="text-2xl font-semibold text-[#17254D] mb-6">กระบวนการเห็นชอบ</h2>
            
            {/* Top line with dropdown */}
            <div className="flex justify-between items-center mb-6">
              <div className="relative">
                <Select>
                  <SelectTrigger className="bg-white border border-gray-300 rounded-xl px-4 py-2 text-base text-gray-700">
                    <SelectValue placeholder="สื่อสังคมออนไลน์" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="social">สื่อสังคมออนไลน์</SelectItem>
                    <SelectItem value="official">หนังสือราชการ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Main content area with restructured layout */}
            <div className="relative">
              {/* Two-column layout with approval steps on left and complaint info on right */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left column - Approval steps */}
                <div>
                  {/* ลำดับการเห็นชอบ section */}
                  <div className="relative pl-4">
                    <div className="flex items-center gap-2 mb-4">
                      <img src={CalendarIcon} alt="Calendar" className="w-8 h-8" />
                      <h3 className="text-xl font-semibold text-[#17254D]">ลำดับการเห็นชอบ</h3>
                    </div>
                    
                    {/* Vertical dotted line */}
                    <div className="absolute left-4 top-[60px] bottom-4 w-[1px] border-l border-dashed border-gray-400"></div>
                    
                    {/* Approval steps */}
                    {approvalSteps.map((step, index) => (
                      <div key={index} className="relative pl-8 mb-6 last:mb-0">
                        {/* Status indicator */}
                        <div className={`absolute left-2 top-4 w-4 h-4 rounded-full ${
                          step.status === 'completed' ? 'bg-green-500' :
                          step.status === 'current' ? 'bg-blue-500' :
                          'bg-gray-300'
                        }`}></div>
                        
                        {/* Step content */}
                        <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-[#E2E8F0] flex items-center justify-center text-[#17254D] font-medium">
                              {generateNameAcronym(step.name)}
                            </div>
                            <div>
                              <h4 className="font-medium text-[#17254D] text-lg">{step.name}</h4>
                              <p className="text-sm text-gray-500">{step.email}</p>
                              <p className="text-sm text-gray-600 mt-1">{step.position}</p>
                              {step.timestamp && (
                                <p className="text-sm text-gray-500 mt-2">{step.timestamp}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Right column - Complaint Info */}
                <div className="relative">
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-xl font-semibold text-[#17254D]">ข้อมูลข้อร้องเรียน</h3>
                  </div>
                  
                  <ComplaintInfoCard 
                    complaint={complaintStore.complaintData as any}
                    title="ข้อมูลข้อร้องเรียน"
                    editable={false}
                    className="h-full"
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* ร่างเอกสารตอบ Frameset */}
        <div className="mb-6 mt-8">
          <Card className="p-8 shadow-sm">
            {/* Frame Header */}
            <h2 className="text-2xl font-semibold text-[#17254D] mb-6">ร่างเอกสารตอบ</h2>
            
            {/* Document type dropdown */}
            <div className="mb-6">
              <Select defaultValue="social">
                <SelectTrigger className="w-[200px] bg-white border border-gray-300 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="social">สื่อสังคมออนไลน์</SelectItem>
                  <SelectItem value="official">หนังสือราชการ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Draft document section */}
            <div className="mb-6">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-4 min-h-[200px]">
              </div>
              <div className="text-sm text-gray-600 mt-2">
                วันที่ {new Date().getDate()} {getThaiMonth(new Date().getMonth() + 1)} {new Date().getFullYear() + 543} เวลา {new Date().getHours().toString().padStart(2, '0')}:{new Date().getMinutes().toString().padStart(2, '0')} น. สร้างโดย {authStore.user?.name || 'ไม่ระบุ'}
              </div>
            </div>
            
            {/* Supporting documents section */}
            <div className="relative mt-8">
              <h4 className="text-2xl font-semibold text-[#17254D] mb-6">เอกสารประกอบ</h4>
              
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 min-h-[200px]">
              </div>
            </div>
          </Card>
        </div>
      </main>
      
      {/* Success Popups */}
      {showSavePopup && (
        <SuccessPopup 
          title="บันทึกสำเร็จ" 
          timestamp={popupTimestamp}
          onClose={() => setShowSavePopup(false)}
        />
      )}
      
      {showApprovePopup && (
        <SuccessPopup 
          title="เห็นชอบสำเร็จ" 
          timestamp={popupTimestamp}
          onClose={() => setShowApprovePopup(false)}
        />
      )}
    </div>
  );
};

export default ApprovalStep; 