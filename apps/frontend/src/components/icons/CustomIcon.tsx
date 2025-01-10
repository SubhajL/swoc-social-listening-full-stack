import React from 'react';

interface CustomIconProps {
  className?: string;
}

const CustomIcon: React.FC<CustomIconProps> = ({ className }) => {
  return (
    <img 
      src="/path-to-your-image.png" 
      alt="Custom Icon"
      className={className}
    />
  );
};

export default CustomIcon;