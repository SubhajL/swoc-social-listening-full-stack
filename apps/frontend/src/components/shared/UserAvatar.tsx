import { useAuthStore } from '@/stores/authStore';
import { generateNameAcronym } from '@/utils/name-utils';

interface UserAvatarProps {
  className?: string;
}

export const UserAvatar = ({ className = '' }: UserAvatarProps) => {
  const { user } = useAuthStore();
  const acronym = generateNameAcronym(user?.name);
  
  return (
    <div className={`w-10 h-10 rounded-full bg-[#E2E8F0] border border-gray-300 flex items-center justify-center text-base font-medium text-[#17254D] ${className}`}>
      {acronym}
    </div>
  );
}; 