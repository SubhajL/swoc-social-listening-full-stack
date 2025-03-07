import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProcessedPost } from "@/types/processed-post";
import { Complaint, ComplaintWithOrganization } from "@/types/complaint";
import { ErrorBoundary } from "@/components/error-boundary/ErrorBoundary";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, MapPin, Image as ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useComplaintData } from "@/atoms/hooks";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { MOCK_PROCESSED_POSTS, USE_MOCK_DATA } from "@/utils/mockData";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ComplaintInfoCardProps {
  title?: string;
  className?: string;
  editable?: boolean;
  showMockData?: boolean;
}

// Define a union type for all possible complaint types
type ComplaintType = ProcessedPost | Complaint | ComplaintWithOrganization | null;

const isProcessedPost = (data: unknown): data is ProcessedPost => {
  return data !== null && typeof data === 'object' && 
    ('processed_post_id' in data || 'text' in data || 'category_name' in data || 'profile_name' in data);
};

const isComplaint = (data: unknown): data is Complaint => {
  return data !== null && typeof data === 'object' && 
    'id' in data && 'status' in data && !('organizationId' in data);
};

const isComplaintWithOrganization = (data: unknown): data is ComplaintWithOrganization => {
  return data !== null && typeof data === 'object' && 
    'id' in data && 'organizationId' in data && 'organizationName' in data;
};

const getIssue = (complaint: ComplaintType): string => {
  if (!complaint) return '';
  
  if (isProcessedPost(complaint)) {
    return complaint.text || '';
  }
  
  if (isComplaint(complaint) || isComplaintWithOrganization(complaint)) {
    return complaint.content || '';
  }
  
  return '';
};

