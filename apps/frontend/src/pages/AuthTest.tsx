import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { checkAuthState, fixAuthIssues, clearAuthData } from '@/utils/auth-test';
import { testLogin, createMockToken } from '@/utils/test-login';
import { setTestJWT, setExpiredJWT } from '@/utils/create-test-jwt';
import { createTestApprovalRecords, deleteAllTestApprovalRecords } from '@/utils/test-approval-data';
import { unregisterAllServiceWorkers } from '@/utils/unregister-service-workers';
import { testApiHealth, testApprovalRecords } from '@/utils/api-connection-test';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const AuthTest = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [jwtExpiry, setJwtExpiry] = useState('60');
  const [jwtRole, setJwtRole] = useState('1');
  const [recordCount, setRecordCount] = useState('5');
  const navigate = useNavigate();
  const authStore = useAuthStore();
  
  const handleTestLogin = async () => {
    setLoading(true);
    try {
      await testLogin(email, password);
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleMockToken = () => {
    setLoading(true);
    try {
      createMockToken();
    } catch (error) {
      console.error('Mock token error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCreateJWT = () => {
    setLoading(true);
    try {
      setTestJWT(parseInt(jwtExpiry), { role: parseInt(jwtRole) });
      toast.success('JWT token created and stored');
    } catch (error) {
      console.error('JWT creation error:', error);
      toast.error('Failed to create JWT token');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCreateExpiredJWT = () => {
    setLoading(true);
    try {
      setExpiredJWT(10, { role: parseInt(jwtRole) });
      toast.success('Expired JWT token created and stored');
    } catch (error) {
      console.error('Expired JWT creation error:', error);
      toast.error('Failed to create expired JWT token');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCheckAuth = () => {
    checkAuthState();
    toast.info('Auth state checked. See console for details.');
  };
  
  const handleFixAuth = () => {
    fixAuthIssues();
    toast.info('Auth issues fixed. See console for details.');
  };
  
  const handleClearAuth = () => {
    clearAuthData();
    toast.info('Auth data cleared. See console for details.');
  };
  
  const handleNavigateToApprovalDashboard = () => {
    navigate('/approval-dashboard');
  };
  
  const handleNavigateToTestPlan = () => {
    // Open the test plan in a new tab
    window.open('/src/utils/test-plan.md', '_blank');
  };
  
  const handleCreateTestData = async () => {
    setLoading(true);
    try {
      await createTestApprovalRecords(parseInt(recordCount), true);
    } catch (error) {
      console.error('Test data creation error:', error);
      toast.error('Failed to create test data');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteTestData = async () => {
    setLoading(true);
    try {
      await deleteAllTestApprovalRecords();
    } catch (error) {
      console.error('Test data deletion error:', error);
      toast.error('Failed to delete test data');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCleanupServiceWorkers = async () => {
    setLoading(true);
    try {
      await unregisterAllServiceWorkers();
      toast.success('Service workers unregistered. Please refresh the page.');
    } catch (error) {
      console.error('Service worker cleanup error:', error);
      toast.error('Failed to unregister service workers');
    } finally {
      setLoading(false);
    }
  };
  
  const handleTestApiHealth = async () => {
    setLoading(true);
    try {
      await testApiHealth();
      toast.info('API health check complete. See console for details.');
    } catch (error) {
      console.error('API health check error:', error);
      toast.error('Failed to check API health');
    } finally {
      setLoading(false);
    }
  };
  
  const handleTestApprovalRecords = async () => {
    setLoading(true);
    try {
      await testApprovalRecords(parseInt(jwtRole));
      toast.info('Approval records test complete. See console for details.');
    } catch (error) {
      console.error('Approval records test error:', error);
      toast.error('Failed to test approval records');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto p-4 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Authentication Test</CardTitle>
          <CardDescription>Test authentication utilities</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Current Auth State</h3>
            <div className="bg-gray-100 p-3 rounded">
              <p><strong>Authenticated:</strong> {authStore.isAuthenticated ? 'Yes' : 'No'}</p>
              <p><strong>Has Token:</strong> {authStore.token ? 'Yes' : 'No'}</p>
              <p><strong>User:</strong> {authStore.user ? authStore.user.email : 'None'}</p>
              <p><strong>Role:</strong> {authStore.user ? authStore.user.rbacRole : 'None'}</p>
            </div>
          </div>
          
          <Tabs defaultValue="login">
            <TabsList className="grid grid-cols-4">
              <TabsTrigger value="login">Login Test</TabsTrigger>
              <TabsTrigger value="jwt">JWT Test</TabsTrigger>
              <TabsTrigger value="data">Test Data</TabsTrigger>
              <TabsTrigger value="debug">Debug</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Test Login</h3>
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Button 
                  onClick={handleTestLogin} 
                  disabled={loading || !email || !password}
                  className="w-full"
                >
                  {loading ? 'Loading...' : 'Test Login'}
                </Button>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Mock Token</h3>
                <Button 
                  onClick={handleMockToken} 
                  disabled={loading}
                  className="w-full"
                  variant="outline"
                >
                  Create Mock Token
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="jwt" className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">JWT Token Generator</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-sm">Expires In (minutes)</label>
                    <Input
                      type="number"
                      value={jwtExpiry}
                      onChange={(e) => setJwtExpiry(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm">RBAC Role (1-3)</label>
                    <Input
                      type="number"
                      min="1"
                      max="3"
                      value={jwtRole}
                      onChange={(e) => setJwtRole(e.target.value)}
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleCreateJWT} 
                  disabled={loading}
                  className="w-full"
                >
                  Create Valid JWT
                </Button>
                <Button 
                  onClick={handleCreateExpiredJWT} 
                  disabled={loading}
                  className="w-full"
                  variant="outline"
                >
                  Create Expired JWT
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="data" className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Test Data Generator</h3>
                <div>
                  <label className="text-sm">Number of Record Sets</label>
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    value={recordCount}
                    onChange={(e) => setRecordCount(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Each set creates 3 records (one for each RBAC role)
                  </p>
                </div>
                <Button 
                  onClick={handleCreateTestData} 
                  disabled={loading || !authStore.isAuthenticated}
                  className="w-full"
                >
                  Create Test Records
                </Button>
                <Button 
                  onClick={handleDeleteTestData} 
                  disabled={loading || !authStore.isAuthenticated}
                  className="w-full"
                  variant="outline"
                >
                  Delete All Test Records
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="debug" className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Service Worker Cleanup</h3>
                <Button 
                  onClick={handleCleanupServiceWorkers} 
                  disabled={loading}
                  className="w-full"
                  variant="destructive"
                >
                  Unregister Service Workers
                </Button>
                <p className="text-xs text-gray-500 mt-1">
                  Use this to fix MSW-related issues. Refresh page after using.
                </p>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-medium">API Connection Tests</h3>
                <Button 
                  onClick={handleTestApiHealth} 
                  disabled={loading}
                  className="w-full"
                >
                  Test API Health
                </Button>
                <Button 
                  onClick={handleTestApprovalRecords} 
                  disabled={loading || !authStore.isAuthenticated}
                  className="w-full"
                >
                  Test Approval Records API
                </Button>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Auth Utilities</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={handleCheckAuth} variant="outline">
                Check Auth State
              </Button>
              <Button onClick={handleFixAuth} variant="outline">
                Fix Auth Issues
              </Button>
              <Button onClick={handleClearAuth} variant="outline">
                Clear Auth Data
              </Button>
              <Button onClick={handleNavigateToTestPlan} variant="outline">
                View Test Plan
              </Button>
            </div>
          </div>
        </CardContent>
        
        <CardFooter>
          <Button 
            onClick={handleNavigateToApprovalDashboard} 
            className="w-full"
          >
            Go to Approval Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AuthTest; 