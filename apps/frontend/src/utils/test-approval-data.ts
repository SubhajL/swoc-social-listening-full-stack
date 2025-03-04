/**
 * ApprovalDashboard Test Data Generator
 * 
 * This utility creates test data for the ApprovalDashboard component.
 * It generates sample approval records with different statuses and RBAC roles.
 * 
 * Note: This is for development/testing only and should not be used in production.
 */

import axios from 'axios';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';

// Types for approval records
interface ApprovalRecordData {
  postId: string;
  complaintId: string;
  link: string;
  type: string;
  province: string;
  startDate: string | null;
  endDate: string | null;
  totalDays: string;
  status: string;
  responsible: string;
  position: number; // RBAC position (1, 2, or 3)
  organizationId: string;
  organizationName: string;
}

// Status options for approval records
const STATUS_OPTIONS = [
  'รอดำเนินการ',
  'อนุมัติแล้ว',
  'ไม่อนุมัติ',
  'ส่งต่อแล้ว'
];

// Type options for approval records
const TYPE_OPTIONS = [
  'ข้อร้องเรียน',
  'ข้อเสนอแนะ',
  'ข้อสอบถาม',
  'ข้อชื่นชม'
];

// Province options for approval records
const PROVINCE_OPTIONS = [
  'กรุงเทพมหานคร',
  'เชียงใหม่',
  'ขอนแก่น',
  'ชลบุรี',
  'นครราชสีมา',
  'สงขลา',
  'อุบลราชธานี',
  'นครสวรรค์',
  'ภูเก็ต',
  'อุดรธานี'
];

// Organization options for approval records
const ORGANIZATION_OPTIONS = [
  { id: 'org-1', name: 'สำนักงานชลประทานที่ 1' },
  { id: 'org-2', name: 'สำนักงานชลประทานที่ 2' },
  { id: 'org-3', name: 'สำนักงานชลประทานที่ 3' },
  { id: 'org-4', name: 'สำนักงานชลประทานที่ 4' },
  { id: 'org-5', name: 'สำนักงานชลประทานที่ 5' }
];

// Responsible person options for each position
const RESPONSIBLE_OPTIONS = {
  1: ['ผู้อำนวยการส่วน A', 'ผู้อำนวยการส่วน B', 'ผู้อำนวยการส่วน C'],
  2: ['ผู้อำนวยการสำนัก X', 'ผู้อำนวยการสำนัก Y', 'ผู้อำนวยการสำนัก Z'],
  3: ['รองอธิบดี 1', 'รองอธิบดี 2', 'รองอธิบดี 3']
};

/**
 * Generate a random date within a range
 */
const randomDate = (start: Date, end: Date): string => {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString();
};

/**
 * Generate a random approval record
 */
const generateRandomRecord = (position: number = 1): ApprovalRecordData => {
  // Generate random post ID
  const postId = `POST-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
  
  // Generate random complaint ID
  const complaintId = `COMP-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
  
  // Generate random link
  const link = `https://facebook.com/post/${Math.floor(Math.random() * 1000000)}`;
  
  // Select random type
  const type = TYPE_OPTIONS[Math.floor(Math.random() * TYPE_OPTIONS.length)];
  
  // Select random province
  const province = PROVINCE_OPTIONS[Math.floor(Math.random() * PROVINCE_OPTIONS.length)];
  
  // Generate random dates
  const now = new Date();
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(now.getMonth() - 1);
  
  // For position 1, always set startDate
  // For position 2 and 3, set startDate based on previous approval
  const startDate = position === 1 ? 
    randomDate(oneMonthAgo, now) : 
    (Math.random() > 0.5 ? randomDate(oneMonthAgo, now) : null);
  
  // Only set endDate if startDate exists and randomly
  const endDate = startDate && Math.random() > 0.7 ? 
    randomDate(new Date(startDate), now) : 
    null;
  
  // Calculate total days if both dates exist
  const totalDays = (startDate && endDate) ? 
    Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)).toString() : 
    '0';
  
  // Select random status based on dates
  // If endDate exists, it's more likely to be approved
  let status;
  if (endDate) {
    status = Math.random() > 0.2 ? 'อนุมัติแล้ว' : 'ไม่อนุมัติ';
  } else if (startDate) {
    status = Math.random() > 0.5 ? 'รอดำเนินการ' : 'ส่งต่อแล้ว';
  } else {
    status = 'รอดำเนินการ';
  }
  
  // Select random organization
  const organization = ORGANIZATION_OPTIONS[Math.floor(Math.random() * ORGANIZATION_OPTIONS.length)];
  
  // Select random responsible person based on position
  const responsible = RESPONSIBLE_OPTIONS[position as keyof typeof RESPONSIBLE_OPTIONS][
    Math.floor(Math.random() * RESPONSIBLE_OPTIONS[position as keyof typeof RESPONSIBLE_OPTIONS].length)
  ];
  
  return {
    postId,
    complaintId,
    link,
    type,
    province,
    startDate,
    endDate,
    totalDays,
    status,
    responsible,
    position,
    organizationId: organization.id,
    organizationName: organization.name
  };
};

/**
 * Generate a set of approval records for all positions
 */
