import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './hooks/useAuth';
import api from './utils/api';
import { CostBarChart, StaffDonutChart } from './components/Charts';
import DashboardLayout from './components/DashboardLayout';
import { Users, Calendar, CreditCard, ShieldCheck } from 'lucide-react';

// Route Lazy-Loading for code splitting
const Login = lazy(() => import('./pages/Login'));
const Employees = lazy(() => import('./pages/Employees'));
const Onboard = lazy(() => import('./pages/Onboard'));
const Leaves = lazy(() => import('./pages/Leaves'));
const Payroll = lazy(() => import('./pages/Payroll'));
const Expenses = lazy(() => import('./pages/Expenses'));

// Initialize TanStack Query Client with global cache rules
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 2 * 60 * 1000, // 2 minutes (prevents redundant API spam)
      gcTime: 5 * 60 * 1000     // 5 minutes garbage collection limits
    }
  }
});

// Guard helper to protect routes and check user role credentials
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

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

  return <>{children}</>;
};

/* ==========================================================================
   SUB-PAGE PLACEHOLDERS (To be fully implemented in subsequent commits)
   ========================================================================== */

// 1. Overview Dashboard Placeholder
const OverviewPage: React.FC = () => {
  const { user } = useAuth();
  const isAdminOrHR = user?.role === 'Admin' || user?.role === 'HR Manager';

  // Fetch report aggregate data for charts
  const { data: reportList } = useQuery({
    queryKey: ['payroll-report-overview'],
    queryFn: async () => {
      const res = await api.get('/payroll/report');
      return res.data?.data;
    },
    enabled: isAdminOrHR
  });
  
  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="glass-card rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 border-l-4 border-l-brand-500">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-2">Welcome Back!</h1>
          <p className="text-gray-400 text-sm max-w-xl">
            You are logged in as <span className="text-brand-400 font-semibold">{user?.email}</span> with <span className="text-white font-semibold">{user?.role}</span> permissions. Access administrative modules via the sidebar.
          </p>
        </div>
        <div className="p-4 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 shrink-0 shadow-lg">
          <ShieldCheck className="w-12 h-12" />
        </div>
      </div>

      {/* Basic Metrics Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-2xl flex items-center gap-4 glass-card-hover">
          <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Roster</span>
            <span className="text-2xl font-black text-white">Active</span>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl flex items-center gap-4 glass-card-hover">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Leave Status</span>
            <span className="text-2xl font-black text-white">Approved</span>
          </div>
        </div>

        <div className="glass-card p-6 rounded-2xl flex items-center gap-4 glass-card-hover">
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Payroll Processing</span>
            <span className="text-2xl font-black text-white">Calculated</span>
          </div>
        </div>
      </div>

      {/* Main Admin/HR Dashboard Cost Analytics Charts */}
      {isAdminOrHR && reportList && reportList.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CostBarChart data={reportList} />
          <StaffDonutChart data={reportList} />
        </div>
      )}
    </div>
  );
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
            <Route index element={<OverviewPage />} />
            <Route path="employees" element={<Employees />} />
            <Route path="onboard" element={<Onboard />} />
            <Route path="leaves" element={<Leaves />} />
            <Route path="payroll" element={<Payroll />} />
            <Route path="expenses" element={<Expenses />} />
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
        <AppRoutes />
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
