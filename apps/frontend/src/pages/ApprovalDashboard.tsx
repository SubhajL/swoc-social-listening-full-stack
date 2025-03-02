import { Card } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import logo1 from "@/assets/logo1.png";
import logo2 from "@/assets/logo2.png";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, Search, FileText, Bell, Settings } from "lucide-react";
import { useComplaintStore } from "@/stores/complaintStore";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

// Custom header component for the ApprovalDashboard page
const ApprovalDashboardHeader = () => {
  const navigate = useNavigate();

  const handleSettingsClick = () => {
    navigate('/system-setting');
  };

  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-6">
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

        {/* Navigation tabs - aligned with map and pushed up */}
        <div className="px-6 -mt-6 pb-0">
          <div className="flex">
            {/* This space accounts for the filter panel width and gap */}
            <div className="w-[450px]"></div>
            {/* Navigation tabs aligned with the Map */}
            <nav className="flex items-center border-b border-[#E2E8F0] whitespace-nowrap">
              <Link 
                to="/" 
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
      </div>
    </header>
  );
};

// Mock data for the table
const mockData = [
  {
    id: 1,
    type: "การขอข้อมูล",
    channel: "เฟซบุ๊ก สำนักงานชลประทานที่ 1",
    province: "เชียงใหม่",
    office: "สำนักงานชลประทานที่ 1",
    documentType: "สื่อสังคมออนไลน์",
    status: "เห็นชอบ",
    responsible: "นาย ณเดช ศุภมิตร",
  },
  {
    id: 2,
    type: "ข้อความย่อย",
    channel: "เฟซบุ๊ก สำนักงานชลประทานที่ 1",
    province: "ลำปาง",
    office: "สำนักงานชลประทานที่ 1",
    documentType: "สื่อสังคมออนไลน์",
    status: "รอความเห็นชอบ",
    responsible: "นาย ภูกฤษฎ์ แสนดี",
  },
  {
    id: 3,
    type: "การขอข้อมูล",
    channel: "ไลน์ สำนักงานชลประทานที่ 2",
    province: "พิษณุโลก",
    office: "สำนักงานชลประทานที่ 2",
    documentType: "สื่อสังคมออนไลน์",
    status: "เห็นชอบ",
    responsible: "นาย ณเดช ศุภมิตร",
  },
  {
    id: 4,
    type: "ข้อความย่อย",
    channel: "ทวิตเตอร์ สำนักงานชลประทานที่ 3",
    province: "อุตรดิตถ์",
    office: "สำนักงานชลประทานที่ 3",
    documentType: "สื่อสังคมออนไลน์",
    status: "รอความเห็นชอบ",
    responsible: "นาย ภูกฤษฎ์ แสนดี",
  },
  {
    id: 5,
    type: "การขอข้อมูล",
    channel: "เฟซบุ๊ก สำนักงานชลประทานที่ 4",
    province: "กำแพงเพชร",
    office: "สำนักงานชลประทานที่ 4",
    documentType: "สื่อสังคมออนไลน์",
    status: "เห็นชอบ",
    responsible: "นาย ณเดช ศุภมิตร",
  },
  {
    id: 6,
    type: "ข้อความย่อย",
    channel: "ไลน์ สำนักงานชลประทานที่ 5",
    province: "ลพบุรี",
    office: "สำนักงานชลประทานที่ 5",
    documentType: "สื่อสังคมออนไลน์",
    status: "รอความเห็นชอบ",
    responsible: "นาย ภูกฤษฎ์ แสนดี",
  },
  {
    id: 7,
    type: "การขอข้อมูล",
    channel: "เฟซบุ๊ก สำนักงานชลประทานที่ 6",
    province: "ขอนแก่น",
    office: "สำนักงานชลประทานที่ 6",
    documentType: "สื่อสังคมออนไลน์",
    status: "เห็นชอบ",
    responsible: "นาย ณเดช ศุภมิตร",
  },
  {
    id: 8,
    type: "ข้อความย่อย",
    channel: "ทวิตเตอร์ สำนักงานชลประทานที่ 7",
    province: "อุบลราชธานี",
    office: "สำนักงานชลประทานที่ 7",
    documentType: "สื่อสังคมออนไลน์",
    status: "รอความเห็นชอบ",
    responsible: "นาย ภูกฤษฎ์ แสนดี",
  },
  {
    id: 9,
    type: "การขอข้อมูล",
    channel: "เฟซบุ๊ก สำนักงานชลประทานที่ 8",
    province: "นครราชสีมา",
    office: "สำนักงานชลประทานที่ 8",
    documentType: "สื่อสังคมออนไลน์",
    status: "เห็นชอบ",
    responsible: "นาย ณเดช ศุภมิตร",
  },
  {
    id: 10,
    type: "ข้อความย่อย",
    channel: "ไลน์ สำนักงานชลประทานที่ 9",
    province: "ชลบุรี",
    office: "สำนักงานชลประทานที่ 9",
    documentType: "สื่อสังคมออนไลน์",
    status: "รอความเห็นชอบ",
    responsible: "นาย ภูกฤษฎ์ แสนดี",
  },
  {
    id: 11,
    type: "การขอข้อมูล",
    channel: "เฟซบุ๊ก สำนักงานชลประทานที่ 10",
    province: "ลำปาง",
    office: "สำนักงานชลประทานที่ 10",
    documentType: "สื่อสังคมออนไลน์",
    status: "เห็นชอบ",
    responsible: "นาย ณเดช ศุภมิตร",
  },
  {
    id: 12,
    type: "ข้อความย่อย",
    channel: "ทวิตเตอร์ สำนักงานชลประทานที่ 11",
    province: "นครศรีธรรมราช",
    office: "สำนักงานชลประทานที่ 11",
    documentType: "สื่อสังคมออนไลน์",
    status: "รอความเห็นชอบ",
    responsible: "นาย ภูกฤษฎ์ แสนดี",
  },
  {
    id: 13,
    type: "การขอข้อมูล",
    channel: "เฟซบุ๊ก สำนักงานชลประทานที่ 12",
    province: "สงขลา",
    office: "สำนักงานชลประทานที่ 12",
    documentType: "สื่อสังคมออนไลน์",
    status: "เห็นชอบ",
    responsible: "นาย ณเดช ศุภมิตร",
  },
  {
    id: 14,
    type: "ข้อความย่อย",
    channel: "ไลน์ สำนักงานชลประทานที่ 13",
    province: "กรุงเทพมหานคร",
    office: "สำนักงานชลประทานที่ 13",
    documentType: "สื่อสังคมออนไลน์",
    status: "รอความเห็นชอบ",
    responsible: "นาย ภูกฤษฎ์ แสนดี",
  },
  {
    id: 15,
    type: "การขอข้อมูล",
    channel: "เฟซบุ๊ก สำนักงานชลประทานที่ 14",
    province: "ปทุมธานี",
    office: "สำนักงานชลประทานที่ 14",
    documentType: "สื่อสังคมออนไลน์",
    status: "เห็นชอบ",
    responsible: "นาย ณเดช ศุภมิตร",
  },
  {
    id: 16,
    type: "ข้อความย่อย",
    channel: "ทวิตเตอร์ สำนักงานชลประทานที่ 15",
    province: "นนทบุรี",
    office: "สำนักงานชลประทานที่ 15",
    documentType: "สื่อสังคมออนไลน์",
    status: "รอความเห็นชอบ",
    responsible: "นาย ภูกฤษฎ์ แสนดี",
  },
  {
    id: 17,
    type: "การขอข้อมูล",
    channel: "เฟซบุ๊ก สำนักงานชลประทานที่ 16",
    province: "สมุทรปราการ",
    office: "สำนักงานชลประทานที่ 16",
    documentType: "สื่อสังคมออนไลน์",
    status: "เห็นชอบ",
    responsible: "นาย ณเดช ศุภมิตร",
  },
  {
    id: 18,
    type: "ข้อความย่อย",
    channel: "ไลน์ สำนักงานชลประทานที่ 17",
    province: "สมุทรสาคร",
    office: "สำนักงานชลประทานที่ 17",
    documentType: "สื่อสังคมออนไลน์",
    status: "รอความเห็นชอบ",
    responsible: "นาย ภูกฤษฎ์ แสนดี",
  },
];