export const ComplaintInfoCard = ({ 
  title: propTitle = "ข้อร้องเรียน", 
  className = "",
  editable = false,
  showMockData = USE_MOCK_DATA
}: ComplaintInfoCardProps) => {
  // Add state to track if mock posts section is expanded
  const [showMockPostsSection, setShowMockPostsSection] = useState(false);
  
  // Get data from Jotai
  const { 
    title: storeTitle, 
    description,
    location,
    coordinates,
    processedPosts,
    selectedPostIds,
    updateTitle,
    updateDescription,
    updateLocation,
    updateCoordinates,
    togglePostSelection
  } = useComplaintData();
  
  // Use the selected post from Jotai
  const selectedPost = selectedPostIds.length > 0 && processedPosts.length > 0
    ? processedPosts.find(post => selectedPostIds.includes(post.processed_post_id.toString()))
    : null;
  
  // Use Jotai data exclusively
  const complaintData: ComplaintType = selectedPost || null;
  
  console.log('ComplaintInfoCard data:', { 
    selectedPost, 
    storeTitle, 
    description, 
    location, 
    coordinates
  });

  const handleInputChange = useCallback((field: string, value: string) => {
    if (!editable) return;
    
    switch (field) {
      case 'issue':
        updateTitle(value);
        break;
      case 'description':
        updateDescription(value);
        break;
      case 'location':
        updateLocation(value);
        break;
      default:
        break;
    }
  }, [editable, updateTitle, updateDescription, updateLocation]);

  // If no data is available
  if (!complaintData && !storeTitle && !description && (!selectedPost || selectedPostIds.length === 0)) {
    return (
      <div className={`bg-white rounded-xl border border-[#E2E8F0] p-6 ${className}`}>
        <div className="flex justify-start items-center mb-4">
          <h2 className="text-xl font-semibold text-[#17254D]">{propTitle}</h2>
        </div>
        
        {/* TEMPORARY: Show mock posts section when PostgreSQL is unavailable */}
        {showMockData && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-yellow-800">ข้อมูลจำลอง (Mock Data)</h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowMockPostsSection(!showMockPostsSection)}
                className="text-yellow-700 border-yellow-300 hover:bg-yellow-100"
              >
                {showMockPostsSection ? "ซ่อน" : "แสดง"}
              </Button>
            </div>
            
            {showMockPostsSection && (
              <div className="space-y-4">
                <p className="text-sm text-yellow-700 mb-2">เลือกข้อความจากข้อมูลจำลองเพื่อใช้ในการสร้างข้อร้องเรียน:</p>
                
                {MOCK_PROCESSED_POSTS.map((post) => (
                  <div 
                    key={post.processed_post_id} 
                    className={`border ${selectedPostIds.includes(String(post.processed_post_id)) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'} rounded-lg p-3 cursor-pointer hover:bg-gray-50 transition-colors`}
                    onClick={() => togglePostSelection(String(post.processed_post_id))}
                  >
                    <div className="flex justify-between">
                      <span className="font-medium">{post.profile_name}</span>
                      <span className="text-xs text-gray-500">{new Date(post.post_date).toLocaleDateString('th-TH')}</span>
                    </div>
                    <p className="mt-2 text-sm">{post.text}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{post.category_name}</span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">{post.amphure[0]}, {post.province[0]}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        <div className="p-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              ไม่พบข้อมูลข้อร้องเรียน
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const getCategoryDisplay = (): string => {
    if (!complaintData) return '';
    
    if (isProcessedPost(complaintData)) {
      return complaintData.category_name || '';
    }
    
    return '';
  };

  const getSubcategoryDisplay = (): string => {
    if (!complaintData) return '';
    
    if (isProcessedPost(complaintData)) {
      return complaintData.sub1_category_name || '';
    }
    
    return '';
  };

  const getReporter = (): string => {
    if (!complaintData) return '';
    
    if (isProcessedPost(complaintData)) {
      return complaintData.profile_name || '';
    }
    
    return '';
  };

  const getAmphure = (): string => {
    if (!complaintData) return '';
    
    if (isProcessedPost(complaintData)) {
      // Handle the case where amphure might be an array
      const amphureValue = complaintData.amphure;
      if (Array.isArray(amphureValue)) {
        return amphureValue.join(', ');
      }
      return amphureValue || '';
    }
    
    return '';
  };

  const getProvince = (): string => {
    if (!complaintData) return '';
    
    if (isProcessedPost(complaintData)) {
      // Handle the case where province might be a string or string[]
      const provinceValue = complaintData.province;
      if (Array.isArray(provinceValue)) {
        return provinceValue.join(', ');
      }
      return provinceValue || '';
    }
    
    return '';
  };

  const getLatitude = (): string => {
    if (!complaintData) return '';
    
    if (isProcessedPost(complaintData)) {
      return complaintData.latitude?.toString() || '';
    }
    
    return '';
  };

  const getLongitude = (): string => {
    if (!complaintData) return '';
    
    if (isProcessedPost(complaintData)) {
      return complaintData.longitude?.toString() || '';
    }
    
    return '';
  };

  const getDate = (): string => {
    if (!complaintData) return '';
    
    if (isProcessedPost(complaintData)) {
      return complaintData.post_date instanceof Date 
        ? complaintData.post_date.toISOString().split('T')[0] 
        : typeof complaintData.post_date === 'string' 
          ? new Date(complaintData.post_date).toISOString().split('T')[0]
          : '';
    }
    
    return '';
  };

  const getLink = (): string => {
    if (!complaintData) return '';
    
    if (isProcessedPost(complaintData)) {
      return complaintData.post_url || '';
    }
    
    return '';
  };

  // Common content box styles
  const contentBoxStyle = "w-full border border-[#E2E8F0] rounded-xl p-3 bg-white text-[#17254D] text-sm font-normal";
  const contentTextStyle = "pl-4"; // Reduced left padding to move content to the left
  const labelStyle = "text-[#64748B] font-medium text-base absolute -top-4 left-2 bg-white px-2 z-10"; // Moved left

  // State for image carousel
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const mockImages = [
    { id: 1, src: null, alt: "รูปภาพที่ 1" },
    { id: 2, src: null, alt: "รูปภาพที่ 2" },
    { id: 3, src: null, alt: "รูปภาพที่ 3" }
  ];

  const nextImage = () => {
    setCurrentImageIndex((prevIndex) => 
      prevIndex === mockImages.length - 1 ? 0 : prevIndex + 1
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prevIndex) => 
      prevIndex === 0 ? mockImages.length - 1 : prevIndex - 1
    );
  };

  return (
    <ErrorBoundary component="ComplaintInfoCard">
      <Card className={cn("w-full h-full", className)}>
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-[#17254D]">{propTitle}</CardTitle>
          <CardDescription>
            {getAmphure() && getProvince() 
              ? `${getAmphure()} ${getProvince()}` 
              : 'ไม่ระบุตำแหน่ง'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* TEMPORARY: Show mock posts section when PostgreSQL is unavailable */}
          {showMockData && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-yellow-800">ข้อมูลจำลอง (Mock Data)</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowMockPostsSection(!showMockPostsSection)}
                  className="text-yellow-700 border-yellow-300 hover:bg-yellow-100"
                >
                  {showMockPostsSection ? "ซ่อน" : "แสดง"}
                </Button>
              </div>
              
              {showMockPostsSection && (
                <div className="space-y-4">
                  <p className="text-sm text-yellow-700 mb-2">เลือกข้อความจากข้อมูลจำลองเพื่อใช้ในการสร้างข้อร้องเรียน:</p>
                  
                  {MOCK_PROCESSED_POSTS.map((post) => (
                    <div 
                      key={post.processed_post_id} 
                      className={`border ${selectedPostIds.includes(String(post.processed_post_id)) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'} rounded-lg p-3 cursor-pointer hover:bg-gray-50 transition-colors`}
                      onClick={() => togglePostSelection(String(post.processed_post_id))}
                    >
                      <div className="flex justify-between">
                        <span className="font-medium">{post.profile_name}</span>
                        <span className="text-xs text-gray-500">{new Date(post.post_date).toLocaleDateString('th-TH')}</span>
                      </div>
                      <p className="mt-2 text-sm">{post.text}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{post.category_name}</span>
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">{post.amphure[0]}, {post.province[0]}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Main content with two columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left column - Form fields */}
            <div className="space-y-6">
              {/* ประเด็นข้อร้องเรียน */}
              <div className="flex flex-col relative mt-6 mx-auto max-w-full w-full">
                <Label className={labelStyle}>
                  ประเด็นข้อร้องเรียน
                </Label>
                {editable ? (
                  <Input 
                    value={getIssue(complaintData)} 
                    placeholder="ยังไม่มีข้อมูล"
                    className="min-h-[80px]"
                    onChange={(e) => handleInputChange('issue', e.target.value)}
                  />
                ) : (
                  <div className={`${contentBoxStyle} min-h-[80px] whitespace-pre-wrap`}>
                    <div className={contentTextStyle}>
                      {getIssue(complaintData) || "ยังไม่มีข้อมูล"}
                    </div>
                  </div>
                )}
              </div>
              
              {/* ประเภทข้อความ */}
              <div className="flex flex-col relative mt-8 mx-auto max-w-full w-full">
                <Label className={labelStyle}>
                  ประเภทข้อความ
                </Label>
                {editable ? (
                  <Input 
                    value={getCategoryDisplay()} 
                    placeholder="ยังไม่มีข้อมูล"
                    onChange={(e) => handleInputChange('category', e.target.value)}
                  />
                ) : (
                  <div className={contentBoxStyle}>
                    <div className={contentTextStyle}>
                      {getCategoryDisplay() || "ยังไม่มีข้อมูล"}
                    </div>
                  </div>
                )}
              </div>
              
              {/* ประเภทข้อความย่อย */}
              <div className="flex flex-col relative mt-8 mx-auto max-w-full w-full">
                <Label className={labelStyle}>
                  ประเภทข้อความย่อย
                </Label>
                {editable ? (
                  <Input 
                    value={getSubcategoryDisplay()} 
                    placeholder="ยังไม่มีข้อมูล"
                    onChange={(e) => handleInputChange('subcategory', e.target.value)}
                  />
                ) : (
                  <div className={contentBoxStyle}>
                    <div className={contentTextStyle}>
                      {getSubcategoryDisplay() || "ยังไม่มีข้อมูล"}
                    </div>
                  </div>
                )}
              </div>
              
              {/* ข้อมูลผู้ร้องเรียน */}
              <div className="flex flex-col relative mt-8 mx-auto max-w-full w-full">
                <Label className={labelStyle}>
                  ข้อมูลผู้ร้องเรียน
                </Label>
                {editable ? (
                  <Input 
                    value={getReporter()} 
                    placeholder="ยังไม่มีข้อมูล"
                    onChange={(e) => handleInputChange('reporter', e.target.value)}
                  />
                ) : (
                  <div className={contentBoxStyle}>
                    <div className={contentTextStyle}>
                      {getReporter() || "ยังไม่มีข้อมูล"}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Location information */}
              <div className="flex flex-col relative mt-8 mx-auto max-w-full w-full">
                <Label className={labelStyle}>
                  อำเภอ
                </Label>
                {editable ? (
                  <Input 
                    value={getAmphure()} 
                    placeholder="ยังไม่มีข้อมูล"
                    onChange={(e) => handleInputChange('amphure', e.target.value)}
                  />
                ) : (
                  <div className={contentBoxStyle}>
                    <div className={contentTextStyle}>
                      {getAmphure() || "ยังไม่มีข้อมูล"}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col relative mt-8 mx-auto max-w-full w-full">
                <Label className={labelStyle}>
                  จังหวัด
                </Label>
                {editable ? (
                  <Input 
                    value={getProvince()} 
                    placeholder="ยังไม่มีข้อมูล"
                    onChange={(e) => handleInputChange('province', e.target.value)}
                  />
                ) : (
                  <div className={contentBoxStyle}>
                    <div className={contentTextStyle}>
                      {getProvince() || "ยังไม่มีข้อมูล"}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Coordinates */}
              <div className="flex flex-col relative mt-8 mx-auto max-w-full w-full">
                <Label className={labelStyle}>
                  ละติจูด
                </Label>
                {editable ? (
                  <Input 
                    value={getLatitude()} 
                    placeholder="ยังไม่มีข้อมูล"
                    onChange={(e) => handleInputChange('latitude', e.target.value)}
                  />
                ) : (
                  <div className={contentBoxStyle}>
                    <div className={contentTextStyle}>
                      {getLatitude() || "ยังไม่มีข้อมูล"}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col relative mt-8 mx-auto max-w-full w-full">
                <Label className={labelStyle}>
                  ลองจิจูด
                </Label>
                {editable ? (
                  <Input 
                    value={getLongitude()} 
                    placeholder="ยังไม่มีข้อมูล"
                    onChange={(e) => handleInputChange('longitude', e.target.value)}
                  />
                ) : (
                  <div className={contentBoxStyle}>
                    <div className={contentTextStyle}>
                      {getLongitude() || "ยังไม่มีข้อมูล"}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Date and Link */}
              <div className="flex flex-col relative mt-8 mx-auto max-w-full w-full">
                <Label className={labelStyle}>
                  วันที่
                </Label>
                {editable ? (
                  <Input 
                    type="date" 
                    value={getDate()} 
                    placeholder="ยังไม่มีข้อมูล"
                    onChange={(e) => handleInputChange('date', e.target.value)}
                  />
                ) : (
                  <div className={contentBoxStyle}>
                    <div className={contentTextStyle}>
                      {getDate() || "ยังไม่มีข้อมูล"}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col relative mt-8 mx-auto max-w-full w-full">
                <Label className={labelStyle}>
                  Link
                </Label>
                {editable ? (
                  <Input 
                    value={getLink()} 
                    placeholder="ยังไม่มีข้อมูล"
                    onChange={(e) => handleInputChange('link', e.target.value)}
                  />
                ) : (
                  <div className={contentBoxStyle}>
                    <div className={contentTextStyle}>
                      {getLink() || "ยังไม่มีข้อมูล"}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Right column - Map and Images */}
            <div className="space-y-6 mt-6">
              {/* Images Card - Now with carousel */}
              <Card className="border border-[#E2E8F0] overflow-hidden h-[250px]">
                <CardHeader className="p-4">
                  <CardTitle className="text-base font-medium flex items-center">
                    <ImageIcon className="h-4 w-4 mr-2" />
                    รูปภาพประกอบ
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 h-[170px] bg-gray-100 relative">
                  <div className="w-full h-full flex items-center justify-center">
                    {/* Image carousel */}
                    <div className="relative w-full h-full flex items-center justify-center">
                      <div className="text-center text-gray-500">
                        <ImageIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <p>{mockImages[currentImageIndex].alt}</p>
                        <p className="text-xs text-gray-400 mt-1">รูปภาพจะแสดงที่นี่เมื่อมีการอัพโหลด</p>
                      </div>
                      
                      {/* Navigation buttons */}
                      <button 
                        onClick={prevImage}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-1 hover:bg-white"
                        aria-label="Previous image"
                      >
                        <ChevronLeft className="h-5 w-5 text-gray-700" />
                      </button>
                      <button 
                        onClick={nextImage}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-1 hover:bg-white"
                        aria-label="Next image"
                      >
                        <ChevronRight className="h-5 w-5 text-gray-700" />
                      </button>
                      
                      {/* Image index indicator */}
                      <div className="absolute bottom-2 left-0 right-0 flex justify-center">
                        <div className="bg-black/50 rounded-full px-2 py-1">
                          <p className="text-xs text-white">
                            {currentImageIndex + 1} / {mockImages.length}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Map Card - Moved down */}
              <Card className="border border-[#E2E8F0] overflow-hidden h-[250px]">
                <CardHeader className="p-4">
                  <CardTitle className="text-base font-medium flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    ตำแหน่งที่ตั้ง
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 h-[170px] bg-gray-100 flex items-center justify-center">
                  {getLatitude() && getLongitude() ? (
                    <div className="w-full h-full bg-[#F1F5F9] flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-sm text-gray-500">พิกัด: {getLatitude()}, {getLongitude()}</p>
                        <p className="text-xs text-gray-400 mt-1">คลิกเพื่อดูแผนที่เต็ม</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500">
                      <MapPin className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      <p>ไม่มีข้อมูลตำแหน่ง</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </ErrorBoundary>
  );
};

export default ComplaintInfoCard; 