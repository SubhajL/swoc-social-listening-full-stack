import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import LoginSvg from '@/assets/icon/Login.svg';

interface LocationState {
  firstLogin?: boolean;
}

const ChangePassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  const isFirstLogin = state?.firstLogin || false;

  // Check if user is logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  const toggleVisibility = () => setIsVisible(!isVisible);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate passwords
    if (!newPassword || !confirmPassword) {
      toast.error('กรุณากรอกรหัสผ่านใหม่และยืนยันรหัสผ่าน');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('รหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง');
      return;
    }
    
    if (newPassword.length < 8) {
      toast.error('รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const userData = localStorage.getItem('user');
      
      if (!userData) {
        toast.error('ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่');
        navigate('/login');
        return;
      }
      
      const user = JSON.parse(userData);
      
      // API call to change password using our API client
      // Convert user.id to number if it's a string
      const userId = typeof user.id === 'string' ? parseInt(user.id, 10) : user.id;
      
      // Validate userId
      if (!userId || isNaN(userId)) {
        console.error('Invalid user ID:', { userId, rawId: user.id });
        toast.error('ข้อมูลผู้ใช้ไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่');
        navigate('/login');
        return;
      }
      
      console.log('Attempting to change password for user:', { userId, email: user.email });
      
      const response = await apiClient.changePassword(userId, newPassword);
      
      console.log('Password change response:', response);
      
      // Validate response format
      if (!response || typeof response !== 'object') {
        console.error('Invalid response format:', response);
        toast.error('เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน กรุณาลองใหม่อีกครั้ง');
        return;
      }
      
      if (response.success) {
        // Update user in localStorage
        const updatedUser = { ...user, password_changed: true };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        toast.success('เปลี่ยนรหัสผ่านสำเร็จ');
        
        // Redirect to dashboard (main page with filtering panel and map)
        navigate('/dashboard');
      } else {
        console.error('Password change failed:', response);
        toast.error(response.message || 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
      }
    } catch (error: any) {
      console.error('Change password error:', error);
      
      // More detailed error logging
      if (error.response) {
        console.error('Error response:', {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers
        });
      } else if (error.request) {
        console.error('Error request:', error.request);
      } else {
        console.error('Error message:', error.message);
      }
      
      toast.error(error.response?.data?.message || 'เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Left side - Password change form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader className="flex flex-col items-start gap-2">
            <h1 className="text-2xl font-bold text-blue-900">
              {isFirstLogin ? 'เปลี่ยนรหัสผ่านครั้งแรก' : 'เปลี่ยนรหัสผ่าน'}
            </h1>
            <p className="text-gray-600">
              {isFirstLogin 
                ? 'กรุณาเปลี่ยนรหัสผ่านของคุณเพื่อความปลอดภัย' 
                : 'กรุณากรอกรหัสผ่านใหม่ของคุณ'}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  รหัสผ่านใหม่
                </label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    value={newPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                    placeholder="กรอกรหัสผ่านใหม่"
                    type={isVisible ? "text" : "password"}
                    className="w-full pr-10"
                  />
                  <button
                    className="absolute inset-y-0 right-0 flex items-center pr-3 focus:outline-none"
                    type="button"
                    onClick={toggleVisibility}
                  >
                    {isVisible ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
              
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  ยืนยันรหัสผ่านใหม่
                </label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                    placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                    type={isVisible ? "text" : "password"}
                    className="w-full"
                  />
                </div>
              </div>
              
              <button
                type="submit"
                disabled={isLoading}
                className={`flex items-center justify-center gap-2 mt-4 ${
                  isLoading 
                    ? "bg-[#E2E8F0] text-[#94A3B8] cursor-not-allowed" 
                    : "bg-[#4B9FE1] hover:bg-[#3D8FD1] text-white"
                } px-6 py-3 rounded-xl transition-colors duration-200`}
              >
                {isLoading 
                  ? 'กำลังบันทึก...' 
                  : (isFirstLogin ? 'บันทึกรหัสผ่านและเข้าสู่ระบบ' : 'บันทึกรหัสผ่านใหม่')}
              </button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col items-center justify-center text-sm text-gray-600">
            <p>รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร</p>
          </CardFooter>
        </Card>
      </div>
      
      {/* Right side - Image */}
      <div className="hidden md:block md:w-1/2 bg-blue-100">
        <div className="h-full flex items-center justify-center p-8">
          <img 
            src={LoginSvg} 
            alt="Change Password" 
            className="max-h-full object-contain rounded-lg shadow-lg"
          />
        </div>
      </div>
    </div>
  );
};

export default ChangePassword; 