// Column definition for the table
const columns = [
  { id: "type", name: "ประเภทข้อความ", sortable: true },
  { id: "channel", name: "ช่องทางการสื่อสาร", sortable: true },
  { id: "province", name: "จังหวัด", sortable: true },
  { id: "office", name: "สำนักงานชลประทาน", sortable: true },
  { id: "documentType", name: "ประเภทเอกสารตอบ", sortable: true },
  { id: "status", name: "สถานะ", sortable: true },
  { id: "responsible", name: "ผู้รับผิดชอบ", sortable: false },
  { id: "action", name: "รายละเอียด", sortable: false },
];

// ApprovalDashboard Component
const ApprovalDashboard = () => {
  const navigate = useNavigate();
  const complaintStore = useComplaintStore();
  
  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(9);
  const [totalRecords, setTotalRecords] = useState(mockData.length);
  
  // State for sorting
  const [sortColumn, setSortColumn] = useState("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  
  // State for filtering
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  
  // State for filtered and sorted data
  const [filteredData, setFilteredData] = useState(mockData);
  
  // Calculate pagination values
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredData.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredData.length / recordsPerPage);
  
  // Handle page change
  const paginate = (pageNumber: number) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };
  
  // Handle records per page change
  const handleRecordsPerPageChange = (value: string) => {
    setRecordsPerPage(Number(value));
    setCurrentPage(1); // Reset to first page when changing records per page
  };
  
  // Handle sorting
  const handleSort = (columnId: string) => {
    const isAsc = sortColumn === columnId && sortDirection === "asc";
    setSortDirection(isAsc ? "desc" : "asc");
    setSortColumn(columnId);
  };
  
  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  // Handle filter change
  const handleFilterChange = (columnId: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [columnId]: value,
    }));
  };
  
  // Apply filters and sorting
  useEffect(() => {
    let result = [...mockData];
    
    // Apply filters
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        result = result.filter(item => 
          String(item[key as keyof typeof item])
            .toLowerCase()
            .includes(filters[key].toLowerCase())
        );
      }
    });
    
    // Apply search term across all columns
    if (searchTerm) {
      result = result.filter(item => 
        Object.values(item).some(
          value => String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
    
    // Apply sorting
    if (sortColumn) {
      result.sort((a, b) => {
        const aValue = a[sortColumn as keyof typeof a];
        const bValue = b[sortColumn as keyof typeof b];
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortDirection === "asc" 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        
        return sortDirection === "asc" 
          ? (aValue > bValue ? 1 : -1)
          : (bValue > aValue ? 1 : -1);
      });
    }
    
    setFilteredData(result);
    setTotalRecords(result.length);
  }, [filters, searchTerm, sortColumn, sortDirection]);
  
  // Reset pagination when filtered data changes
  useEffect(() => {
    if (currentPage > Math.ceil(filteredData.length / recordsPerPage)) {
      setCurrentPage(1);
    }
  }, [filteredData, recordsPerPage]);
  
  const handleBack = () => {
    // Check if we have complaint data in the store before navigating back
    if (complaintStore.complaintData) {
      console.log("[ApprovalDashboard] Navigating back with complaint data in store");
      
      try {
        // Store essential data in sessionStorage
        const essentialData = {
          from: 'ApprovalDashboard',
          returnToDocumentPreparation: true,
          timestamp: new Date().getTime(),
          complaintData: complaintStore.complaintData
        };
        
        // Store the state in sessionStorage to retrieve it on the target page
        sessionStorage.setItem('documentPreparationState', JSON.stringify(essentialData));
        
        // Navigate to document preparation page
        navigate('/document-preparation');
      } catch (error) {
        console.error("[ApprovalDashboard] Error storing data in sessionStorage:", error);
        // Fallback navigation
        navigate('/document-preparation');
      }
    } else {
      console.log("[ApprovalDashboard] No complaint data in store, navigating to home");
      navigate('/');
    }
  };
  
  const handleViewDetails = (id: number) => {
    console.log(`Viewing details for record ${id}`);
    navigate(`/approval-step`);
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
    <div className="min-h-screen bg-[#F0F8FF]">
      <ApprovalDashboardHeader />
      
      {/* Page Title */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-6 py-4">
          <h1 className="text-3xl font-semibold text-[#17254D]">ระบบตอบประเด็นข้อร้องเรียน</h1>
        </div>
      </div>
      
      <main className="container mx-auto px-6 py-6">
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
        
        {/* Table */}
        <Card className="shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column) => (
                    <TableHead key={column.id} className="bg-gray-50 text-gray-700 font-medium">
                      <div className="flex items-center gap-1">
                        {column.name}
                        {column.sortable && (
                          <button
                            onClick={() => handleSort(column.id)}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                          </button>
                        )}
                      </div>
                      {column.id !== "action" && column.id !== "responsible" && (
                        <div className="mt-2">
                          <Input
                            placeholder={`กรอง${column.name}`}
                            value={filters[column.id] || ""}
                            onChange={(e) => handleFilterChange(column.id, e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentRecords.length > 0 ? (
                  currentRecords.map((record) => (
                    <TableRow key={record.id} className="hover:bg-gray-50">
                      <TableCell>{record.type}</TableCell>
                      <TableCell>{record.channel}</TableCell>
                      <TableCell>{record.province}</TableCell>
                      <TableCell>{record.office}</TableCell>
                      <TableCell>{record.documentType}</TableCell>
                      <TableCell>
                        <Badge 
                          className={`${
                            record.status === "เห็นชอบ" 
                              ? "bg-green-100 text-green-800" 
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{record.responsible}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewDetails(record.id)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <FileText className="h-5 w-5" />
                        </Button>
                      </TableCell>
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
          </div>
          
          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-4 border-t">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">Show</span>
              <Select
                value={String(recordsPerPage)}
                onValueChange={handleRecordsPerPageChange}
              >
                <SelectTrigger className="w-16 h-8">
                  <SelectValue placeholder={recordsPerPage} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="9">9</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-gray-700">per page</span>
            </div>
            
            <div className="flex items-center">
              <div className="text-sm text-gray-700 mr-4">
                {indexOfFirstRecord + 1}-{Math.min(indexOfLastRecord, totalRecords)} of {totalRecords}
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
                
                {getPageNumbers().map((page, index) => (
                  typeof page === 'number' ? (
                    <Button
                      key={index}
                      variant={currentPage === page ? "default" : "outline"}
                      onClick={() => paginate(page)}
                      className={`h-8 w-8 ${
                        currentPage === page 
                          ? "bg-blue-600 text-white" 
                          : "text-gray-700"
                      }`}
                    >
                      {page}
                    </Button>
                  ) : (
                    <span key={index} className="px-2">
                      {page}
                    </span>
                  )
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
        </Card>
      </main>
    </div>
  );
};

export default ApprovalDashboard; 