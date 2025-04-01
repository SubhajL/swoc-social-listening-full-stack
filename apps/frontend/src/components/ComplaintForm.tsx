import React, { useEffect } from 'react';

const validateLocationData = (data: any) => {
  if (!data) {
    console.log('[ComplaintForm] No location data provided');
    return false;
  }

  // Check if we have either complaint data with location or direct location data
  const hasComplaintLocation = data.complaint?.amphure && data.complaint?.province;
  const hasDirectLocation = data.amphure && data.province;

  if (!hasComplaintLocation && !hasDirectLocation) {
    console.log('[ComplaintForm] No valid location data found', {
      hasComplaintLocation,
      hasDirectLocation,
      data
    });
    return false;
  }

  return true;
};

const ComplaintForm: React.FC = () => {
  const locationData = React.useState(null);

  useEffect(() => {
    if (!locationData) {
      console.log('[ComplaintForm] No location data available yet');
      return;
    }

    if (!validateLocationData(locationData)) {
      console.log('[ComplaintForm] Location data validation failed');
      return;
    }

    // Process valid location data
    const location = {
      amphure: locationData.complaint?.amphure || locationData.amphure,
      province: locationData.complaint?.province || locationData.province
    };

    console.log('[ComplaintForm] Location data validated:', location);
    // ... rest of the effect
  }, [locationData]);

  return (
    // ... existing code ...
  );
};

export default ComplaintForm; 