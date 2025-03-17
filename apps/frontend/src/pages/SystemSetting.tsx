import { Card } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import logo1 from "@/assets/logo1.png";
import logo2 from "@/assets/logo2.png";
import { Bell, ChevronDown, Settings, Trash2, X, HelpCircle, Info } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";

// Interface for user account form input
interface UserAccount {
  name: string;
  email: string;
  position: string;
}

// Interface for loaded user accounts from API
interface LoadedUserAccount {
  id: number;
  name: string;
  email: string;
  position: string;
  office_id: string;
  password_changed: boolean;
  created_at: string;
}

// Function to generate a random password
const generateRandomPassword = (length = 10) => {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  return password;
};

// Custom header component for the SystemSetting page
const SystemSettingHeader = () => {
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
      </div>
    </header>
  );
};

// Custom dropdown component with full styling control
const CustomDropdown = ({ value, onChange, options, placeholder, disabled = false, isLoading = false }: { 
  value: string, 
  onChange: (value: string) => void, 
  options: { value: string, label: string }[],
  placeholder: string,
  disabled?: boolean,
  isLoading?: boolean
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownRef]);
  
  // Get the selected option label
  const selectedLabel = value 
    ? options.find(option => option.value === value)?.label || placeholder
    : placeholder;
  
  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown button */}
      <div 
        className={`flex items-center justify-between w-full bg-white text-sm px-3 py-1.5 rounded-md border border-gray-300 shadow-sm ${disabled || isLoading ? 'bg-gray-100 cursor-not-allowed' : 'cursor-pointer hover:border-blue-400 focus:border-blue-500'} transition-colors`}
        onClick={() => !disabled && !isLoading && setIsOpen(!isOpen)}
      >
        <span className={`truncate ${!value ? 'text-gray-500' : 'text-gray-900'}`}>
          {isLoading ? 'กำลังโหลดข้อมูล...' : selectedLabel}
        </span>
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
        ) : (
          <ChevronDown className={`h-5 w-5 text-gray-400 flex-shrink-0 ${disabled ? 'opacity-50' : ''}`} />
        )}
      </div>
      
      {/* Dropdown menu */}
      {isOpen && !disabled && !isLoading && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {options.map((option) => (
            <div
              key={option.value}
              className={`px-4 py-2 text-sm cursor-pointer transition-all rounded-md mx-1 my-0.5 ${
                value === option.value 
                  ? 'bg-blue-50 text-blue-600 border border-blue-300 rounded-md' 
                  : 'text-gray-900 hover:bg-blue-50 hover:border hover:border-blue-300 hover:rounded-md'
              }`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// User list component
const UserList = ({ users, isLoading, officeOptions }: { 
  users: LoadedUserAccount[], 
  isLoading: boolean,
  officeOptions: { value: string, label: string }[]
}) => {
  // Helper function to get office name by ID
  const getOfficeName = (officeId: string) => {
    const office = officeOptions.find(o => o.value === officeId);
    return office ? office.label : "ไม่ระบุหน่วยงาน";
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 border rounded-lg bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-t-blue-500 border-b-blue-500 border-l-transparent border-r-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }
  
  if (users.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 border rounded-lg bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">ไม่พบข้อมูลผู้ใช้งานสำหรับหน่วยงานนี้</p>
        </div>
      </div>
    );
  }
  
  return (
    <div>
      {/* Status legend */}
      <div className="mb-2 flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span>เปลี่ยนรหัสผ่านแล้ว</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold text-[10px]">
            !
          </div>
          <span>ยังไม่ได้เปลี่ยนรหัสผ่าน</span>
        </div>
      </div>
      
      {/* User table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full table-fixed">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 tracking-wider w-1/3">ชื่อ-นามสกุล</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 tracking-wider w-1/3">อีเมล</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 tracking-wider w-1/3">ตำแหน่ง</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-4 py-4 text-center text-sm text-gray-900 truncate">
                  <div className="flex items-center justify-center gap-2">
                    {user.name}
                    {user.password_changed ? (
                      <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold text-[10px]">
                        !
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 text-center text-sm text-gray-600">
                  <div className="truncate max-w-full mx-auto">{user.email}</div>
                </td>
                <td className="px-4 py-4 text-center text-sm text-gray-600 truncate">{user.position}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Tab interface for type safety
interface SettingTab {
  id: string;
  label: string;
  content: React.ReactNode;
}

// Custom tooltip component
const Tooltip = ({ content, children }: { content: string, children: React.ReactNode }) => {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  return (
    <div className="relative inline-block">
      <div 
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="inline-flex"
      >
        {children}
      </div>
      
      {isVisible && (
        <div 
          ref={tooltipRef}
          className="absolute z-50 w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg"
          style={{ bottom: '100%', left: '50%', transform: 'translateX(-50%) translateY(-8px)' }}
        >
          <div className="relative">
            {content}
            <div 
              className="absolute w-2 h-2 bg-gray-800 rotate-45"
              style={{ bottom: '-8px', left: 'calc(50% - 4px)' }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
};

// SystemSetting Component
const SystemSetting = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>("user-management");
  const [selectedOffice, setSelectedOffice] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadedUsers, setLoadedUsers] = useState<LoadedUserAccount[]>([]);
  
  // Add state for edit mode
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  
  // Add state for development mode
  const [devMode, setDevMode] = useState<boolean>(false);
  
  // Add state for confirmation dialog
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  
  // State for the three user accounts
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>([
    { name: "", email: "", position: "" },
    { name: "", email: "", position: "" },
    { name: "", email: "", position: "" }
  ]);

  // State to track if emails have been sent for each user
  const [emailSent, setEmailSent] = useState<{[key: string]: boolean}>({});
  
  // State to track if there are any changes to the form
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  
  // State to track the original user accounts for comparison
  const [originalUserAccounts, setOriginalUserAccounts] = useState<UserAccount[]>([
    { name: "", email: "", position: "" },
    { name: "", email: "", position: "" },
    { name: "", email: "", position: "" }
  ]);

  // Office options for dropdown
  const officeOptions = [
    { value: "0", label: "ศูนย์ปฏิบัติการน้ำอัจฉริยะ" },
    { value: "1", label: "สำนักงานชลประทานที่ 1" },
    { value: "2", label: "สำนักงานชลประทานที่ 2" },
    { value: "3", label: "สำนักงานชลประทานที่ 3" },
    { value: "4", label: "สำนักงานชลประทานที่ 4" },
    { value: "5", label: "สำนักงานชลประทานที่ 5" },
    { value: "6", label: "สำนักงานชลประทานที่ 6" },
    { value: "7", label: "สำนักงานชลประทานที่ 7" },
    { value: "8", label: "สำนักงานชลประทานที่ 8" },
    { value: "9", label: "สำนักงานชลประทานที่ 9" },
    { value: "10", label: "สำนักงานชลประทานที่ 10" },
    { value: "11", label: "สำนักงานชลประทานที่ 11" },
    { value: "12", label: "สำนักงานชลประทานที่ 12" },
    { value: "13", label: "สำนักงานชลประทานที่ 13" },
    { value: "14", label: "สำนักงานชลประทานที่ 14" },
    { value: "15", label: "สำนักงานชลประทานที่ 15" },
    { value: "16", label: "สำนักงานชลประทานที่ 16" },
    { value: "17", label: "สำนักงานชลประทานที่ 17" }
  ];

  // Position options for dropdown
  const positionOptions = [
    { value: "1", label: "ประชาสัมพันธ์" },
    { value: "2", label: "ผู้อำนวยการส่วนบริหารทั่วไป" },
    { value: "3", label: "ผู้อำนวยการสำนักงานชลประทาน" },
    { value: "4", label: "ผู้อำนวยการส่วนวิเคราะห์และประเมินผลสถานการณ์น้ำ" },
    { value: "5", label: "ผู้อำนวยการสำนักบริหารจัดการน้ำและอุทกวิทยา" }
  ];
  
  // Load users for the selected office
  const loadUsers = async (resetForm = true) => {
    console.log("Loading users for office ID:", selectedOffice);
    console.log("Current loadedUsers state:", loadedUsers);
    const officeId = selectedOffice;
    
    if (!officeId) {
      console.log("No office ID provided, returning early");
      return;
    }
    
    setIsLoading(true);
    setLoadedUsers([]); // Clear the loaded users first
    
    try {
      console.log(`Fetching users from ${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/office/${officeId}`);
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/office/${officeId}`, {
        // Add cache busting to prevent browser caching
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error fetching users: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log("Fetch users response:", result);
      
      if (result.success) {
        console.log(`Loaded ${result.data.users.length} users from API`);
        // Ensure we're setting with a new array to trigger state updates
        setLoadedUsers([...result.data.users]);
        
        // Only reset the form if resetForm is true
        if (resetForm) {
          console.log("Resetting form with fetched users");
          // Sort users by position (1, 2, 3)
          const sortedUsers = [...result.data.users].sort((a, b) => {
            const posA = parseInt(a.position);
            const posB = parseInt(b.position);
            return posA - posB;
          });
          console.log("Sorted users by position:", sortedUsers);
          
          // Create a new array with 3 slots for positions 1, 2, and 3
          const positionedUsers: UserAccount[] = [
            { name: "", email: "", position: "" },
            { name: "", email: "", position: "" },
            { name: "", email: "", position: "" }
          ];
          
          // Place users in the correct position based on their position value
          sortedUsers.forEach(user => {
            const position = parseInt(user.position);
            if (position >= 1 && position <= 3) {
              positionedUsers[position - 1] = {
                name: user.name,
                email: user.email,
                position: user.position
              };
              console.log(`Placed user ${user.name} in position ${position}`);
            }
          });
          
          console.log("Final positioned users:", positionedUsers);
          setUserAccounts(positionedUsers);
          setOriginalUserAccounts(JSON.parse(JSON.stringify(positionedUsers)));
          setHasChanges(false);
          console.log("Form reset complete");
        } else {
          console.log("Not resetting form, keeping current user data");
          console.log("Current userAccounts maintained:", userAccounts);
        }
      } else {
        console.log("API returned error:", result.message);
        toast.error("ไม่สามารถดึงข้อมูลผู้ใช้งานได้", {
          description: result.message,
        });
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("เกิดข้อผิดพลาดในการดึงข้อมูลผู้ใช้งาน", {
        description: (error as Error).message,
      });
    } finally {
      setIsLoading(false);
      console.log("=== fetchUsersByOffice END ===");
    }
  };
  
  // Effect to fetch users when office changes
  useEffect(() => {
    console.log("=== selectedOffice useEffect triggered ===");
    console.log("selectedOffice changed to:", selectedOffice);
    
    if (selectedOffice) {
      console.log("Calling fetchUsersByOffice from useEffect");
      loadUsers(true);
    } else {
      console.log("No office selected, skipping fetch");
    }
  }, [selectedOffice]);
  
  // Effect to update emailSent state when loadedUsers changes
  useEffect(() => {
    console.log("=== loadedUsers useEffect triggered ===");
    console.log("loadedUsers changed:", loadedUsers);
    
    if (loadedUsers.length > 0) {
      // For any loaded users, assume email was sent
      const newEmailSent = { ...emailSent };
      loadedUsers.forEach(user => {
        newEmailSent[user.email] = true;
      });
      
      console.log("Setting emailSent state:", newEmailSent);
      setEmailSent(newEmailSent);
    } else {
      console.log("No loaded users, skipping emailSent update");
    }
  }, [loadedUsers]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Handle input change for a specific user
  const handleUserInputChange = (index: number, field: keyof UserAccount, value: string) => {
    const updatedAccounts = [...userAccounts];
    updatedAccounts[index][field] = value;
    setUserAccounts(updatedAccounts);
    
    // Check if there are changes compared to the original data
    const hasAnyChanges = updatedAccounts.some((account, idx) => {
      // Get the original account
      const original = originalUserAccounts[idx];
      
      // Check if this is an existing user being modified
      const isExistingUser = loadedUsers.some(user => user.email === original.email);
      
      // If this is an existing user being cleared (deleted)
      if (isExistingUser && 
          (original.name || original.email) && 
          (!account.name || !account.email)) {
        return true;
      }
      
      // Regular field comparison
      return account.name !== original.name ||
             account.email !== original.email ||
             account.position !== original.position;
    });
    
    setHasChanges(hasAnyChanges);
    
    // Log the changes for debugging
    console.log("User input changed:", field, value);
    console.log("Has changes:", hasAnyChanges);
  };
  
  // Toggle edit mode
  const toggleEditMode = () => {
    console.log("Toggling edit mode, current state:", isEditMode);
    
    if (isEditMode) {
      // If exiting edit mode, reset to original state
      console.log("Exiting edit mode, resetting to original state");
      setUserAccounts(JSON.parse(JSON.stringify(originalUserAccounts)));
      setHasChanges(false);
      setIsEditMode(false);
    } else {
      // If entering edit mode, make sure we have the latest data
      console.log("Entering edit mode");
      
      // If we have loaded users, make sure they're properly positioned in the form
      if (loadedUsers.length > 0) {
        console.log("Positioning loaded users in the form");
        
        // Sort users by position (1, 2, 3)
        const sortedUsers = [...loadedUsers].sort((a, b) => {
          const posA = parseInt(a.position);
          const posB = parseInt(b.position);
          return posA - posB;
        });
        
        // Create a new array with 3 slots for positions 1, 2, and 3
        const positionedUsers: UserAccount[] = [
          { name: "", email: "", position: "" },
          { name: "", email: "", position: "" },
          { name: "", email: "", position: "" }
        ];
        
        // Place users in the correct position based on their position value
        sortedUsers.forEach(user => {
          const position = parseInt(user.position);
          if (position >= 1 && position <= 3) {
            positionedUsers[position - 1] = {
              name: user.name,
              email: user.email,
              position: user.position
            };
          }
        });
        
        console.log("Positioned users for edit mode:", positionedUsers);
        setUserAccounts(positionedUsers);
        setOriginalUserAccounts(JSON.parse(JSON.stringify(positionedUsers)));
      }
      
      setIsEditMode(true);
    }
  };
  
  // Handle save button click - now opens confirmation dialog
  const handleSaveClick = () => {
    console.log("Save button clicked, showing confirmation dialog");
    setShowConfirmation(true);
  };
  
  // Get a summary of changes for the confirmation dialog
  const getChangesSummary = () => {
    // Categorize accounts
    const validAccounts = userAccounts.filter(account => account.name && account.email && account.position);
    const newUsers = validAccounts.filter(account => !isExistingUser(account.email));
    const existingUsers = validAccounts.filter(account => isExistingUser(account.email));
    
    // Check if there are existing users that have been modified
    const modifiedExistingUsers = existingUsers.filter(account => {
      const existingUser = getExistingUserData(account.email);
      return existingUser && (
        existingUser.name !== account.name ||
        existingUser.position !== account.position
      );
    });
    
    // Find accounts that are being deleted (existing users that are now empty)
    const deletedAccounts = originalUserAccounts
      .filter(account => account.name && account.email) // Only consider non-empty original accounts
      .filter(original => {
        // Check if this account exists in loadedUsers (is an existing user)
        const isExisting = loadedUsers.some(user => user.email === original.email);
        if (!isExisting) return false;
        
        // Check if this account is now empty or incomplete in userAccounts
        return !userAccounts.some(current => 
          current.email === original.email && 
          current.name && 
          current.email && 
          current.position
        );
      })
      .map(account => {
        // Get the full user data from loadedUsers
        const userData = loadedUsers.find(user => user.email === account.email);
        return {
          name: userData?.name || account.name,
          email: userData?.email || account.email,
          position: userData?.position || account.position
        };
      });
    
    return {
      newUsers,
      modifiedExistingUsers,
      deletedAccounts
    };
  };
  
  // Function to reset the form
  const resetForm = () => {
    // Reset user accounts to empty state
    setUserAccounts([
      { name: "", email: "", position: "" },
      { name: "", email: "", position: "" },
      { name: "", email: "", position: "" }
    ]);
    
    // Reset edit mode
    setIsEditMode(false);
    
    // Reset changes flag
    setHasChanges(false);
    
    // Reset email sent status
    setEmailSent({});
    
    console.log("Form reset to initial state");
  };
  
  // Handle actual save after confirmation
  const handleSaveUsers = async () => {
    console.log("=== handleSaveUsers START ===");
    console.log("Current userAccounts:", userAccounts);
    console.log("Current selectedOffice:", selectedOffice);
    console.log("Is in edit mode:", isEditMode);
    console.log("Is in dev mode:", devMode);
    
    // Close confirmation dialog if it's open
    setShowConfirmation(false);
    
    // Validate inputs - only check for partial data (name or email without the other)
    const hasPartialData = userAccounts.some(
      account => (account.name && !account.email) || (!account.name && account.email)
    );
    
    if (hasPartialData) {
      console.log("Validation failed: Partial data");
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน", {
        description: "หากต้องการบันทึกผู้ใช้งาน กรุณากรอกทั้งชื่อและอีเมล",
      });
      return;
    }
    
    if (!selectedOffice) {
      console.log("Validation failed: No office selected");
      toast.error("กรุณาเลือกหน่วยงาน", {
        description: "กรุณาเลือกหน่วยงานก่อนบันทึกข้อมูล",
      });
      return;
    }
    
    // Show loading toast
    const loadingToast = toast.loading(isEditMode ? "กำลังแก้ไขข้อมูล..." : "กำลังบันทึกข้อมูล...");
    
    try {
      // Get the changes summary
      const changesSummary = getChangesSummary();
      console.log("Changes summary:", changesSummary);
      
      // If no changes, show message and return
      if (changesSummary.newUsers.length === 0 && 
          changesSummary.modifiedExistingUsers.length === 0 && 
          changesSummary.deletedAccounts.length === 0) {
        toast.dismiss(loadingToast);
        toast.info("ไม่มีข้อมูลที่ต้องบันทึก", {
          description: "ไม่พบการเปลี่ยนแปลงข้อมูลใดๆ",
        });
        return;
      }
      
      // Process deletions if there are accounts to delete
      if (changesSummary.deletedAccounts.length > 0) {
        console.log("Processing deletions:", changesSummary.deletedAccounts);
        
        // Get the IDs of users to delete
        const userIdsToDelete = changesSummary.deletedAccounts
          .map(account => {
            // Find the user in loadedUsers by email
            const user = loadedUsers.find(u => u.email === account.email);
            return user ? user.id : null;
          })
          .filter(id => id !== null) as number[];
        
        if (userIdsToDelete.length > 0) {
          console.log("User IDs to delete:", userIdsToDelete);
          
          try {
            // Make API call to delete users
            const deleteResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/batch`, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ user_ids: userIdsToDelete })
            });
            
            if (!deleteResponse.ok) {
              throw new Error(`Server responded with status: ${deleteResponse.status}`);
            }
            
            const deleteResult = await deleteResponse.json();
            console.log("Delete API response:", deleteResult);
            
            if (deleteResult.success) {
              toast.success("ลบข้อมูลผู้ใช้งานสำเร็จ", {
                description: `ลบข้อมูลผู้ใช้งานสำเร็จ ${deleteResult.data.deleted.length} รายการ`,
              });
              
              // Explicitly update loadedUsers to remove deleted users
              const deletedIds = deleteResult.data.deleted.map((user: any) => user.id);
              setLoadedUsers(prevUsers => prevUsers.filter(user => !deletedIds.includes(user.id)));
            } else {
              toast.error("เกิดข้อผิดพลาดในการลบข้อมูล", {
                description: deleteResult.message || "กรุณาลองใหม่อีกครั้ง",
              });
            }
          } catch (error) {
            console.error("Error deleting users:", error);
            toast.error("เกิดข้อผิดพลาดในการลบข้อมูล", {
              description: (error as Error).message || "กรุณาลองใหม่อีกครั้ง",
            });
          }
        }
      }
      
      // Process modifications if there are users to modify
      if (changesSummary.modifiedExistingUsers.length > 0) {
        // Removed the toast notification that was here
      }
      
      // Process new users if there are any
      if (changesSummary.newUsers.length > 0) {
        // Only check for duplicate emails if not in dev mode
        if (!devMode) {
          // Check for duplicate emails within the new users
          const emailCounts: {[key: string]: number} = {};
          changesSummary.newUsers.forEach(user => {
            emailCounts[user.email] = (emailCounts[user.email] || 0) + 1;
          });
          
          const duplicateEmails = Object.entries(emailCounts)
            .filter(([_, count]) => count > 1)
            .map(([email]) => email);
          
          if (duplicateEmails.length > 0) {
            toast.dismiss(loadingToast);
            toast.error("พบอีเมลซ้ำ", {
              description: `อีเมลต่อไปนี้ถูกใช้ซ้ำ: ${duplicateEmails.join(', ')}`,
            });
            return;
          }
          
          // Also check for duplicate emails with existing users in the database
          const existingEmails = loadedUsers.map(user => user.email);
          const conflictingEmails = changesSummary.newUsers
            .filter(user => existingEmails.includes(user.email))
            .map(user => user.email);
          
          if (conflictingEmails.length > 0) {
            toast.dismiss(loadingToast);
            toast.error("พบอีเมลซ้ำกับผู้ใช้งานที่มีอยู่แล้ว", {
              description: `อีเมลต่อไปนี้ถูกใช้งานแล้ว: ${conflictingEmails.join(', ')}`,
            });
            return;
          }
        } else {
          console.log("Dev mode enabled, skipping duplicate email checks");
        }
        
        // Prepare data for API - only for new users
        const apiData = {
          office_id: selectedOffice,
          users: changesSummary.newUsers.map(account => ({
            name: account.name,
            email: account.email,
            position: account.position
          }))
        };
        
        console.log("Saving new user data:", apiData);
        
        // Make API call to backend
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/users/batch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(apiData)
        });
        
        const result = await response.json();
        console.log("API response for new users:", result);
        
        if (result.success) {
          console.log("Save successful for new users");
          
          // Show success message
          toast.success("บันทึกข้อมูลสำเร็จ", {
            description: `บันทึกข้อมูลสำเร็จ สร้างบัญชีใหม่ ${result.data.created.length} รายการ`,
          });
          
          // Update email sent status for newly created users
          if (result.data.emails) {
            const newEmailSent = { ...emailSent };
            result.data.emails.forEach((emailResult: { email: string, success: boolean }) => {
              if (emailResult.success) {
                newEmailSent[emailResult.email] = true;
              }
            });
            console.log("Updated emailSent:", newEmailSent);
            setEmailSent(newEmailSent);
          }
        } else {
          console.log("Save failed for new users");
          toast.error("เกิดข้อผิดพลาดในการบันทึกข้อมูล", {
            description: result.message || "กรุณาลองใหม่อีกครั้ง",
          });
        }
      }
      
      // Reload users after all operations
      await loadUsers();
      
      // Reset form if there were any successful operations
      if (changesSummary.newUsers.length > 0 || changesSummary.deletedAccounts.length > 0) {
        console.log("Resetting form after successful operations");
        resetForm();
        
        // Force a refresh of the user list to ensure UI is updated
        if (selectedOffice) {
          console.log("Reloading users after form reset");
          await loadUsers(true);
        }
      }
      
    } catch (error) {
      console.error("Error saving users:", error);
      toast.error("เกิดข้อผิดพลาดในการบันทึกข้อมูล", {
        description: (error as Error).message || "กรุณาลองใหม่อีกครั้ง",
      });
    } finally {
      // Always dismiss loading toast
      toast.dismiss(loadingToast);
    }
    
    console.log("=== handleSaveUsers END ===");
  };
  
  // Handle reset button click
  const handleReset = () => {
    setUserAccounts([
      { name: "", email: "", position: "" },
      { name: "", email: "", position: "" },
      { name: "", email: "", position: "" }
    ]);
    setOriginalUserAccounts([
      { name: "", email: "", position: "" },
      { name: "", email: "", position: "" },
      { name: "", email: "", position: "" }
    ]);
    setHasChanges(false);
  };
  
  // Helper function to check if a user exists in loadedUsers
  const isExistingUser = (email: string) => {
    return loadedUsers.some(user => user.email === email);
  };
  
  // Helper function to get user data from loadedUsers
  const getExistingUserData = (email: string) => {
    return loadedUsers.find(user => user.email === email);
  };

  // Define tabs
  const tabs: SettingTab[] = [
    {
      id: "user-management",
      label: "การจัดการบัญชีผู้ใช้งาน",
      content: (
        <div className="p-6">
          <h3 className="text-xl font-semibold mb-4">
            การจัดการบัญชีผู้ใช้งาน
            <Tooltip content="ระบบจัดการบัญชีผู้ใช้งานสำหรับกำหนดสิทธิ์การเข้าใช้งานระบบตามบทบาทหน้าที่ สามารถเพิ่มผู้ใช้งานได้สูงสุด 3 คนต่อหน่วยงาน">
              <Info className="w-4 h-4 text-gray-500 ml-2 inline-block cursor-help" />
            </Tooltip>
          </h3>
          <p className="text-gray-600 mb-6">ระบบจัดการบัญชีผู้ใช้งาน สำหรับกำหนดสิทธิ์การเข้าใช้งานระบบตามบทบาทหน้าที่</p>
          
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Irrigation Office Dropdown */}
            <div className="w-full lg:w-1/3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                หน่วยงาน
              </label>
              <CustomDropdown
                value={selectedOffice}
                onChange={setSelectedOffice}
                options={officeOptions}
                placeholder="เลือกสำนักงานชลประทาน"
                isLoading={isLoading}
              />
              
              {/* Display loaded users if an office is selected */}
              {selectedOffice && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-medium text-gray-700">รายชื่อผู้ใช้งานปัจจุบัน</h4>
                    <button 
                      className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      onClick={() => {
                        console.log("Refresh button clicked");
                        loadUsers(true);
                      }}
                    >
                      <span>โหลดข้อมูลใหม่</span>
                    </button>
                  </div>
                  <UserList users={loadedUsers} isLoading={isLoading} officeOptions={officeOptions} />
                </div>
              )}
            </div>
            
            {/* User Profiles Section */}
            <div className="w-full lg:w-2/3">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="text-sm text-gray-700 font-medium mb-4">ผู้ใช้งานระบบ</div>
                
                {/* User Profiles */}
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                  {/* User 1 */}
                  <div className="flex-1 p-4 border border-gray-200 rounded-lg">
                    <div className="flex justify-center mb-4 relative">
                      <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      {/* Status indicator */}
                      {userAccounts[0].email && isExistingUser(userAccounts[0].email) && (
                        <div className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4">
                          {getExistingUserData(userAccounts[0].email)?.password_changed ? (
                            <Tooltip content="ผู้ใช้งานนี้ได้เปลี่ยนรหัสผ่านแล้ว">
                              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white cursor-help">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            </Tooltip>
                          ) : (
                            <Tooltip content="ผู้ใช้งานนี้ยังไม่ได้เปลี่ยนรหัสผ่าน">
                              <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold cursor-help">
                                !
                              </div>
                            </Tooltip>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">ชื่อ-นามสกุล</label>
                        <input
                          type="text"
                          className={`w-full text-sm rounded-md border border-gray-300 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${userAccounts[0].email && isExistingUser(userAccounts[0].email) && !isEditMode ? 'bg-gray-100' : ''}`}
                          placeholder="กรอก ชื่อ - นามสกุล"
                          value={userAccounts[0].name}
                          onChange={(e) => handleUserInputChange(0, 'name', e.target.value)}
                          disabled={!!(userAccounts[0].email && isExistingUser(userAccounts[0].email) && !isEditMode)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">อีเมล</label>
                        <input 
                          type="email" 
                          className={`w-full text-sm rounded-md border border-gray-300 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${userAccounts[0].email && isExistingUser(userAccounts[0].email) && !isEditMode ? 'bg-gray-100' : ''}`}
                          placeholder="กรอก อีเมล"
                          value={userAccounts[0].email}
                          onChange={(e) => handleUserInputChange(0, 'email', e.target.value)}
                          disabled={!!(userAccounts[0].email && isExistingUser(userAccounts[0].email) && !isEditMode)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">ตำแหน่ง</label>
                        <CustomDropdown 
                          value={userAccounts[0].position}
                          onChange={(value) => handleUserInputChange(0, 'position', value)}
                          options={positionOptions}
                          placeholder="เลือกตำแหน่ง"
                          disabled={!!(userAccounts[0].email && isExistingUser(userAccounts[0].email) && !isEditMode)}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* User 2 */}
                  <div className="flex-1 p-4 border border-gray-200 rounded-lg">
                    <div className="flex justify-center mb-4 relative">
                      <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      {/* Status indicator */}
                      {userAccounts[1].email && isExistingUser(userAccounts[1].email) && (
                        <div className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4">
                          {getExistingUserData(userAccounts[1].email)?.password_changed ? (
                            <Tooltip content="ผู้ใช้งานนี้ได้เปลี่ยนรหัสผ่านแล้ว">
                              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white cursor-help">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            </Tooltip>
                          ) : (
                            <Tooltip content="ผู้ใช้งานนี้ยังไม่ได้เปลี่ยนรหัสผ่าน">
                              <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold cursor-help">
                                !
                              </div>
                            </Tooltip>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">ชื่อ-นามสกุล</label>
                        <input 
                          type="text" 
                          className={`w-full text-sm rounded-md border border-gray-300 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${userAccounts[1].email && isExistingUser(userAccounts[1].email) && !isEditMode ? 'bg-gray-100' : ''}`}
                          placeholder="กรอก ชื่อ - นามสกุล"
                          value={userAccounts[1].name}
                          onChange={(e) => handleUserInputChange(1, 'name', e.target.value)}
                          disabled={!!(userAccounts[1].email && isExistingUser(userAccounts[1].email) && !isEditMode)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">อีเมล</label>
                        <input
                          type="email"
                          className={`w-full text-sm rounded-md border border-gray-300 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${userAccounts[1].email && isExistingUser(userAccounts[1].email) && !isEditMode ? 'bg-gray-100' : ''}`}
                          placeholder="กรอก อีเมล"
                          value={userAccounts[1].email}
                          onChange={(e) => handleUserInputChange(1, 'email', e.target.value)}
                          disabled={!!(userAccounts[1].email && isExistingUser(userAccounts[1].email) && !isEditMode)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">ตำแหน่ง</label>
                        <CustomDropdown
                          value={userAccounts[1].position}
                          onChange={(value) => handleUserInputChange(1, 'position', value)}
                          options={positionOptions}
                          placeholder="เลือกตำแหน่ง"
                          disabled={!!(userAccounts[1].email && isExistingUser(userAccounts[1].email) && !isEditMode)}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* User 3 */}
                  <div className="flex-1 p-4 border border-gray-200 rounded-lg">
                    <div className="flex justify-center mb-4 relative">
                      <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      {/* Status indicator */}
                      {userAccounts[2].email && isExistingUser(userAccounts[2].email) && (
                        <div className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4">
                          {getExistingUserData(userAccounts[2].email)?.password_changed ? (
                            <Tooltip content="ผู้ใช้งานนี้ได้เปลี่ยนรหัสผ่านแล้ว">
                              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white cursor-help">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            </Tooltip>
                          ) : (
                            <Tooltip content="ผู้ใช้งานนี้ยังไม่ได้เปลี่ยนรหัสผ่าน">
                              <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold cursor-help">
                                !
                              </div>
                            </Tooltip>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">ชื่อ-นามสกุล</label>
                        <input 
                          type="text" 
                          className={`w-full text-sm rounded-md border border-gray-300 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${userAccounts[2].email && isExistingUser(userAccounts[2].email) && !isEditMode ? 'bg-gray-100' : ''}`}
                          placeholder="กรอก ชื่อ - นามสกุล"
                          value={userAccounts[2].name}
                          onChange={(e) => handleUserInputChange(2, 'name', e.target.value)}
                          disabled={!!(userAccounts[2].email && isExistingUser(userAccounts[2].email) && !isEditMode)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">อีเมล</label>
                        <input
                          type="email"
                          className={`w-full text-sm rounded-md border border-gray-300 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${userAccounts[2].email && isExistingUser(userAccounts[2].email) && !isEditMode ? 'bg-gray-100' : ''}`}
                          placeholder="กรอก อีเมล"
                          value={userAccounts[2].email}
                          onChange={(e) => handleUserInputChange(2, 'email', e.target.value)}
                          disabled={!!(userAccounts[2].email && isExistingUser(userAccounts[2].email) && !isEditMode)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">ตำแหน่ง</label>
                        <CustomDropdown
                          value={userAccounts[2].position}
                          onChange={(value) => handleUserInputChange(2, 'position', value)}
                          options={positionOptions}
                          placeholder="เลือกตำแหน่ง"
                          disabled={!!(userAccounts[2].email && isExistingUser(userAccounts[2].email) && !isEditMode)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex justify-end gap-2">
                  <button
                    className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200"
                    onClick={handleReset}
                  >
                    ยกเลิก
                  </button>
                  
                  {/* Dev mode toggle - only visible in development */}
                  {import.meta.env.DEV && (
                    <button
                      className={`px-3 py-1.5 text-sm rounded-md ${
                        devMode 
                          ? 'bg-purple-500 text-white hover:bg-purple-600' 
                          : 'bg-gray-300 text-gray-600 hover:bg-gray-400'
                      }`}
                      onClick={() => {
                        setDevMode(!devMode);
                        toast.info(
                          devMode ? "ปิดโหมดพัฒนา" : "เปิดโหมดพัฒนา", 
                          { description: devMode ? "ตรวจสอบอีเมลซ้ำตามปกติ" : "อนุญาตให้ใช้อีเมลซ้ำได้" }
                        );
                      }}
                    >
                      {devMode ? 'ปิดโหมดพัฒนา' : 'เปิดโหมดพัฒนา'}
                    </button>
                  )}
                  
                  {/* Edit button */}
                  <button
                    className={`px-3 py-1.5 text-sm rounded-md ${
                      loadedUsers.length > 0 
                        ? isEditMode 
                          ? 'bg-gray-500 text-white hover:bg-gray-600' 
                          : 'bg-yellow-500 text-white hover:bg-yellow-600' 
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    onClick={toggleEditMode}
                    disabled={loadedUsers.length === 0}
                  >
                    {isEditMode ? 'ยกเลิกการแก้ไข' : 'แก้ไข'}
                  </button>
                  
                  <button
                    className={`px-3 py-1.5 text-sm rounded-md ${hasChanges ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                    onClick={handleSaveClick}
                    disabled={!hasChanges}
                  >
                    บันทึก
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "social-media-import",
      label: "การนำเข้าข้อมูลสื่อสังคมออนไลน์",
      content: (() => {
        // Local state for iframe loading status
        const [iframeLoading, setIframeLoading] = useState(true);
        const [iframeError, setIframeError] = useState(false);
        const setupUrl = import.meta.env.SETUP_WEBSITE_NLP_ETL_URL || "http://localhost:3001/setup";
        
        // Function to handle iframe load event
        const handleIframeLoad = () => {
          setIframeLoading(false);
        };
        
        // Function to handle iframe error
        const handleIframeError = () => {
          setIframeLoading(false);
          setIframeError(true);
        };
        
        return (
          <div className="p-6">
            <h3 className="text-xl font-semibold mb-4">การนำเข้าข้อมูลสื่อสังคมออนไลน์</h3>
            <p className="text-gray-600 mb-4">จัดการการนำเข้าข้อมูลจากสื่อสังคมออนไลน์ต่างๆ และกำหนดค่าการเชื่อมต่อ API</p>
            
            {/* External content loaded in iframe */}
            <div className="mt-4 bg-white rounded-lg border border-gray-200 overflow-hidden" style={{ height: "70vh" }}>
              {iframeLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-80">
                  <div className="text-center">
                    <div className="w-16 h-16 border-4 border-t-blue-500 border-b-blue-500 border-l-transparent border-r-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="mt-4 text-lg text-gray-600">กำลังโหลด...</p>
                  </div>
                </div>
              )}
              
              {iframeError ? (
                <div className="flex items-center justify-center h-full bg-gray-50">
                  <div className="text-center max-w-md p-6">
                    <div className="text-red-500 text-5xl mb-4">⚠️</div>
                    <h2 className="text-xl font-semibold text-red-600 mb-2">ไม่สามารถโหลดเนื้อหาได้</h2>
                    <p className="text-gray-600 mb-4">ไม่สามารถเชื่อมต่อกับระบบตั้งค่าได้ กรุณาตรวจสอบว่าเซิร์ฟเวอร์กำลังทำงานที่ {setupUrl}</p>
                    <button 
                      onClick={() => window.location.reload()}
                      className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                    >
                      ลองใหม่
                    </button>
                  </div>
                </div>
              ) : (
                <iframe 
                  src={setupUrl} 
                  className="w-full h-full border-0"
                  title="ระบบตั้งค่าการนำเข้าข้อมูล"
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                  onLoad={handleIframeLoad}
                  onError={handleIframeError}
                />
              )}
            </div>
          </div>
        );
      })()
    },
    {
      id: "comment-response",
      label: "การตอบประเด็นความคิดเห็น",
      content: (
        <div className="p-6">
          <h3 className="text-xl font-semibold mb-4">การตอบประเด็นความคิดเห็น</h3>
          <p className="text-gray-600">จัดการรูปแบบและขั้นตอนการตอบประเด็นความคิดเห็นจากสื่อสังคมออนไลน์</p>
          
          {/* Placeholder for comment response content */}
          <div className="mt-6 bg-gray-50 p-6 rounded-lg border border-gray-200">
            <p className="text-gray-500 text-center">อยู่ระหว่างการพัฒนา</p>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-[#EBF5FF]">
      <SystemSettingHeader />
      
      {/* Increased spacing after header - reduced */}
      <div className="h-2"></div>
      
      {/* Title section with tabs - moved higher up */}
      <div className="bg-[#EBF5FF]">
        <div className="container mx-auto px-12 pt-0 pb-0">
          <div className="flex flex-col">
            {/* Added padding to move title down */}
            <h1 className="text-2xl font-semibold text-[#17254D] mb-1 pt-2">ตั้งค่าระบบ</h1>
            
            {/* Tabs Navigation - kept in same position */}
            <div className="flex justify-end -mt-1">
              <nav className="flex items-center border-b border-[#E2E8F0] whitespace-nowrap">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-1 text-base whitespace-nowrap transition-colors ${
                      activeTab === tab.id
                        ? "text-[#17254D] border-b-2 border-[#42A5F5] font-medium text-base -mb-[1px]"
                        : "text-[#6B7280] hover:text-[#17254D] text-base"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </div>
      
      {/* Content frame moved up to intersect with blue line */}
      <main className="container mx-auto px-12 pt-0 pb-20">
        <div className="-mt-1">
          <Card className="shadow-sm">
            {tabs.find(tab => tab.id === activeTab)?.content}
          </Card>
        </div>
      </main>
      
      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-4">ยืนยันการบันทึกข้อมูล</h3>
            <p className="text-gray-600 mb-4">
              คุณต้องการบันทึกข้อมูลผู้ใช้งานสำหรับ{" "}
              <span className="font-medium">
                {officeOptions.find(o => o.value === selectedOffice)?.label || "หน่วยงานที่เลือก"}
              </span>{" "}
              ใช่หรือไม่?
            </p>
            
            {/* Summary of changes */}
            <div className="mb-6 bg-gray-50 p-3 rounded-md border border-gray-200">
              <h4 className="text-sm font-medium mb-2">สรุปการเปลี่ยนแปลง</h4>
              
              {/* Deleted accounts */}
              {getChangesSummary().deletedAccounts.length > 0 && (
                <div className="mt-4">
                  <p className="font-medium text-red-600">
                    ลบผู้ใช้งานเดิม: {getChangesSummary().deletedAccounts.length} คน
                  </p>
                  <ul className="mt-1 text-sm text-red-500 space-y-1">
                    {getChangesSummary().deletedAccounts.map((user, index) => (
                      <li key={`deleted-${index}`} className="flex items-center">
                        <Trash2 className="w-4 h-4 mr-1 inline-block" />
                        {user.name} ({user.email})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {getChangesSummary().newUsers.length > 0 && (
                <div className="mb-2">
                  <p className="text-sm text-green-600">
                    เพิ่มผู้ใช้งานใหม่: {getChangesSummary().newUsers.length} คน
                  </p>
                  <ul className="text-xs text-gray-600 ml-4 mt-1">
                    {getChangesSummary().newUsers.map((user, index) => (
                      <li key={index}>• {user.name} ({user.email})</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {getChangesSummary().modifiedExistingUsers.length > 0 && (
                <div className="mb-2">
                  <p className="text-sm text-yellow-600">
                    แก้ไขผู้ใช้งานเดิม: {getChangesSummary().modifiedExistingUsers.length} คน
                    <span className="text-xs ml-1">(ระบบยังไม่รองรับการแก้ไข)</span>
                  </p>
                  <ul className="text-xs text-gray-600 ml-4 mt-1">
                    {getChangesSummary().modifiedExistingUsers.map((user, index) => (
                      <li key={index}>• {user.name} ({user.email})</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {getChangesSummary().newUsers.length === 0 && 
               getChangesSummary().modifiedExistingUsers.length === 0 && 
               getChangesSummary().deletedAccounts.length === 0 && (
                <p className="text-sm text-gray-600">ไม่มีการเปลี่ยนแปลงข้อมูล</p>
              )}
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 text-sm bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200"
                onClick={() => setShowConfirmation(false)}
              >
                ยกเลิก
              </button>
              <button
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
                onClick={handleSaveUsers}
              >
                ยืนยัน
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemSetting; 