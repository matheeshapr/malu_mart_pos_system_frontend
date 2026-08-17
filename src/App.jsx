import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import POSPage from './pages/POSPage';
import AdminDashboard from './pages/AdminDashboard';
import CustomerStore from './pages/CustomerStore'; 
import CustomerProfile from './pages/CustomerProfile';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const userRole = localStorage.getItem('userRole');

  if (!userRole) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return userRole === 'admin' ? <Navigate to="/admin" replace /> : <Navigate to="/pos" replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        
        {/* Public Routes */}
        <Route path="/store" element={<CustomerStore />} />
        <Route path="/profile" element={<CustomerProfile />} />
        
        <Route 
          path="/pos" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'cashier']}>
              <POSPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;