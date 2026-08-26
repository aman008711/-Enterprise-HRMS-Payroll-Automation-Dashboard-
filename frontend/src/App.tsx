import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import Employees from './pages/Employees';
import DashboardLayout from './components/DashboardLayout';
import { Users, Calendar, CreditCard, ShieldCheck } from 'lucide-react';

// Initialize TanStack Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
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
    </div>
  );
};


// 3. Leaves Page Placeholder
const LeavesPage: React.FC = () => (
  <div className="glass-card rounded-2xl p-8 border border-white/5 shadow-xl">
    <h3 className="text-lg font-bold text-white mb-2">Leave Administration</h3>
    <p className="text-gray-400 text-sm">Review leave requests, calendar periods, and approval lifecycle queues.</p>
    <div className="mt-8 border border-dashed border-white/10 rounded-2xl h-48 flex items-center justify-center text-gray-500 text-sm">
      Leave Calendar Board Placeholder
    </div>
  </div>
);

// 4. Payroll Page Placeholder
const PayrollPage: React.FC = () => (
  <div className="glass-card rounded-2xl p-8 border border-white/5 shadow-xl">
    <h3 className="text-lg font-bold text-white mb-2">Financial Records & Payslips</h3>
    <p className="text-gray-400 text-sm">Batch payroll processing, allowances calculations, and downloadable PDF reports.</p>
    <div className="mt-8 border border-dashed border-white/10 rounded-2xl h-48 flex items-center justify-center text-gray-500 text-sm">
      Payroll Ledger Board Placeholder
    </div>
  </div>
);

const AppRoutes: React.FC = () => {
  return (
    <Router>
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
          <Route path="leaves" element={<LeavesPage />} />
          <Route path="payroll" element={<PayrollPage />} />
        </Route>

        {/* Catch-all Redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
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
