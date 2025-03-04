import { http, HttpResponse, delay } from 'msw';
import { TEST_USERS, updateTestUserPassword } from './test-users';

// Define interfaces for request bodies
interface LoginRequest {
  email: string;
  password: string;
}

interface ChangePasswordRequest {
  userId: number;
  newPassword: string;
}

// Mock authentication handlers
export const authHandlers = [
  // Login endpoint
  http.post('/api/auth/login', async ({ request }) => {
    // Simulate network delay
    await delay(500);
    
    const { email, password } = await request.json() as LoginRequest;
    
    // Find user
    const user = TEST_USERS.find(u => u.email === email);
    
    if (!user || user.password !== password) {
      return HttpResponse.json(
        { 
          success: false, 
          message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' 
        },
        { status: 401 }
      );
    }
    
    // Create response with user data (excluding password)
    const { password: _, ...userWithoutPassword } = user;
    
    return HttpResponse.json({
      success: true,
      token: 'mock-jwt-token-' + Date.now(),
      user: userWithoutPassword
    });
  }),
  
  // Change password endpoint
  http.post('/api/auth/change-password', async ({ request }) => {
    // Simulate network delay
    await delay(500);
    
    // Get authorization header
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { 
          success: false, 
          message: 'ไม่พบข้อมูลการยืนยันตัวตน' 
        },
        { status: 401 }
      );
    }
    
    const { userId, newPassword } = await request.json() as ChangePasswordRequest;
    
    // Update user password using the shared function
    const success = updateTestUserPassword(userId, newPassword);
    
    if (!success) {
      return HttpResponse.json(
        { 
          success: false, 
          message: 'ไม่พบข้อมูลผู้ใช้' 
        },
        { status: 404 }
      );
    }
    
    return HttpResponse.json({
      success: true,
      message: 'เปลี่ยนรหัสผ่านสำเร็จ'
    });
  })
]; 