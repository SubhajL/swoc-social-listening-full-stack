import React from 'react';
import { ProcessedPost, ComplaintWithOrganization } from '../types';
import { Card } from './ui/card';
import { MessageSquare, MapPin, Calendar } from 'lucide-react';

interface SocialPostInfoProps {
  complaint: ProcessedPost | ComplaintWithOrganization | null;
}

// Type guards
const isProcessedPost = (data: any): data is ProcessedPost => {
  return 'processed_post_id' in data;
};

const isComplaintWithOrganization = (data: any): data is ComplaintWithOrganization => {
  return 'organizationId' in data && 'organizationName' in data;
};

export const SocialPostInfo = ({ complaint }: SocialPostInfoProps) => {
  if (!complaint) return null;

  const getContent = () => {
    if (isProcessedPost(complaint)) {
      return complaint.text || '';
    }
    return complaint.content || '';
  };

  const getLocation = () => {
    if (isProcessedPost(complaint)) {
      const province = Array.isArray(complaint.province) 
        ? complaint.province[0] 
        : complaint.province || '';
      const amphure = Array.isArray(complaint.amphure)
        ? complaint.amphure[0]
        : '';
      return `${amphure} ${province}`.trim();
    }
    return complaint.location?.province || '';
  };

  const getDate = () => {
    if (isProcessedPost(complaint)) {
      return new Date(complaint.post_date).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    return complaint.createdAt 
      ? new Date(complaint.createdAt).toLocaleDateString('th-TH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : 'ไม่ระบุวันที่';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="w-6 h-6 text-blue-600" />
        <h3 className="text-lg font-medium">ข้อความร้องเรียน</h3>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-gray-700">{getContent()}</p>
      </div>

      <div className="flex flex-wrap gap-6 mt-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-gray-500" />
          <span className="text-gray-600">{getLocation()}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-500" />
          <span className="text-gray-600">{getDate()}</span>
        </div>
      </div>
    </div>
  );
}; 