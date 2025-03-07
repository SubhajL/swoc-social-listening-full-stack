import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, Search, FileText, Bell, Settings } from "lucide-react";
import { useComplaintStore, ComplaintData } from "@/stores/complaintStore";
import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import axios from "axios";
import { useAuthStore } from "@/stores/authStore";
import { Link, useNavigate, useLocation } from "react-router-dom";
import logo1 from "@/assets/logo1.png";
import logo2 from "@/assets/logo2.png";
import { toast } from "sonner";
import { apiClient } from '@/lib/api-client';
import { checkAuthState, fixAuthIssues } from '@/utils/auth-test';
import { createTestApprovalRecords, deleteAllTestApprovalRecords } from '@/utils/test-approval-data';

// Custom header component for the ApprovalDashboard page
const ApprovalDashboardHeader = () => {
  const navigate = useNavigate();

  const handleSettingsClick = () => {
    navigate('/system-setting');
  };

  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-12">
        <div className="flex items-center justify-between pt-3">
          {/* Left section - Logos */}
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

          {/* Right section - Icons */}
          <div className="flex items-center gap-1 pr-0">
            {/* Notification bell with indicator */}
            <div className="relative p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer">
              <Bell className="w-6 h-6 text-[#334155]" />
              <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></div>
            </div>
            
            {/* Settings */}
            <div 
              className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer"
              onClick={handleSettingsClick}
            >
              <Settings className="w-6 h-6 text-[#334155]" />
            </div>
            
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center text-base font-medium text-[#0F172B] ml-1">
              CN
            </div>
          </div>
        </div>

        {/* Navigation tabs */}
        <div className="flex mt-2">
            <nav className="flex items-center border-b border-[#E2E8F0] whitespace-nowrap">
              <Link 
              to="/dashboard" 
                className="px-4 py-1 text-[#6B7280] hover:text-[#17254D] text-base whitespace-nowrap"
              >
                ระบบจัดการข้อมูลสื่อสังคมออนไลน์
              </Link>
              <Link 
                to="/response" 
                className="px-4 py-1 text-[#17254D] border-b-2 border-[#42A5F5] font-medium text-base -mb-[0px] whitespace-nowrap"
              >
                ระบบตอบประเด็นข้อร้องเรียน
              </Link>
              <Link 
                to="/dashboard" 
                className="px-4 py-1 text-[#6B7280] hover:text-[#17254D] text-base whitespace-nowrap"
              >
                ระบบแสดงผลข้อมูลและสรุปผลผู้บริหาร
              </Link>
            </nav>
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

const ApprovalDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const complaintStore = useComplaintStore();
  const authStore = useAuthStore(); // Get current user's auth info
  
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
  
  // Function to create three approval records simultaneously
  const createApprovalRecords = async () => {
    try {
      console.log('🔍 [ApprovalDashboard] Creating approval records');
      
      if (!complaintStore.complaintData) {
        console.error('❌ [ApprovalDashboard] No complaint data available');
        throw new Error('No complaint data available');
      }
      
      const complaint = complaintStore.complaintData;
      console.log('🔍 [ApprovalDashboard] Complaint data:', complaint);
      
      // Get the organization ID from the complaint
      const organizationId = complaint.organizationId;
      const organizationName = complaint.organizationName;
      
      if (!organizationId || !organizationName) {
        console.error('❌ [ApprovalDashboard] Missing organization info in complaint data');
        throw new Error('Missing organization information');
      }
      
      console.log('🔍 [ApprovalDashboard] Organization info:', { organizationId, organizationName });
      
      // Fetch approval team from the API
      console.log('🔍 [ApprovalDashboard] Fetching approval team for organization:', organizationId);
      const approvalTeamResponse = await axios.get<ApprovalTeamMember[]>(`/api/users/approval-team/${organizationId}`);
      const approvalTeam = approvalTeamResponse.data;
      
      console.log('✅ [ApprovalDashboard] Approval team fetched:', approvalTeam);
      
      // If we don't have enough team members, use default names
      const defaultTeamMembers: ApprovalTeamMember[] = [
        { id: 1, name: 'ผู้อำนวยการส่วน', position: 1, organizationId },
        { id: 2, name: 'ผู้อำนวยการสำนัก', position: 2, organizationId },
        { id: 3, name: 'รองอธิบดี', position: 3, organizationId }
      ];
      
      // Ensure we have all three positions
      const completeTeam = [1, 2, 3].map(position => {
        const existingMember = approvalTeam.find(member => member.position === position);
        if (existingMember) return existingMember;
        
        const defaultMember = defaultTeamMembers.find(member => member.position === position);
        console.log(`⚠️ [ApprovalDashboard] No team member found for position ${position}, using default:`, defaultMember);
        return defaultMember!; // Non-null assertion since we know defaultTeamMembers has all positions
      });
      
      console.log('🔍 [ApprovalDashboard] Complete approval team:', completeTeam);
      
      // Create timestamp for record creation
      const currentTimestamp = new Date().toISOString();
      
      // Create three approval records (one for each position)
      const approvalRecordsToCreate = [
        {
          postId: complaint.postId || '',
          complaintId: complaint.id || '',
          link: complaint.link || '',
          type: complaint.type || '',
          province: complaint.province || '',
          startDate: currentTimestamp,
          endDate: null,
          totalDays: '0',
          status: 'รอดำเนินการ',
          responsible: completeTeam[0]!.name,
          position: 1, // RBAC position 1
          organizationId,
          organizationName
        },
        {
          postId: complaint.postId || '',
          complaintId: complaint.id || '',
          link: complaint.link || '',
          type: complaint.type || '',
          province: complaint.province || '',
          startDate: null,
          endDate: null,
          totalDays: '0',
          status: 'รอดำเนินการ',
          responsible: completeTeam[1]!.name,
          position: 2, // RBAC position 2
          organizationId,
          organizationName
        },
        {
          postId: complaint.postId || '',
          complaintId: complaint.id || '',
          link: complaint.link || '',
          type: complaint.type || '',
          province: complaint.province || '',
          startDate: null,
          endDate: null,
          totalDays: '0',
          status: 'รอดำเนินการ',
          responsible: completeTeam[2]!.name,
          position: 3, // RBAC position 3
          organizationId,
          organizationName
        }
      ];
      
      console.log('🔍 [ApprovalDashboard] Approval records to create:', approvalRecordsToCreate);
      
      // Send records to the API
      console.log('🔍 [ApprovalDashboard] Sending POST request to /api/approval-records/batch');
      const createResponse = await axios.post('/api/approval-records/batch', approvalRecordsToCreate);
      
      console.log('✅ [ApprovalDashboard] Records created successfully:', createResponse.data);
      
      // Update local state with created records
      if (Array.isArray(createResponse.data)) {
        setApprovalRecords(createResponse.data);
      }
      
      // Clear the complaint data from the store
      complaintStore.clearComplaintData();
      
      return createResponse.data;
    } catch (error: any) {
      console.error('❌ [ApprovalDashboard] Error creating approval records:', error);
      
      // Add more detailed error logging
      if (error.response) {
        console.error('❌ [ApprovalDashboard] Error response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers
        });
      } else if (error.request) {
        console.error('❌ [ApprovalDashboard] No response received:', error.request);
      } else {
        console.error('❌ [ApprovalDashboard] Error message:', error.message);
      }
      
      setError('Failed to create approval records. Please try again.');
      throw error;
    }
  };
  
  // Function to handle approval
  const handleApprove = async (recordId: number) => {
    try {
      console.log('🔍 [ApprovalDashboard] Approving record:', recordId);
      setLoading(true);
      
      // Get the current token from auth store
      const currentToken = useAuthStore.getState().token;
      
      // Make API request to approve the record
      const response = await axios.post(`/api/approval-records/${recordId}/approve`, {}, {
        headers: {
          'Authorization': `Bearer ${currentToken}`
        }
      });
      
      console.log('✅ [ApprovalDashboard] Approval response:', response.data);
      
      // Update the record in the local state
      const updatedRecords = approvalRecords.map(record => {
        if (record.id === recordId) {
          return { ...record, status: 'อนุมัติแล้ว' };
        }
        return record;
      });
      
      setApprovalRecords(updatedRecords);
      
      // Show success message
      toast.success("บันทึกการอนุมัติเรียบร้อยแล้ว");
      
    } catch (error: any) {
      console.error('❌ [ApprovalDashboard] Error approving record:', error);
      
      // Enhanced error logging
      if (error.response) {
        console.error('❌ [ApprovalDashboard] Error response:', {
          status: error.response.status,
          data: error.response.data
        });
      }
      
      // Show error message
      toast.error("ไม่สามารถบันทึกการอนุมัติได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };
  
  // Function to get data based on RBAC role
  const getDataForCurrentRole = useCallback(() => {
    console.log('🔍 [ApprovalDashboard] Getting data for role:', userRbacRole, 'Total records:', approvalRecords.length);
    
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
    
    console.log('🔍 [ApprovalDashboard] Filtered records by role:', filteredRecords.length);
    return filteredRecords;
  }, [approvalRecords, userRbacRole]);
  
  // Function to load approval records
  const loadApprovalRecords = useCallback(async () => {
    console.group('🔍 [ApprovalDashboard] Loading approval records');
    setLoading(true);
    
    try {
      // Check authentication first
      if (!authStore.isAuthenticated || !authStore.token) {
        console.warn('⚠️ [ApprovalDashboard] Auth store not authenticated, attempting to fix');
        
        // Try to fix auth issues
        fixAuthIssues();
        
        // Check if fix worked
        const authState = useAuthStore.getState();
        if (!authState.isAuthenticated || !authState.token) {
          console.error('❌ [ApprovalDashboard] User is not authenticated after fix attempt');
          toast.error('Please log in to view approval records');
          navigate('/login', { state: { from: '/approval-dashboard' } });
          setLoading(false);
          console.groupEnd();
          return;
        }
      }
      
      // Get the current token from auth store
      const currentToken = useAuthStore.getState().token;
      console.log('🔍 [ApprovalDashboard] Fetching approval records with token', 
        currentToken ? `${currentToken.substring(0, 10)}...` : 'none');
      
      // Get user role from auth store
      const userRole = useAuthStore.getState().user?.rbacRole || 1;
      console.log('🔍 [ApprovalDashboard] User role:', userRole);
      
      // Make API request with detailed logging
      console.log('🔍 [ApprovalDashboard] Making API request to /api/approval-records', {
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
      
      console.log('✅ [ApprovalDashboard] API response received:', {
        status: response.status,
        dataLength: response.data?.length || 0,
        data: response.data?.slice(0, 2) // Log just first 2 items to avoid console clutter
      });
      
      if (response.data && Array.isArray(response.data)) {
        console.log('✅ [ApprovalDashboard] Setting approval records:', response.data.length);
        setApprovalRecords(response.data);
        
        // Ensure we update filteredData as well to trigger re-render
        const filteredByRole = response.data.filter(record => {
          if (userRole === 1) return true;
          return record.position >= userRole;
        });
        
        console.log('✅ [ApprovalDashboard] Initial filtered data:', filteredByRole.length);
        
        if (response.data.length === 0) {
          console.log('ℹ️ [ApprovalDashboard] No approval records found');
          toast.info('No approval records found');
        }
      } else {
        console.warn('⚠️ [ApprovalDashboard] Unexpected response format:', response.data);
        toast.warning('Unexpected data format received');
      }
    } catch (error: any) {
      console.error('❌ [ApprovalDashboard] Error fetching approval records:', error);
      
      // Check if it's an authentication error
      if (error.response?.status === 401) {
        console.error('❌ [ApprovalDashboard] Authentication error (401)');
        toast.error('Your session has expired. Please log in again.');
        
        // Clear invalid auth data
        authStore.logout();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        navigate('/login', { state: { from: '/approval-dashboard' } });
      } else {
        toast.error(`Error loading approval records: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
      console.groupEnd();
    }
  }, [authStore, navigate]);
  
  // Fetch records on component mount or when location changes
  useEffect(() => {
    console.group('🔍 [ApprovalDashboard] Component mounted');
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
    
    // Log the initial filtered data
    console.log('🔍 [ApprovalDashboard] Initial filtered data by role:', result.length);
    
    // Apply global search
    if (searchTerm) {
      result = result.filter(record => 
        Object.values(record).some(value => 
          value && typeof value === 'string' && value.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
      console.log('🔍 [ApprovalDashboard] After search filter:', result.length);
    }
    
    // Apply date filter if needed
    if (dateFilter.startDate || dateFilter.endDate) {
      result = result.filter(record => isDateInRange(record.startDate || ''));
      console.log('🔍 [ApprovalDashboard] After date filter:', result.length);
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
    
    console.log('🔍 [ApprovalDashboard] Final filtered data:', result.length);
    setFilteredData(result);
    setTotalRecords(result.length);
  }, [searchTerm, sortColumn, sortDirection, dateFilter, getDataForCurrentRole, approvalRecords]);
  
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
  
  // Navigation functions
  const handleBack = () => {
    navigate(-1);
  };
  
  const handleViewDetails = (id: number) => {
    // Find the record to view
    const record = approvalRecords.find(r => r.id === id);
    
    if (record) {
      // Store the record in session storage or state management
      navigate(`/approval-step/${id}`, { state: { record } });
    }
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
  
  return (
    <div className="min-h-screen bg-[#EBF5FF]">
      <ApprovalDashboardHeader />
      
      {/* Page Title */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-12 py-4">
          <h1 className="text-2xl font-semibold text-[#17254D]">การอนุมัติเอกสาร</h1>
        </div>
      </div>
      
      <main className="container mx-auto px-12 py-6">
        {/* Top line with record count and search */}
        <div className="flex justify-between items-center mb-4">
          <div className="text-gray-700">
            จำนวนข้อมูลการร้องเรียนทั้งหมด {totalRecords} ข้อมูล
          </div>
          
          <div className="relative w-64">
            <Input
              placeholder="ค้นหา"
              value={searchTerm}
              onChange={handleSearch}
              className="pl-10 pr-4 py-2 rounded-lg border border-gray-300"
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          </div>
        </div>
        
        {/* Date filter */}
        <div className="flex gap-4 mb-6">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">วันที่เริ่มต้น:</label>
            <Input
              type="date"
              value={dateFilter.startDate}
              onChange={(e) => handleDateFilterChange('startDate', e.target.value)}
              className="w-40"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">วันที่สิ้นสุด:</label>
            <Input
              type="date"
              value={dateFilter.endDate}
              onChange={(e) => handleDateFilterChange('endDate', e.target.value)}
              className="w-40"
            />
          </div>
        </div>
        
        {/* Loading and error states */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}
            
            {/* Always show the table, regardless of data */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column) => (
                    <TableHead key={column.id} className="bg-gray-50 text-gray-700 font-medium">
                      <div className="flex items-center gap-1">
                          {column.label}
                        {column.sortable && (
                          <button
                            onClick={() => handleSort(column.id)}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                          </button>
                        )}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentRecords.length > 0 ? (
                  currentRecords.map((record) => (
                    <TableRow key={record.id} className="hover:bg-gray-50">
                        <TableCell>{record.postId}</TableCell>
                        <TableCell>
                          <a href={record.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            ดูข้อความ
                          </a>
                        </TableCell>
                      <TableCell>{record.type}</TableCell>
                      <TableCell>{record.province}</TableCell>
                        <TableCell>{record.startDate ? new Date(record.startDate).toLocaleString('th-TH') : "-"}</TableCell>
                        <TableCell>{record.endDate ? new Date(record.endDate).toLocaleString('th-TH') : "-"}</TableCell>
                        <TableCell>{record.totalDays}</TableCell>
                      <TableCell>
                        <Badge 
                          className={`${
                            record.status === "เห็นชอบ" 
                              ? "bg-green-100 text-green-800" 
                                : record.status === "รอดำเนินการ"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{record.responsible}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="text-center py-8">
                      ไม่พบข้อมูล
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          
          {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 bg-white border-t">
            <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">แสดง</span>
                  <select
                    value={recordsPerPage}
                    onChange={(e) => handleRecordsPerPageChange(e.target.value)}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                  <span className="text-sm text-gray-700">รายการต่อหน้า</span>
              </div>
              
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                  {getPageNumbers().map((number, index) => (
                    <Button
                      key={index}
                      variant={currentPage === number ? "default" : "outline"}
                      size="sm"
                      onClick={() => typeof number === 'number' && paginate(number)}
                      disabled={typeof number !== 'number'}
                      className={`h-8 w-8 ${typeof number !== 'number' ? 'cursor-default' : ''}`}
                    >
                      {number}
                    </Button>
                ))}
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          </>
        )}
      </main>
    </div>
  );
};

export default ApprovalDashboard; 