const generateApprovalSet = (): ApprovalRecordData[] => {
  // Generate a random post ID to use for all records in the set
  const postId = `POST-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
  const complaintId = `COMP-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
  const link = `https://facebook.com/post/${Math.floor(Math.random() * 1000000)}`;
  const type = TYPE_OPTIONS[Math.floor(Math.random() * TYPE_OPTIONS.length)];
  const province = PROVINCE_OPTIONS[Math.floor(Math.random() * PROVINCE_OPTIONS.length)];
  
  // Select random organization
  const organization = ORGANIZATION_OPTIONS[Math.floor(Math.random() * ORGANIZATION_OPTIONS.length)];
  
  // Generate records for all three positions
  return [1, 2, 3].map(position => {
    // Generate random dates
    const now = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(now.getMonth() - 1);
    
    // For position 1, always set startDate
    // For position 2 and 3, set startDate based on previous approval
    const startDate = position === 1 ? 
      randomDate(oneMonthAgo, now) : 
      (Math.random() > 0.5 ? randomDate(oneMonthAgo, now) : null);
    
    // Only set endDate if startDate exists and randomly
    const endDate = startDate && Math.random() > 0.7 ? 
      randomDate(new Date(startDate), now) : 
      null;
    
    // Calculate total days if both dates exist
    const totalDays = (startDate && endDate) ? 
      Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)).toString() : 
      '0';
    
    // Select random status based on dates
    // If endDate exists, it's more likely to be approved
    let status;
    if (endDate) {
      status = Math.random() > 0.2 ? 'อนุมัติแล้ว' : 'ไม่อนุมัติ';
    } else if (startDate) {
      status = Math.random() > 0.5 ? 'รอดำเนินการ' : 'ส่งต่อแล้ว';
    } else {
      status = 'รอดำเนินการ';
    }
    
    // Select random responsible person based on position
    const responsible = RESPONSIBLE_OPTIONS[position as keyof typeof RESPONSIBLE_OPTIONS][
      Math.floor(Math.random() * RESPONSIBLE_OPTIONS[position as keyof typeof RESPONSIBLE_OPTIONS].length)
    ];
    
    return {
      postId,
      complaintId,
      link,
      type,
      province,
      startDate,
      endDate,
      totalDays,
      status,
      responsible,
      position,
      organizationId: organization.id,
      organizationName: organization.name
    };
  });
};

/**
 * Create test approval records in the database
 */
export const createTestApprovalRecords = async (
  count: number = 5,
  useApprovalSets: boolean = true
): Promise<boolean> => {
  console.group('🔍 [Test Data] Creating test approval records');
  
  try {
    // Check authentication
    if (!useAuthStore.getState().isAuthenticated) {
      console.error('❌ [Test Data] User is not authenticated');
      toast.error('Please log in to create test data');
      console.groupEnd();
      return false;
    }
    
    // Get the current token from auth store
    const token = useAuthStore.getState().token;
    
    // Generate records
    let records: ApprovalRecordData[] = [];
    
    if (useApprovalSets) {
      // Generate sets of records (one for each position with the same post ID)
      for (let i = 0; i < count; i++) {
        records = [...records, ...generateApprovalSet()];
      }
    } else {
      // Generate individual random records
      for (let i = 0; i < count; i++) {
        // Generate records for all three positions
        for (let position = 1; position <= 3; position++) {
          records.push(generateRandomRecord(position));
        }
      }
    }
    
    console.log(`🔍 [Test Data] Generated ${records.length} records`);
    
    // Send records to the API
    const response = await axios.post('/api/approval-records/batch', records, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ [Test Data] Records created successfully:', response.data);
    toast.success(`Created ${records.length} test approval records`);
    
    console.groupEnd();
    return true;
  } catch (error: any) {
    console.error('❌ [Test Data] Error creating test records:', error);
    
    // Add more detailed error logging
    if (error.response) {
      console.error('❌ [Test Data] Error response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers
      });
    } else if (error.request) {
      console.error('❌ [Test Data] No response received:', error.request);
    } else {
      console.error('❌ [Test Data] Error message:', error.message);
    }
    
    toast.error(`Failed to create test records: ${error.message}`);
    console.groupEnd();
    return false;
  }
};

/**
 * Delete all test approval records
 */
export const deleteAllTestApprovalRecords = async (): Promise<boolean> => {
  console.group('🔍 [Test Data] Deleting all test approval records');
  
  try {
    // Check authentication
    if (!useAuthStore.getState().isAuthenticated) {
      console.error('❌ [Test Data] User is not authenticated');
      toast.error('Please log in to delete test data');
      console.groupEnd();
      return false;
    }
    
    // Get the current token from auth store
    const token = useAuthStore.getState().token;
    
    // Send delete request to the API
    const response = await axios.delete('/api/approval-records/test-data', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ [Test Data] Records deleted successfully:', response.data);
    toast.success(`Deleted all test approval records`);
    
    console.groupEnd();
    return true;
  } catch (error: any) {
    console.error('❌ [Test Data] Error deleting test records:', error);
    
    // Add more detailed error logging
    if (error.response) {
      console.error('❌ [Test Data] Error response:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers
      });
    } else if (error.request) {
      console.error('❌ [Test Data] No response received:', error.request);
    } else {
      console.error('❌ [Test Data] Error message:', error.message);
    }
    
    toast.error(`Failed to delete test records: ${error.message}`);
    console.groupEnd();
    return false;
  }
};

// Export functions to window for console testing
(window as any).testApprovalData = {
  create: createTestApprovalRecords,
  delete: deleteAllTestApprovalRecords
}; 