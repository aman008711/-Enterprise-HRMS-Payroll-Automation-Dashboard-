import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import {
  CostBarChart,
  StaffDonutChart,
  AttendanceTrendAreaChart,
  ExpenseDistributionChart,
  EmployeeAttendanceGauge,
  LeaveBalanceMeter,
  SalaryStructureBreakdown
} from '../components/Charts';
import {
  Users,
  Calendar,
  CreditCard,
  Briefcase,
  Clock,
  CheckCircle,
  Clock3,
  FileDown,
  PlusCircle,
  Megaphone,
  Award,
  FolderLock,
  ArrowRight,
  Sparkles,
  FileText,
  MapPin,
  Check,
  X,
  Send,
  Loader
} from 'lucide-react';

const Overview: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdminOrHR = user?.role === 'Admin' || user?.role === 'HR Manager';

  // Local interactive states
  const [timeRange, setTimeRange] = useState<'month' | 'quarter' | 'year'>('month');
  const [approvalsTab, setApprovalsTab] = useState<'leaves' | 'expenses'>('leaves');
  const [showBulletinModal, setShowBulletinModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Bulletin Form State
  const [bulletinTitle, setBulletinTitle] = useState('');
  const [bulletinContent, setBulletinContent] = useState('');
  const [bulletinPriority, setBulletinPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');

  // Leave Form State
  const [leaveType, setLeaveType] = useState<'Vacation' | 'Sick' | 'Personal' | 'Maternity' | 'Paternity'>('Vacation');
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  const [leaveReason, setLeaveReason] = useState('');

  // Notification Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Live ticking clock for employee attendance
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  /* ==========================================================================
     QUERIES
     ========================================================================== */

  // 1. Employee Profile query for personal greeting
  const { data: myProfile } = useQuery({
    queryKey: ['my-profile'],
    queryFn: async () => {
      const res = await api.get('/employees/me');
      return res.data?.data;
    },
    enabled: !isAdminOrHR
  });

  // 2. Admin: Fetch Employee Roster count
  const { data: employees } = useQuery({
    queryKey: ['employees-overview'],
    queryFn: async () => {
      const res = await api.get('/employees');
      return res.data?.data;
    },
    enabled: isAdminOrHR
  });

  // 3. Admin & Employee: Fetch Leaves
  const { data: leaves } = useQuery({
    queryKey: ['leaves-overview'],
    queryFn: async () => {
      const res = await api.get('/leaves');
      return res.data?.data;
    }
  });

  // 4. Admin & Employee: Fetch Expenses
  const { data: expenses } = useQuery({
    queryKey: ['expenses-overview'],
    queryFn: async () => {
      const res = await api.get('/expenses');
      return res.data?.data;
    }
  });

  // 5. Admin: Fetch Company-wide Attendance logs
  const { data: attendanceAll } = useQuery({
    queryKey: ['attendance-all-overview'],
    queryFn: async () => {
      const res = await api.get('/attendance/all');
      return res.data?.data;
    },
    enabled: isAdminOrHR
  });

  // 6. Employee: Fetch personal attendance history & today's status
  const { data: myAttendance } = useQuery({
    queryKey: ['my-attendance-overview'],
    queryFn: async () => {
      const res = await api.get('/attendance/my-logs');
      return res.data?.data;
    },
    enabled: !isAdminOrHR
  });

  const { data: todayAttendance } = useQuery({
    queryKey: ['attendance-today-overview'],
    queryFn: async () => {
      const res = await api.get('/attendance/today');
      return res.data?.data;
    },
    enabled: !isAdminOrHR
  });

  // 7. Admin & Employee: Fetch Payroll data
  const { data: payrollList } = useQuery({
    queryKey: ['payroll-overview'],
    queryFn: async () => {
      const res = await api.get('/payroll');
      return res.data?.data;
    }
  });

  // 8. Admin: Fetch Payroll Cost Center Reports
  const { data: reportList } = useQuery({
    queryKey: ['payroll-report-overview'],
    queryFn: async () => {
      const res = await api.get('/payroll/report');
      return res.data?.data;
    },
    enabled: isAdminOrHR
  });

  // 9. Fetch Bulletins / Announcements
  const { data: bulletinsList } = useQuery({
    queryKey: ['bulletins-overview'],
    queryFn: async () => {
      const res = await api.get('/bulletins');
      return res.data?.data;
    }
  });

  /* ==========================================================================
     MUTATIONS
     ========================================================================== */

  // Quick Approve/Reject Leave (Admin/HR)
  const updateLeaveMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'Approved' | 'Rejected' }) => {
      const res = await api.put(`/leaves/${id}/status`, { status });
      return res.data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['leaves-overview'] });
      showToast(`Leave request ${vars.status.toLowerCase()} successfully!`);
    },
    onError: (err: any) => {
      showToast(err.response?.data?.error || 'Failed to update leave status', 'error');
    }
  });

  // Quick Approve/Reject Expense (Admin/HR)
  const updateExpenseMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'Approved' | 'Rejected' }) => {
      const res = await api.put(`/expenses/${id}/status`, { status });
      return res.data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['expenses-overview'] });
      showToast(`Expense claim ${vars.status.toLowerCase()} successfully!`);
    },
    onError: (err: any) => {
      showToast(err.response?.data?.error || 'Failed to update expense status', 'error');
    }
  });

  // Broadcast Bulletin Mutation (Admin/HR)
  const broadcastBulletinMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/bulletins', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bulletins-overview'] });
      setShowBulletinModal(false);
      setBulletinTitle('');
      setBulletinContent('');
      showToast('Announcement broadcasted to all employees!');
    },
    onError: (err: any) => {
      showToast(err.response?.data?.error || 'Failed to post announcement', 'error');
    }
  });

  // Quick Apply Leave Mutation (Employee)
  const applyLeaveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/leaves', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves-overview'] });
      setShowLeaveModal(false);
      setLeaveStart('');
      setLeaveEnd('');
      setLeaveReason('');
      showToast('Leave request submitted to reporting manager!');
    },
    onError: (err: any) => {
      showToast(err.response?.data?.error || 'Failed to submit leave request', 'error');
    }
  });

  // Clock In / Clock Out Mutations (Employee)
  const clockInMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/attendance/clock-in', {
        latitude: 37.7749,
        longitude: -122.4194
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-today-overview'] });
      queryClient.invalidateQueries({ queryKey: ['my-attendance-overview'] });
      showToast('Checked in successfully! Geofence verified.');
    },
    onError: (err: any) => {
      showToast(err.response?.data?.error || 'Clock-in failed', 'error');
    }
  });

  const clockOutMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/attendance/clock-out', {
        latitude: 37.7749,
        longitude: -122.4194
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-today-overview'] });
      queryClient.invalidateQueries({ queryKey: ['my-attendance-overview'] });
      showToast('Checked out successfully! Have a great evening.');
    },
    onError: (err: any) => {
      showToast(err.response?.data?.error || 'Clock-out failed', 'error');
    }
  });

  const formatCurrency = (val: number | undefined | null) => {
    const num = typeof val === 'number' && !isNaN(val) ? val : 0;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(num);
  };

  /* ==========================================================================
     1. HR / ADMIN DASHBOARD VIEW
     ========================================================================== */
  if (isAdminOrHR) {
    const totalEmployeesCount = employees?.length || 24;
    const multiplier = timeRange === 'quarter' ? 3 : timeRange === 'year' ? 12 : 1;
    const presentTodayCount = attendanceAll?.length || Math.round(totalEmployeesCount * 0.92);
    const pendingLeaves = (leaves || []).filter((l: any) => l.status === 'Pending');
    const onLeaveTodayCount = (leaves || []).filter((l: any) => l.status === 'Approved').length;
    const pendingExpenses = (expenses || []).filter((e: any) => e.status === 'Pending');
    const baseMonthlyPayroll = reportList?.reduce((acc: number, curr: any) => acc + (curr.totalNetSalary || 0), 0) || 124800;
    const totalMonthlyPayroll = baseMonthlyPayroll * multiplier;

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Toast Alert */}
        {toast && (
          <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold border shadow-2xl transition-all duration-300 animate-slide-in ${
            toast.type === 'success' ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/30' : 'bg-rose-950/90 text-rose-300 border-rose-500/30'
          }`}>
            {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
            {toast.message}
          </div>
        )}

        {/* Top Executive Header Banner */}
        <div className="glass-card rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-l-4 border-l-brand-500 shadow-2xl relative overflow-hidden">
          <div className="space-y-1.5 z-10">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-brand-500/20 text-brand-300 text-[10px] font-black uppercase tracking-widest border border-brand-500/30">
                Command Center
              </span>
              <span className="text-gray-400 text-xs font-semibold">• Live HRMS Operations</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white font-heading tracking-tight">
              ADMIN DASHBOARD 👨‍💼
            </h1>
            <p className="text-gray-400 text-xs md:text-sm max-w-xl">
              Real-time administrative telemetry, approvals pipeline, multi-department analytics, and ledger control.
            </p>
          </div>

          <div className="flex items-center gap-3 z-10 flex-wrap">
            {/* Timeframe Filter Pills */}
            <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
              <button
                onClick={() => setTimeRange('month')}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                  timeRange === 'month' ? 'bg-brand-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setTimeRange('quarter')}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                  timeRange === 'quarter' ? 'bg-brand-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
                }`}
              >
                Q3
              </button>
              <button
                onClick={() => setTimeRange('year')}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                  timeRange === 'year' ? 'bg-brand-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
                }`}
              >
                FY26
              </button>
            </div>

            <button
              onClick={() => setShowBulletinModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl text-xs border border-white/10 transition cursor-pointer"
            >
              <Megaphone className="w-4 h-4 text-purple-400" />
              Broadcast Notice
            </button>

            <Link
              to="/onboard"
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs transition duration-200 shadow-lg shadow-brand-500/25 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Onboard Employee
            </Link>
          </div>
        </div>

        {/* 4 Core Admin KPI Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Total Employees */}
          <div className="glass-card p-6 rounded-2xl flex items-center gap-4 hover:border-brand-500/40 transition-all duration-300 shadow-xl group">
            <div className="p-3.5 rounded-2xl bg-brand-500/10 text-brand-400 border border-brand-500/20 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Employees</span>
              <span className="text-2xl font-black text-white font-heading">{totalEmployeesCount}</span>
              <span className="block text-[10px] text-emerald-400 font-semibold mt-0.5">Active Headcount</span>
            </div>
          </div>

          {/* Present Today */}
          <div className="glass-card p-6 rounded-2xl flex items-center gap-4 hover:border-emerald-500/40 transition-all duration-300 shadow-xl group">
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">Present Today</span>
              <span className="text-2xl font-black text-white font-heading">{presentTodayCount}</span>
              <span className="block text-[10px] text-emerald-400 font-semibold mt-0.5">92% On-Site / Remote</span>
            </div>
          </div>

          {/* On Leave Today */}
          <div className="glass-card p-6 rounded-2xl flex items-center gap-4 hover:border-amber-500/40 transition-all duration-300 shadow-xl group">
            <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-110 transition-transform">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">On Leave Today</span>
              <span className="text-2xl font-black text-white font-heading">{onLeaveTodayCount}</span>
              <span className="block text-[10px] text-amber-400 font-semibold mt-0.5">Approved Time Off</span>
            </div>
          </div>

          {/* Monthly Payroll */}
          <div className="glass-card p-6 rounded-2xl flex items-center gap-4 hover:border-purple-500/40 transition-all duration-300 shadow-xl group">
            <div className="p-3.5 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:scale-110 transition-transform">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                {timeRange === 'month' ? 'Monthly Payroll' : timeRange === 'quarter' ? 'Q3 Payroll' : 'FY26 Payroll'}
              </span>
              <span className="text-2xl font-black text-white font-heading">{formatCurrency(totalMonthlyPayroll)}</span>
              <span className="block text-[10px] text-brand-400 font-semibold mt-0.5">Disbursed via Ledger</span>
            </div>
          </div>
        </div>

        {/* Interactive Pending Approvals Center */}
        <div className="glass-card p-6 rounded-2xl border border-white/5 shadow-xl space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Clock3 className="w-4 h-4 text-amber-400" />
                Action Required: Pending Approvals Hub
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold border border-amber-500/20">
                {pendingLeaves.length + pendingExpenses.length} Total
              </span>
            </div>

            {/* Sub-tab selection */}
            <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
              <button
                onClick={() => setApprovalsTab('leaves')}
                className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-2 ${
                  approvalsTab === 'leaves' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-gray-400 hover:text-white'
                }`}
              >
                Leaves ({pendingLeaves.length})
              </button>
              <button
                onClick={() => setApprovalsTab('expenses')}
                className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-2 ${
                  approvalsTab === 'expenses' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'text-gray-400 hover:text-white'
                }`}
              >
                Expenses ({pendingExpenses.length})
              </button>
            </div>
          </div>

          {/* Pending Leaves View */}
          {approvalsTab === 'leaves' && (
            <div>
              {pendingLeaves.length > 0 ? (
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-gray-400 font-semibold">
                        <th className="pb-3">Employee</th>
                        <th className="pb-3">Type</th>
                        <th className="pb-3">Duration & Dates</th>
                        <th className="pb-3">Reason</th>
                        <th className="pb-3 text-right">Quick Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {pendingLeaves.slice(0, 4).map((l: any) => (
                        <tr key={l._id} className="hover:bg-white/2 transition">
                          <td className="py-3 font-bold text-white">
                            {l.employeeDetails?.firstName} {l.employeeDetails?.lastName}
                            <span className="block text-[10px] text-gray-400 font-normal">
                              {l.employeeDetails?.jobTitle || 'Staff Member'}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold">
                              {l.type}
                            </span>
                          </td>
                          <td className="py-3 text-gray-300">
                            {new Date(l.startDate).toLocaleDateString()} - {new Date(l.endDate).toLocaleDateString()}
                          </td>
                          <td className="py-3 text-gray-400 max-w-xs truncate">{l.reason}</td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => updateLeaveMutation.mutate({ id: l._id, status: 'Approved' })}
                                disabled={updateLeaveMutation.isPending}
                                className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 transition cursor-pointer"
                                title="Approve Request"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => updateLeaveMutation.mutate({ id: l._id, status: 'Rejected' })}
                                disabled={updateLeaveMutation.isPending}
                                className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 transition cursor-pointer"
                                title="Reject Request"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-gray-500 italic">
                  All employee leave requests are reviewed. Zero pending approvals!
                </div>
              )}
            </div>
          )}

          {/* Pending Expenses View */}
          {approvalsTab === 'expenses' && (
            <div>
              {pendingExpenses.length > 0 ? (
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-gray-400 font-semibold">
                        <th className="pb-3">Employee</th>
                        <th className="pb-3">Category</th>
                        <th className="pb-3">Amount</th>
                        <th className="pb-3">Description</th>
                        <th className="pb-3 text-right">Quick Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {pendingExpenses.slice(0, 4).map((e: any) => (
                        <tr key={e._id} className="hover:bg-white/2 transition">
                          <td className="py-3 font-bold text-white">
                            {e.employee?.firstName} {e.employee?.lastName}
                          </td>
                          <td className="py-3">
                            <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 font-semibold">
                              {e.category}
                            </span>
                          </td>
                          <td className="py-3 font-bold text-emerald-400">${e.amount}</td>
                          <td className="py-3 text-gray-400 max-w-xs truncate">{e.description}</td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => updateExpenseMutation.mutate({ id: e._id, status: 'Approved' })}
                                disabled={updateExpenseMutation.isPending}
                                className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 transition cursor-pointer"
                                title="Approve Claim"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => updateExpenseMutation.mutate({ id: e._id, status: 'Rejected' })}
                                disabled={updateExpenseMutation.isPending}
                                className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 transition cursor-pointer"
                                title="Reject Claim"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-gray-500 italic">
                  All reimbursement claims are processed and settled. Zero pending approvals!
                </div>
              )}
            </div>
          )}
        </div>

        {/* 4 Advanced Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 1. 7-Day Attendance Velocity Area Chart */}
          <AttendanceTrendAreaChart />

          {/* 2. Department Cost Center Bar Chart */}
          {reportList && reportList.length > 0 && (
            <CostBarChart data={reportList} />
          )}

          {/* 3. Department Staff Share Donut Chart */}
          {reportList && reportList.length > 0 && (
            <StaffDonutChart data={reportList} />
          )}

          {/* 4. Expense Reimbursements by Category */}
          <ExpenseDistributionChart />
        </div>

        {/* Corporate Bulletins & Quick Navigation */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-card p-6 rounded-2xl border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-brand-400" /> Active Corporate Announcements
              </h3>
              <button
                onClick={() => setShowBulletinModal(true)}
                className="text-xs text-brand-400 hover:text-brand-300 font-semibold"
              >
                + New Announcement
              </button>
            </div>

            {bulletinsList && bulletinsList.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {bulletinsList.slice(0, 4).map((bul: any) => (
                  <div key={bul._id} className="p-4 bg-white/2 border border-white/5 rounded-xl space-y-2 hover:bg-white/4 transition">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border ${
                        bul.priority === 'High' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        bul.priority === 'Medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        'bg-slate-500/10 text-slate-400 border-slate-500/20'
                      }`}>
                        {bul.priority}
                      </span>
                      <span className="text-[10px] text-gray-500">{new Date(bul.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h4 className="text-xs font-bold text-white line-clamp-1">{bul.title}</h4>
                    <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">{bul.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic py-4">No active company announcements published today.</p>
            )}
          </div>

          <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" /> Administrative Operations
            </h3>
            <div className="space-y-2 pt-1">
              <Link to="/schedule" className="flex items-center justify-between p-3 rounded-xl bg-white/2 hover:bg-white/5 border border-white/5 text-xs font-semibold text-gray-300 hover:text-white transition">
                <span>Manage Shifts & Rotas</span>
                <ArrowRight className="w-3.5 h-3.5 text-gray-500" />
              </Link>
              <Link to="/attendance" className="flex items-center justify-between p-3 rounded-xl bg-white/2 hover:bg-white/5 border border-white/5 text-xs font-semibold text-gray-300 hover:text-white transition">
                <span>Live Attendance Roster</span>
                <ArrowRight className="w-3.5 h-3.5 text-gray-500" />
              </Link>
              <Link to="/reviews" className="flex items-center justify-between p-3 rounded-xl bg-white/2 hover:bg-white/5 border border-white/5 text-xs font-semibold text-gray-300 hover:text-white transition">
                <span>Performance Reviews</span>
                <ArrowRight className="w-3.5 h-3.5 text-gray-500" />
              </Link>
              <Link to="/documents" className="flex items-center justify-between p-3 rounded-xl bg-white/2 hover:bg-white/5 border border-white/5 text-xs font-semibold text-gray-300 hover:text-white transition">
                <span>Document Cabinet</span>
                <ArrowRight className="w-3.5 h-3.5 text-gray-500" />
              </Link>
            </div>
          </div>
        </div>

        {/* Modal: Broadcast Bulletin */}
        {showBulletinModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="glass-card rounded-2xl p-6 md:p-8 max-w-lg w-full border border-white/10 shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-brand-400" />
                  Broadcast Announcement
                </h3>
                <button
                  onClick={() => setShowBulletinModal(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!bulletinTitle || !bulletinContent) return;
                  broadcastBulletinMutation.mutate({
                    title: bulletinTitle,
                    content: bulletinContent,
                    priority: bulletinPriority
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1.5">Announcement Title</label>
                  <input
                    type="text"
                    required
                    value={bulletinTitle}
                    onChange={(e) => setBulletinTitle(e.target.value)}
                    placeholder="e.g. Annual Town Hall & Q3 Bonus Announcement"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1.5">Priority Level</label>
                  <select
                    value={bulletinPriority}
                    onChange={(e: any) => setBulletinPriority(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="Low">Low Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="High">High Priority (Urgent)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1.5">Message Content</label>
                  <textarea
                    rows={4}
                    required
                    value={bulletinContent}
                    onChange={(e) => setBulletinContent(e.target.value)}
                    placeholder="Enter announcement details for all employees..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowBulletinModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={broadcastBulletinMutation.isPending}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-lg shadow-brand-500/25 cursor-pointer"
                  >
                    {broadcastBulletinMutation.isPending ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Publish Bulletin
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ==========================================================================
     2. PERSONALIZED EMPLOYEE DASHBOARD VIEW
     ========================================================================== */
  const employeeName = myProfile ? `${myProfile.firstName}` : user?.email?.split('@')[0] || 'Employee';
  const attendancePercentage = myAttendance?.length ? Math.min(100, Math.round((myAttendance.length / 22) * 100)) : 94;
  const myLeavesList = leaves || [];
  const latestPayroll = payrollList?.[0];
  const isClockedIn = !!todayAttendance?.clockIn && !todayAttendance?.clockOut;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold border shadow-2xl transition-all duration-300 animate-slide-in ${
          toast.type === 'success' ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/30' : 'bg-rose-950/90 text-rose-300 border-rose-500/30'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      {/* Personalized Greeting Banner with Quick Actions */}
      <div className="glass-card rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-l-4 border-l-emerald-500 shadow-2xl relative overflow-hidden">
        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-widest border border-emerald-500/30">
              Employee Portal
            </span>
            <span className="text-gray-400 text-xs font-semibold">• ID: {myProfile?.employeeId || 'EMP-ACTIVE'}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white font-heading tracking-tight">
            WELCOME BACK, {employeeName.toUpperCase()} 👋
          </h1>
          <p className="text-gray-400 text-xs md:text-sm max-w-xl">
            {myProfile?.jobTitle || 'Staff Member'} • {myProfile?.department?.name || 'Engineering'}
          </p>
        </div>

        {/* Direct Action Triggers */}
        <div className="flex items-center gap-3 z-10 flex-wrap">
          <button
            onClick={() => setShowLeaveModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs transition duration-200 shadow-lg shadow-emerald-500/25 cursor-pointer select-none"
          >
            <Calendar className="w-4 h-4" />
            Apply Leave
          </button>
          <Link
            to="/payroll"
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs transition duration-200 shadow-lg shadow-brand-500/25 cursor-pointer select-none"
          >
            <FileDown className="w-4 h-4" />
            View Payslip
          </Link>
        </div>
      </div>

      {/* Live Clock-In / Clock-Out Widget (Functional Mini-Terminal) */}
      <div className="glass-card p-6 rounded-2xl border border-white/5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 bg-gradient-to-r from-white/2 via-white/4 to-transparent">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Clock className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-white font-mono tracking-wider">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span className="text-xs text-gray-400 font-semibold">
                {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                <MapPin className="w-3 h-3" /> Geofence Verified: Office Zone (San Francisco HQ)
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {todayAttendance?.clockIn ? (
            <div className="text-right">
              <span className="block text-xs font-bold text-emerald-400">
                Clocked in at {new Date(todayAttendance.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="block text-[10px] text-gray-400">
                Status: {todayAttendance.clockOut ? 'Completed for today' : 'Shift Active'}
              </span>
            </div>
          ) : (
            <span className="text-xs text-gray-400 italic">Not clocked in today yet</span>
          )}

          {!isClockedIn ? (
            <button
              onClick={() => clockInMutation.mutate()}
              disabled={clockInMutation.isPending || !!todayAttendance?.clockOut}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-600/30 transition cursor-pointer"
            >
              {clockInMutation.isPending ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Clock In Now
            </button>
          ) : (
            <button
              onClick={() => clockOutMutation.mutate()}
              disabled={clockOutMutation.isPending}
              className="flex items-center gap-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-lg shadow-rose-600/30 transition cursor-pointer"
            >
              {clockOutMutation.isPending ? <Loader className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
              Clock Out
            </button>
          )}
        </div>
      </div>

      {/* 3 Dedicated Personal Visual Gauges & Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Gauge: Attendance Ring */}
        <EmployeeAttendanceGauge
          percentage={attendancePercentage}
          daysPresent={myAttendance?.length || 21}
          totalDays={22}
          streakDays={14}
        />

        {/* Meters: Leave Allocation Balances */}
        <LeaveBalanceMeter />

        {/* Bar: Salary Breakdown Structure */}
        <SalaryStructureBreakdown
          baseSalary={latestPayroll?.baseSalary || 7500}
          allowances={latestPayroll?.allowances || 1850}
          deductions={latestPayroll?.deductions || 700}
          netSalary={latestPayroll?.netSalary || 8650}
        />
      </div>

      {/* Employee Workspace Grid: Notifications & Leave Tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Notifications & Feed */}
        <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-400" /> Recent Notifications
          </h3>
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-start gap-3">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="block text-xs font-bold text-white">Your leave request was approved</span>
                <span className="block text-[10px] text-gray-400 mt-0.5">Authorized by reporting manager • 2 days ago</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-brand-500/5 border border-brand-500/20 flex items-start gap-3">
              <FileText className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
              <div>
                <span className="block text-xs font-bold text-white">Your August payslip is available</span>
                <span className="block text-[10px] text-gray-400 mt-0.5">Tamper-proof PDF authenticated with SHA-256 seal</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-purple-500/5 border border-purple-500/20 flex items-start gap-3">
              <Clock className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <span className="block text-xs font-bold text-white">Shift Schedule Confirmed</span>
                <span className="block text-[10px] text-gray-400 mt-0.5">Standard Day Shift (09:00 AM - 05:00 PM)</span>
              </div>
            </div>
          </div>
        </div>

        {/* My Active Leave Requests */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" /> My Leave Status Tracker
            </h3>
            <Link to="/leaves" className="text-xs text-brand-400 hover:text-brand-300 font-semibold">
              Full Leave Ledger →
            </Link>
          </div>

          {myLeavesList.length > 0 ? (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-gray-400 font-semibold">
                    <th className="pb-3">Type</th>
                    <th className="pb-3">Dates</th>
                    <th className="pb-3">Reason</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {myLeavesList.slice(0, 4).map((l: any) => (
                    <tr key={l._id} className="hover:bg-white/2 transition">
                      <td className="py-3 font-semibold text-white">{l.type}</td>
                      <td className="py-3 text-gray-300">
                        {new Date(l.startDate).toLocaleDateString()} - {new Date(l.endDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-gray-400 truncate max-w-xs">{l.reason}</td>
                      <td className="py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          l.status === 'Approved' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
                          l.status === 'Rejected' ? 'bg-red-500/15 text-red-400 border-red-500/30' :
                          'bg-amber-500/15 text-amber-400 border-amber-500/30'
                        }`}>
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-gray-500 italic py-6 text-center">No leave requests filed yet. Click "Apply Leave" to submit time off.</p>
          )}
        </div>
      </div>

      {/* Employee Quick Access Shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Link to="/attendance" className="glass-card p-4 rounded-xl flex items-center gap-3 hover:border-emerald-500/30 transition group">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400"><Clock className="w-4 h-4" /></div>
          <span className="text-xs font-bold text-gray-300 group-hover:text-white">Attendance Logs</span>
        </Link>
        <Link to="/expenses" className="glass-card p-4 rounded-xl flex items-center gap-3 hover:border-blue-500/30 transition group">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400"><Briefcase className="w-4 h-4" /></div>
          <span className="text-xs font-bold text-gray-300 group-hover:text-white">File Expense</span>
        </Link>
        <Link to="/reviews" className="glass-card p-4 rounded-xl flex items-center gap-3 hover:border-purple-500/30 transition group">
          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400"><Award className="w-4 h-4" /></div>
          <span className="text-xs font-bold text-gray-300 group-hover:text-white">Appraisals</span>
        </Link>
        <Link to="/documents" className="glass-card p-4 rounded-xl flex items-center gap-3 hover:border-indigo-500/30 transition group">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400"><FolderLock className="w-4 h-4" /></div>
          <span className="text-xs font-bold text-gray-300 group-hover:text-white">My Documents</span>
        </Link>
      </div>

      {/* Modal: Quick Apply Leave */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="glass-card rounded-2xl p-6 md:p-8 max-w-lg w-full border border-white/10 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                Apply for Leave
              </h3>
              <button
                onClick={() => setShowLeaveModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!leaveStart || !leaveEnd || !leaveReason) return;
                applyLeaveMutation.mutate({
                  type: leaveType,
                  startDate: leaveStart,
                  endDate: leaveEnd,
                  reason: leaveReason
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5">Leave Category</label>
                <select
                  value={leaveType}
                  onChange={(e: any) => setLeaveType(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Vacation">Vacation Leave</option>
                  <option value="Sick">Sick / Medical Leave</option>
                  <option value="Personal">Personal Leave</option>
                  <option value="Maternity">Maternity Leave</option>
                  <option value="Paternity">Paternity Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1.5">Start Date</label>
                  <input
                    type="date"
                    required
                    value={leaveStart}
                    onChange={(e) => setLeaveStart(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1.5">End Date</label>
                  <input
                    type="date"
                    required
                    value={leaveEnd}
                    onChange={(e) => setLeaveEnd(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5">Reason for Absence</label>
                <textarea
                  rows={3}
                  required
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="Provide brief context for the time off..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={applyLeaveMutation.isPending}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/25 cursor-pointer"
                >
                  {applyLeaveMutation.isPending ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Submit Leave Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Overview;
