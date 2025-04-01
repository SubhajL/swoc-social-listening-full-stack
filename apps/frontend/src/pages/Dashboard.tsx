import { useEffect } from 'react';
import ComplaintDashboard from '@/components/complaint/ComplaintDashboard';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

/**
 * Dashboard page component
 * This serves as a container for the main dashboard functionality
 */
const Dashboard = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If not authenticated, redirect to login
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <ComplaintDashboard />
    </div>
  );
};

export default Dashboard; 