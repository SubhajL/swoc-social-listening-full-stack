import React, { useState, useEffect } from 'react';
import { TEST_USERS, TestUser, addTestUser } from '@/mocks/test-users';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

/**
 * UserManager Component
 * 
 * A development utility for managing test users.
 * This component allows developers to:
 * - View existing test users
 * - Add new test users
 * - Reset test users' password_changed status
 * 
 * NOTE: This component should only be used during development.
 */
const UserManager: React.FC = () => {
  const [users, setUsers] = useState<TestUser[]>([]);
  const [newUser, setNewUser] = useState<Partial<TestUser>>({
    id: '',
    email: '',
    name: '',
    role: 'user',
    password: '',
    password_changed: false
  });

  // Load users on mount
  useEffect(() => {
    setUsers([...TEST_USERS]);
  }, []);

  // Handle input change for new user form
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setNewUser({
      ...newUser,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // Add a new test user
  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!newUser.email || !newUser.password || !newUser.name) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    // Generate an ID if not provided
    const userId = newUser.id || `test-user-id-${Date.now()}`;
    
    // Create the new user
    const user: TestUser = {
      id: userId,
      email: newUser.email!,
      name: newUser.name!,
      role: newUser.role || 'user',
      password: newUser.password!,
      password_changed: newUser.password_changed || false
    };
    
    // Add to test users
    addTestUser(user);
    
    // Update local state
    setUsers([...TEST_USERS]);
    
    // Reset form
    setNewUser({
      id: '',
      email: '',
      name: '',
      role: 'user',
      password: '',
      password_changed: false
    });
    
    toast.success(`User ${user.email} added successfully`);
  };

  // Reset a user's password_changed status
  const handleResetPasswordChanged = (userId: string) => {
    const userIndex = TEST_USERS.findIndex(u => u.id === userId);
    
    if (userIndex !== -1) {
      TEST_USERS[userIndex] = {
        ...TEST_USERS[userIndex],
        password_changed: false
      };
      
      setUsers([...TEST_USERS]);
      toast.success('User password status reset');
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Test User Manager</h1>
      <p className="text-gray-600 mb-6">
        This utility is for development purposes only. It allows you to manage test users
        for the authentication system.
      </p>
      
      {/* Add New User Form */}
      <Card className="mb-8">
        <CardHeader>
          <h2 className="text-xl font-semibold">Add New Test User</h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email (required)</label>
              <Input
                name="email"
                type="email"
                value={newUser.email || ''}
                onChange={handleInputChange}
                placeholder="user@example.com"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Name (required)</label>
              <Input
                name="name"
                value={newUser.name || ''}
                onChange={handleInputChange}
                placeholder="User Name"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Password (required)</label>
              <Input
                name="password"
                type="text"
                value={newUser.password || ''}
                onChange={handleInputChange}
                placeholder="Password"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Role</label>
              <select
                name="role"
                value={newUser.role || 'user'}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                className="w-full p-2 border rounded"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            
            <div className="flex items-center">
              <input
                name="password_changed"
                type="checkbox"
                checked={newUser.password_changed || false}
                onChange={handleInputChange}
                className="mr-2"
              />
              <label>Password already changed</label>
            </div>
            
            <button
              type="submit"
              className="bg-[#4B9FE1] hover:bg-[#3D8FD1] text-white px-4 py-2 rounded"
            >
              Add User
            </button>
          </form>
        </CardContent>
      </Card>
      
      {/* Existing Users List */}
      <h2 className="text-xl font-semibold mb-4">Existing Test Users</h2>
      <div className="space-y-4">
        {users.map(user => (
          <Card key={user.id} className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium">{user.name}</h3>
                <p className="text-sm text-gray-600">{user.email}</p>
                <p className="text-sm">Role: {user.role}</p>
                <p className="text-sm">
                  Password: <code className="bg-gray-100 px-1 rounded">{user.password}</code>
                </p>
                <p className="text-sm">
                  Password Changed: 
                  <span className={user.password_changed ? 'text-green-600' : 'text-red-600'}>
                    {user.password_changed ? ' Yes' : ' No'}
                  </span>
                </p>
              </div>
              
              <button
                onClick={() => handleResetPasswordChanged(user.id)}
                className="bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded text-sm"
                disabled={!user.password_changed}
              >
                Reset Password Status
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default UserManager; 