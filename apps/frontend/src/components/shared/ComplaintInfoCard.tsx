import React from 'react';
import { useState, useCallback, FC } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, MapPin, Image as ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useComplaintData } from "@/atoms/hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ProcessedPost, Complaint, ComplaintWithOrganization } from '@/types/complaint';
import { useAtomValue } from 'jotai';
import { processedPostsAtom } from '@/atoms/complaintData';
import { ErrorBoundary } from "@/components/error-boundary";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ComplaintInfoCardProps {
  title?: string;
  className?: string;
  editable?: boolean;
}

// Define a union type for all possible complaint types
type ComplaintType = ProcessedPost | LegacyProcessedPost | Complaint | ComplaintWithOrganization | null;

// Define a type for the legacy ProcessedPost from mockData
interface LegacyProcessedPost {
  processed_post_id: number;
  text: string;
  category_name: string;
  sub1_category_name: string;
  profile_name: string;
  post_date: Date | string;
  post_url: string;
  latitude: number;
  longitude: number;
  tumbon: string[];
  amphure: string[];
  province: string[];
  created_at: string;
  status?: string;
  coordinate_source: string;
}

// Update the type guard to handle both types of ProcessedPost
const isProcessedPost = (data: unknown): data is (ProcessedPost | LegacyProcessedPost) => {
  if (!data || typeof data !== 'object') return false;
  
  // Check for new ProcessedPost type
  if ('id' in data && 'platform' in data && 'postDate' in data) {
    return true;
  }
  
  // Check for legacy ProcessedPost type
  if ('processed_post_id' in data || 'text' in data || 'category_name' in data || 'profile_name' in data) {
    return true;
  }
  
  return false;
};

const isLegacyProcessedPost = (data: unknown): data is LegacyProcessedPost => {
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
  
  if (isLegacyProcessedPost(complaint)) {
    return complaint.text || '';
  }
  
  if (isProcessedPost(complaint) && !isLegacyProcessedPost(complaint)) {
    return complaint.content || '';
  }
  
  if (isComplaint(complaint) || isComplaintWithOrganization(complaint)) {
    return complaint.content || '';
  }
  
  return '';
};

