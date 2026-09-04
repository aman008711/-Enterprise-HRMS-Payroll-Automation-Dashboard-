import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeProvider } from './context/ThemeContext';
import DashboardLayout from './components/DashboardLayout';

// Route Lazy-Loading for code splitting
const Login = lazy(() => import('./pages/Login'));
const Overview = lazy(() => import('./pages/Overview'));
const Employees = lazy(() => import('./pages/Employees'));
const Onboard = lazy(() => import('./pages/Onboard'));
const Leaves = lazy(() => import('./pages/Leaves'));
const Payroll = lazy(() => import('./pages/Payroll'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Attendance = lazy(() => import('./pages/Attendance'));
const Settings = lazy(() => import('./pages/Settings'));
const Schedule = lazy(() => import('./pages/Schedule'));
const Reviews = lazy(() => import('./pages/Reviews'));
const Documents = lazy(() => import('./pages/Documents'));
const Bulletins = lazy(() => import('./pages/Bulletins'));
const Grievances = lazy(() => import('./pages/Grievances'));
const Offboarding = lazy(() => import('./pages/Offboarding'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));
const Profile = lazy(() => import('./pages/Profile'));

// Initialize TanStack Query Client with global cache rules
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 2 * 60 * 1000, // 2 minutes
      gcTime: 5 * 60 * 1000     // 5 minutes
    }
  }
});

// Guard helper to protect routes and check user role credentials
const ProtectedRoute: React.FC<{ 
  children: React.ReactNode; 
  allowedRoles?: ('Admin' | 'HR Manager' | 'Employee')[] 
}> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#030014]">
        <div className="w-10 h-10 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirect unauthorized roles to dashboard home
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const RouteSuspenseFallback: React.FC = () => (
  <div className="w-full h-[60vh] flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-brand-500/20 border-t-brand-500 rounded-full animate-spin" />
  </div>
);

const AppRoutes: React.FC = () => {
  return (
    <Router>
      <Suspense fallback={<RouteSuspenseFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Protected Dashboard Route Tree */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Overview />} />
            <Route 
              path="employees" 
              element={
                <ProtectedRoute allowedRoles={['Admin', 'HR Manager']}>
                  <Employees />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="onboard" 
              element={
                <ProtectedRoute allowedRoles={['Admin', 'HR Manager']}>
                  <Onboard />
                </ProtectedRoute>
              } 
            />
            <Route path="leaves" element={<Leaves />} />
            <Route path="payroll" element={<Payroll />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="reviews" element={<Reviews />} />
            <Route path="documents" element={<Documents />} />
            <Route path="bulletins" element={<Bulletins />} />
            <Route path="grievances" element={<Grievances />} />
            <Route path="offboarding" element={<Offboarding />} />
            <Route path="profile" element={<Profile />} />
            <Route 
              path="audit-logs" 
              element={
                <ProtectedRoute allowedRoles={['Admin']}>
                  <AuditLogs />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="settings" 
              element={
                <ProtectedRoute allowedRoles={['Admin']}>
                  <Settings />
                </ProtectedRoute>
              } 
            />
          </Route>

          {/* Catch-all Redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <AppRoutes />
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