export const ComplaintInfoCard: FC<ComplaintInfoCardProps> = ({
  title = "ข้อร้องเรียน",
  className = "",
  editable = false,
}) => {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const processedPosts = useAtomValue(processedPostsAtom) as (ProcessedPost | LegacyProcessedPost)[];
  
  // Add state to track if mock posts section is expanded
  const [showMockPostsSection, setShowMockPostsSection] = useState(false);
  
  // State for image carousel - MOVED UP to ensure hooks are always called in the same order
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const mockImages = [
    { id: 1, src: null, alt: "รูปภาพที่ 1" },
    { id: 2, src: null, alt: "รูปภาพที่ 2" },
    { id: 3, src: null, alt: "รูปภาพที่ 3" }
  ];
  
  // Get data from Jotai
  const { 
    title: storeTitle, 
    description,
    location,
    coordinates,
    selectedPostIds,
    updateTitle,
    updateDescription,
    updateLocation,
    updateCoordinates,
    togglePostSelection
  } = useComplaintData();
  
  // Use the selected post from Jotai
  const selectedPost = selectedPostIds.length > 0 && processedPosts.length > 0
    ? processedPosts.find(post => {
        if ('processed_post_id' in post) {
          return selectedPostIds.includes(String(post.processed_post_id));
        } else {
          return selectedPostIds.includes(post.id);
        }
      })
    : null;
  
  // Use Jotai data exclusively - fallback to form data if no post is selected
  const complaintData: ComplaintType = selectedPost || {
    processed_post_id: 0,
    text: description || 'ไม่มีข้อมูล', // Required for LegacyProcessedPost
    category_name: 'ข้อร้องเรียนทั่วไป',
    sub1_category_name: 'ปัญหาน้ำท่วม',
    profile_name: 'ผู้ใช้งานทั่วไป',
    post_date: new Date().toISOString(),
    post_url: '#',
    latitude: coordinates.lat || 18.7883,
    longitude: coordinates.lng || 98.9853,
    tumbon: [],
    amphure: location.split(',').map(part => part.trim()).filter(Boolean),
    province: ['เชียงใหม่'],
    created_at: new Date().toISOString(),
    status: 'new',
    coordinate_source: 'manual'
  } as LegacyProcessedPost;
  
  console.log('ComplaintInfoCard data:', { 
    selectedPost, 
    storeTitle, 
    description, 
    location, 
    coordinates,
    selectedPostIds,
    processedPosts: processedPosts.length,
    complaintData
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
          <h2 className="text-xl font-semibold text-[#17254D]">{title}</h2>
        </div>
        
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
    
    if (isLegacyProcessedPost(complaintData)) {
      return complaintData.category_name || '';
    }
    
    if (isProcessedPost(complaintData) && !isLegacyProcessedPost(complaintData)) {
      return complaintData.type || '';
    }
    
    return '';
  };

  const getSubcategoryDisplay = (): string => {
    if (!complaintData) return '';
    
    if (isLegacyProcessedPost(complaintData)) {
      return complaintData.sub1_category_name || '';
    }
    
    return '';
  };

  const getReporter = (): string => {
    if (!complaintData) return '';
    
    if (isLegacyProcessedPost(complaintData)) {
      return complaintData.profile_name || '';
    }
    
    if (isProcessedPost(complaintData) && !isLegacyProcessedPost(complaintData)) {
      return typeof complaintData.author === 'string' ? complaintData.author : '';
    }
    
    return '';
  };

  const getAmphure = (): string => {
    if (!complaintData) return '';
    
    if (isLegacyProcessedPost(complaintData)) {
      // Handle the case where amphure might be an array
      const amphureValue = complaintData.amphure;
      if (Array.isArray(amphureValue)) {
        // Return only the first element (the actual amphure name)
        return amphureValue[0] || '';
      }
      return amphureValue || '';
    }
    
    return '';
  };

  const getProvince = (): string => {
    if (!complaintData) return '';
    
    if (isLegacyProcessedPost(complaintData)) {
      // Handle the case where province might be a string or string[]
      const provinceValue = complaintData.province;
      if (Array.isArray(provinceValue)) {
        return provinceValue.join(', ');
      }
      return provinceValue || '';
    }
    
    if (isProcessedPost(complaintData) && !isLegacyProcessedPost(complaintData)) {
      if (typeof complaintData.province === 'string') {
        return complaintData.province;
      }
      return '';
    }
    
    return '';
  };

  const getLatitude = (): string => {
    if (!complaintData) return '';
    
    if (isLegacyProcessedPost(complaintData)) {
      return complaintData.latitude?.toString() || '';
    }
    
    return '';
  };

  const getLongitude = (): string => {
    if (!complaintData) return '';
    
    if (isLegacyProcessedPost(complaintData)) {
      return complaintData.longitude?.toString() || '';
    }
    
    return '';
  };

  const getDate = (): string => {
    if (!complaintData) return '';
    
    if (isLegacyProcessedPost(complaintData)) {
      return complaintData.post_date instanceof Date 
        ? complaintData.post_date.toISOString().split('T')[0] 
        : typeof complaintData.post_date === 'string' 
          ? new Date(complaintData.post_date).toISOString().split('T')[0]
          : '';
    }
    
    if (isProcessedPost(complaintData) && !isLegacyProcessedPost(complaintData)) {
      return new Date(complaintData.postDate).toISOString().split('T')[0];
    }
    
    return '';
  };

  const getLink = (): string => {
    if (!complaintData) return '';
    
    if (isLegacyProcessedPost(complaintData)) {
      return complaintData.post_url || '';
    }
    
    if (isProcessedPost(complaintData) && !isLegacyProcessedPost(complaintData)) {
      return complaintData.link || '';
    }
    
    return '';
  };

  // Common content box styles
  const contentBoxStyle = "w-full border border-[#E2E8F0] rounded-xl p-3 bg-white text-[#17254D] text-sm font-normal relative";
  const contentTextStyle = "pl-4"; // Reduced left padding to move content to the left
  const labelStyle = "text-[#64748B] font-medium text-base absolute -top-3.5 left-2 bg-card px-3 py-0.5 z-10"; // Moved higher and expanded padding

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

  // Update the renderSocialMediaPosts function to handle both types
  const renderSocialMediaPosts = () => {
    if (processedPosts.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <p>ไม่พบข้อมูลโพสต์ที่เกี่ยวข้อง</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        {processedPosts.map((post) => {
          // Check if it's a legacy post or new post format
          const isLegacy = 'processed_post_id' in post;
          
          if (isLegacy) {
            // Handle legacy post format
            const legacyPost = post as LegacyProcessedPost;
            const postId = String(legacyPost.processed_post_id);
            const postContent = legacyPost.text;
            const postDate = legacyPost.post_date;
            const postAuthor = legacyPost.profile_name;
            const postType = legacyPost.category_name;
            const postProvince = Array.isArray(legacyPost.province) 
              ? legacyPost.province.join(', ') 
              : legacyPost.province;
            const postLink = legacyPost.post_url;
            
            return (
              <Card key={postId} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={undefined} alt={postAuthor} />
                        <AvatarFallback>{postAuthor.substring(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold">{postAuthor}</p>
                            <p className="text-sm text-gray-500">
                              {postDate instanceof Date 
                                ? postDate.toLocaleDateString('th-TH')
                                : new Date(postDate).toLocaleDateString('th-TH')}
                            </p>
                          </div>
                          <Badge variant="default">Social</Badge>
                        </div>
                        <p className="mt-2">{postContent}</p>
                        {postLink && postLink.includes('image') && (
                          <div className="mt-3 rounded-md overflow-hidden">
                            <img src={postLink} alt="Post image" className="w-full h-auto" />
                          </div>
                        )}
                        <div className="flex gap-2 mt-3">
                          <Badge variant="outline" className="text-xs">
                            {postType}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {postProvince}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          } else {
            // Handle new post format
            const newPost = post as ProcessedPost;
            const postId = newPost.id;
            const postContent = newPost.content;
            const postDate = newPost.postDate;
            const postAuthor = newPost.author;
            const postType = newPost.type || 'Unknown';
            const postProvince = newPost.province || 'Unknown';
            const postLink = newPost.link;
            const postPlatform = newPost.platform;
            
            return (
              <Card key={postId} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={undefined} alt={typeof postAuthor === 'string' ? postAuthor : 'User'} />
                        <AvatarFallback>
                          {typeof postAuthor === 'string' ? postAuthor.substring(0, 2) : 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold">{typeof postAuthor === 'string' ? postAuthor : 'User'}</p>
                            <p className="text-sm text-gray-500">
                              {new Date(postDate).toLocaleDateString('th-TH')}
                            </p>
                          </div>
                          <Badge variant={postPlatform === 'facebook' ? 'default' : 'secondary'}>
                            {postPlatform === 'facebook' ? 'Facebook' : 'Twitter'}
                          </Badge>
                        </div>
                        <p className="mt-2">{postContent}</p>
                        {postLink && postLink.includes('image') && (
                          <div className="mt-3 rounded-md overflow-hidden">
                            <img src={postLink} alt="Post image" className="w-full h-auto" />
                          </div>
                        )}
                        <div className="flex gap-2 mt-3">
                          <Badge variant="outline" className="text-xs">
                            {postType}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {postProvince}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          }
        })}
      </div>
    );
  };

  return (
    <ErrorBoundary component="ComplaintInfoCard">
      <Card className={cn("w-full bg-white", className)}>
        <CardHeader className="bg-transparent border-b border-gray-100">
          <CardTitle className="text-xl font-semibold text-[#17254D]">{title}</CardTitle>
          <CardDescription>
            {getAmphure() && getProvince() 
              ? `${getAmphure()} ${getProvince()}` 
              : 'ไม่ระบุตำแหน่ง'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* TEMPORARY: Show mock posts section when PostgreSQL is unavailable */}
          {showMockPostsSection && (
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
              
              {renderSocialMediaPosts()}
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
              <Card className="border border-[#E2E8F0] overflow-hidden h-[250px] bg-white">
                <CardHeader className="p-4 bg-transparent">
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
              <Card className="border border-[#E2E8F0] overflow-hidden h-[250px] bg-white">
                <CardHeader className="p-4 bg-transparent">
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