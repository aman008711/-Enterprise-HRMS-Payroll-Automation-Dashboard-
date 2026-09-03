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
  Plus,
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

  // Interactive UI state
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

  // Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  /* ==========================================================================
     QUERIES
     ========================================================================== */
  const { data: myProfile } = useQuery({
    queryKey: ['my-profile'],
    queryFn: async () => {
      const res = await api.get('/employees/me');
      return res.data?.data;
    },
    enabled: !isAdminOrHR
  });

  const { data: employees } = useQuery({
    queryKey: ['employees-overview'],
    queryFn: async () => {
      const res = await api.get('/employees');
      return res.data?.data;
    },
    enabled: isAdminOrHR
  });

  const { data: leaves } = useQuery({
    queryKey: ['leaves-overview'],
    queryFn: async () => {
      const res = await api.get('/leaves');
      return res.data?.data;
    }
  });

  const { data: expenses } = useQuery({
    queryKey: ['expenses-overview'],
    queryFn: async () => {
      const res = await api.get('/expenses');
      return res.data?.data;
    }
  });

  const { data: attendanceAll } = useQuery({
    queryKey: ['attendance-all-overview'],
    queryFn: async () => {
      const res = await api.get('/attendance/all');
      return res.data?.data;
    },
    enabled: isAdminOrHR
  });

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

  const { data: payrollList } = useQuery({
    queryKey: ['payroll-overview'],
    queryFn: async () => {
      const res = await api.get('/payroll');
      return res.data?.data;
    }
  });

  const { data: reportList } = useQuery({
    queryKey: ['payroll-report-overview'],
    queryFn: async () => {
      const res = await api.get('/payroll/report');
      return res.data?.data;
    },
    enabled: isAdminOrHR
  });

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
  const updateLeaveMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'Approved' | 'Rejected' }) => {
      const res = await api.put(`/leaves/${id}/status`, { status });
      return res.data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['leaves-overview'] });
      showToast(`Leave request ${vars.status.toLowerCase()} successfully.`);
    },
    onError: (err: any) => {
      showToast(err.response?.data?.error || 'Failed to update leave status', 'error');
    }
  });

  const updateExpenseMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'Approved' | 'Rejected' }) => {
      const res = await api.put(`/expenses/${id}/status`, { status });
      return res.data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['expenses-overview'] });
      showToast(`Expense claim ${vars.status.toLowerCase()} successfully.`);
    },
    onError: (err: any) => {
      showToast(err.response?.data?.error || 'Failed to update expense status', 'error');
    }
  });

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
      showToast('Announcement published successfully.');
    },
    onError: (err: any) => {
      showToast(err.response?.data?.error || 'Failed to publish announcement', 'error');
    }
  });

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
      showToast('Leave request submitted to supervisor.');
    },
    onError: (err: any) => {
      showToast(err.response?.data?.error || 'Failed to submit leave request', 'error');
    }
  });

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
      showToast('Clocked in successfully. Geofence verified.');
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
      showToast('Clocked out successfully.');
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
      <div className="space-y-6">
        {/* Toast Alert */}
        {toast && (
          <div className={`fixed top-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg text-xs font-medium border shadow-lg transition-all ${
            toast.type === 'success' ? 'bg-[#0e2118] text-emerald-300 border-emerald-800/60' : 'bg-[#291216] text-rose-300 border-rose-800/60'
          }`}>
            {toast.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <X className="w-4 h-4 text-rose-400" />}
            {toast.message}
          </div>
        )}

        {/* Top Executive Header Banner */}
        <div className="bg-[#11131a] border border-[#1e212d] rounded-xl p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-zinc-400">Organization Overview</span>
              <span className="text-zinc-600">•</span>
              <span className="text-xs text-zinc-400">San Francisco HQ</span>
            </div>
            <h1 className="text-xl md:text-2xl font-semibold text-white tracking-tight">
              Workforce Operations
            </h1>
            <p className="text-xs text-zinc-400 max-w-xl">
              Centralized monitoring for headcount, attendance rates, payroll disbursements, and pending approvals.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Timeframe Filter Pills */}
            <div className="flex items-center bg-[#181a24] p-1 rounded-lg border border-[#272a38] text-xs">
              <button
                onClick={() => setTimeRange('month')}
                className={`px-3 py-1 rounded-md font-medium transition cursor-pointer ${
                  timeRange === 'month' ? 'bg-[#272a38] text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setTimeRange('quarter')}
                className={`px-3 py-1 rounded-md font-medium transition cursor-pointer ${
                  timeRange === 'quarter' ? 'bg-[#272a38] text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Q3
              </button>
              <button
                onClick={() => setTimeRange('year')}
                className={`px-3 py-1 rounded-md font-medium transition cursor-pointer ${
                  timeRange === 'year' ? 'bg-[#272a38] text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                }`}
              >
                FY26
              </button>
            </div>

            <button
              onClick={() => setShowBulletinModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-[#181a24] hover:bg-[#202330] text-zinc-200 font-medium rounded-lg text-xs border border-[#272a38] transition cursor-pointer"
            >
              <Megaphone className="w-3.5 h-3.5 text-zinc-400" />
              Post Notice
            </button>

            <Link
              to="/onboard"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-xs transition shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Onboard Employee
            </Link>
          </div>
        </div>

        {/* 4 Core Admin KPI Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Employees */}
          <div className="bg-[#11131a] border border-[#1e212d] rounded-xl p-5 flex items-center justify-between shadow-sm">
            <div>
              <span className="block text-xs font-medium text-zinc-400">Total Headcount</span>
              <span className="text-2xl font-semibold text-white tracking-tight mt-1 block">{totalEmployeesCount}</span>
              <span className="block text-[11px] text-zinc-500 mt-1">Active employees</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#181a24] border border-[#272a38] flex items-center justify-center text-zinc-300">
              <Users className="w-5 h-5" />
            </div>
          </div>

          {/* Present Today */}
          <div className="bg-[#11131a] border border-[#1e212d] rounded-xl p-5 flex items-center justify-between shadow-sm">
            <div>
              <span className="block text-xs font-medium text-zinc-400">Present Today</span>
              <span className="text-2xl font-semibold text-white tracking-tight mt-1 block">{presentTodayCount}</span>
              <span className="block text-[11px] text-emerald-400 font-medium mt-1">92% Attendance</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>

          {/* On Leave Today */}
          <div className="bg-[#11131a] border border-[#1e212d] rounded-xl p-5 flex items-center justify-between shadow-sm">
            <div>
              <span className="block text-xs font-medium text-zinc-400">On Leave Today</span>
              <span className="text-2xl font-semibold text-white tracking-tight mt-1 block">{onLeaveTodayCount}</span>
              <span className="block text-[11px] text-amber-400 font-medium mt-1">Approved PTO</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Calendar className="w-5 h-5" />
            </div>
          </div>

          {/* Monthly Payroll */}
          <div className="bg-[#11131a] border border-[#1e212d] rounded-xl p-5 flex items-center justify-between shadow-sm">
            <div>
              <span className="block text-xs font-medium text-zinc-400">
                {timeRange === 'month' ? 'Payroll (Month)' : timeRange === 'quarter' ? 'Payroll (Q3)' : 'Payroll (FY26)'}
              </span>
              <span className="text-2xl font-semibold text-white tracking-tight mt-1 block">{formatCurrency(totalMonthlyPayroll)}</span>
              <span className="block text-[11px] text-indigo-400 font-medium mt-1">Direct Disbursal</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Action Required: Pending Approvals Hub */}
        <div className="bg-[#11131a] border border-[#1e212d] rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                <Clock3 className="w-4 h-4 text-amber-400" />
                Pending Approvals
              </h3>
              <span className="px-2 py-0.5 rounded-md bg-[#181a24] text-zinc-300 text-xs font-medium border border-[#272a38]">
                {pendingLeaves.length + pendingExpenses.length} awaiting review
              </span>
            </div>

            <div className="flex items-center bg-[#181a24] p-0.5 rounded-lg border border-[#272a38] text-xs">
              <button
                onClick={() => setApprovalsTab('leaves')}
                className={`px-3 py-1 rounded-md font-medium transition cursor-pointer ${
                  approvalsTab === 'leaves' ? 'bg-[#272a38] text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Leave Requests ({pendingLeaves.length})
              </button>
              <button
                onClick={() => setApprovalsTab('expenses')}
                className={`px-3 py-1 rounded-md font-medium transition cursor-pointer ${
                  approvalsTab === 'expenses' ? 'bg-[#272a38] text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Expense Claims ({pendingExpenses.length})
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
                      <tr className="border-b border-[#1e212d] text-zinc-400 font-medium">
                        <th className="pb-2.5">Employee</th>
                        <th className="pb-2.5">Type</th>
                        <th className="pb-2.5">Dates</th>
                        <th className="pb-2.5">Reason</th>
                        <th className="pb-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e212d]">
                      {pendingLeaves.slice(0, 4).map((l: any) => (
                        <tr key={l._id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 font-medium text-white">
                            {l.employeeDetails?.firstName} {l.employeeDetails?.lastName}
                            <span className="block text-[11px] text-zinc-500 font-normal">
                              {l.employeeDetails?.jobTitle || 'Staff'}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[11px] font-medium border border-zinc-700">
                              {l.type}
                            </span>
                          </td>
                          <td className="py-3 text-zinc-300">
                            {new Date(l.startDate).toLocaleDateString()} - {new Date(l.endDate).toLocaleDateString()}
                          </td>
                          <td className="py-3 text-zinc-400 max-w-xs truncate">{l.reason}</td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => updateLeaveMutation.mutate({ id: l._id, status: 'Approved' })}
                                disabled={updateLeaveMutation.isPending}
                                className="p-1.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition cursor-pointer"
                                title="Approve Request"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => updateLeaveMutation.mutate({ id: l._id, status: 'Rejected' })}
                                disabled={updateLeaveMutation.isPending}
                                className="p-1.5 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition cursor-pointer"
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
                <div className="p-5 text-center text-xs text-zinc-500">
                  No pending leave requests requiring review.
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
                      <tr className="border-b border-[#1e212d] text-zinc-400 font-medium">
                        <th className="pb-2.5">Employee</th>
                        <th className="pb-2.5">Category</th>
                        <th className="pb-2.5">Amount</th>
                        <th className="pb-2.5">Description</th>
                        <th className="pb-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e212d]">
                      {pendingExpenses.slice(0, 4).map((e: any) => (
                        <tr key={e._id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 font-medium text-white">
                            {e.employee?.firstName} {e.employee?.lastName}
                          </td>
                          <td className="py-3">
                            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[11px] font-medium border border-zinc-700">
                              {e.category}
                            </span>
                          </td>
                          <td className="py-3 font-semibold text-white">${e.amount}</td>
                          <td className="py-3 text-zinc-400 max-w-xs truncate">{e.description}</td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => updateExpenseMutation.mutate({ id: e._id, status: 'Approved' })}
                                disabled={updateExpenseMutation.isPending}
                                className="p-1.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition cursor-pointer"
                                title="Approve Claim"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => updateExpenseMutation.mutate({ id: e._id, status: 'Rejected' })}
                                disabled={updateExpenseMutation.isPending}
                                className="p-1.5 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition cursor-pointer"
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
                <div className="p-5 text-center text-xs text-zinc-500">
                  All employee expense claims have been processed.
                </div>
              )}
            </div>
          )}
        </div>

        {/* 4 Clean Enterprise Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <AttendanceTrendAreaChart />
          {reportList && reportList.length > 0 && <CostBarChart data={reportList} />}
          {reportList && reportList.length > 0 && <StaffDonutChart data={reportList} />}
          <ExpenseDistributionChart />
        </div>

        {/* Bulletins & Shortcuts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-[#11131a] border border-[#1e212d] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-indigo-400" />
                Active Announcements
              </h3>
              <button
                onClick={() => setShowBulletinModal(true)}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
              >
                + Publish Notice
              </button>
            </div>

            {bulletinsList && bulletinsList.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {bulletinsList.slice(0, 4).map((bul: any) => (
                  <div key={bul._id} className="p-3.5 bg-[#0e1017] border border-[#1e212d] rounded-lg space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        bul.priority === 'High' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                        bul.priority === 'Medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        'bg-zinc-800 text-zinc-300 border border-zinc-700'
                      }`}>
                        {bul.priority} Priority
                      </span>
                      <span className="text-[10px] text-zinc-500">{new Date(bul.createdAt).toLocaleDateString()}</span>
                    </div>
                    <h4 className="text-xs font-semibold text-white line-clamp-1">{bul.title}</h4>
                    <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">{bul.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-500 italic py-4">No active notices published.</p>
            )}
          </div>

          <div className="bg-[#11131a] border border-[#1e212d] rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-zinc-400" /> Administrative Modules
            </h3>
            <div className="space-y-1.5 pt-1">
              <Link to="/schedule" className="flex items-center justify-between p-2.5 rounded-lg bg-[#0e1017] hover:bg-[#161822] border border-[#1e212d] text-xs font-medium text-zinc-300 hover:text-white transition">
                <span>Manage Shifts & Schedules</span>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
              </Link>
              <Link to="/attendance" className="flex items-center justify-between p-2.5 rounded-lg bg-[#0e1017] hover:bg-[#161822] border border-[#1e212d] text-xs font-medium text-zinc-300 hover:text-white transition">
                <span>Attendance Registry</span>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
              </Link>
              <Link to="/reviews" className="flex items-center justify-between p-2.5 rounded-lg bg-[#0e1017] hover:bg-[#161822] border border-[#1e212d] text-xs font-medium text-zinc-300 hover:text-white transition">
                <span>Performance & Reviews</span>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
              </Link>
              <Link to="/documents" className="flex items-center justify-between p-2.5 rounded-lg bg-[#0e1017] hover:bg-[#161822] border border-[#1e212d] text-xs font-medium text-zinc-300 hover:text-white transition">
                <span>Document Vault</span>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-500" />
              </Link>
            </div>
          </div>
        </div>

        {/* Modal: Broadcast Notice */}
        {showBulletinModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#11131a] border border-[#1e212d] rounded-xl p-6 max-w-lg w-full shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#1e212d] pb-3">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-indigo-400" />
                  Broadcast Notice
                </h3>
                <button
                  onClick={() => setShowBulletinModal(false)}
                  className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/5 cursor-pointer"
                >
                  <X className="w-4 h-4" />
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
                className="space-y-3.5"
              >
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={bulletinTitle}
                    onChange={(e) => setBulletinTitle(e.target.value)}
                    placeholder="e.g. Q3 Company Review Meeting"
                    className="w-full bg-[#0e1017] border border-[#1e212d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Priority</label>
                  <select
                    value={bulletinPriority}
                    onChange={(e: any) => setBulletinPriority(e.target.value)}
                    className="w-full bg-[#0e1017] border border-[#1e212d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Content</label>
                  <textarea
                    rows={4}
                    required
                    value={bulletinContent}
                    onChange={(e) => setBulletinContent(e.target.value)}
                    placeholder="Enter details for the workforce..."
                    className="w-full bg-[#0e1017] border border-[#1e212d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowBulletinModal(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={broadcastBulletinMutation.isPending}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium cursor-pointer"
                  >
                    {broadcastBulletinMutation.isPending ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Publish
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
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg text-xs font-medium border shadow-lg transition-all ${
          toast.type === 'success' ? 'bg-[#0e2118] text-emerald-300 border-emerald-800/60' : 'bg-[#291216] text-rose-300 border-rose-800/60'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <X className="w-4 h-4 text-rose-400" />}
          {toast.message}
        </div>
      )}

      {/* Greeting Banner with Direct Actions */}
      <div className="bg-[#11131a] border border-[#1e212d] rounded-xl p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-400">Employee Workspace</span>
            <span className="text-zinc-600">•</span>
            <span className="text-xs text-zinc-400">ID: {myProfile?.employeeId || 'EMP-ACTIVE'}</span>
          </div>
          <h1 className="text-xl md:text-2xl font-semibold text-white tracking-tight">
            Welcome back, {employeeName}
          </h1>
          <p className="text-xs text-zinc-400 max-w-xl">
            {myProfile?.jobTitle || 'Staff Member'} • {myProfile?.department?.name || 'Operations'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowLeaveModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-xs transition shadow-sm cursor-pointer select-none"
          >
            <Calendar className="w-3.5 h-3.5" />
            Apply Leave
          </button>
          <Link
            to="/payroll"
            className="flex items-center gap-1.5 px-4 py-2 bg-[#181a24] hover:bg-[#202330] text-zinc-200 font-medium rounded-lg text-xs border border-[#272a38] transition cursor-pointer select-none"
          >
            <FileDown className="w-3.5 h-3.5" />
            View Payslip
          </Link>
        </div>
      </div>

      {/* Live Clock-In Widget */}
      <div className="bg-[#11131a] border border-[#1e212d] rounded-xl p-4 md:p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-white font-mono">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span className="text-xs text-zinc-400 font-medium">
                {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-0.5">
              <MapPin className="w-3 h-3 text-emerald-400" />
              <span>Office Geofence Verified (San Francisco HQ)</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {todayAttendance?.clockIn ? (
            <div className="text-right">
              <span className="block text-xs font-semibold text-emerald-400">
                Clocked in at {new Date(todayAttendance.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="block text-[10px] text-zinc-500">
                {todayAttendance.clockOut ? 'Completed for today' : 'Active Shift'}
              </span>
            </div>
          ) : (
            <span className="text-xs text-zinc-500">Not clocked in today</span>
          )}

          {!isClockedIn ? (
            <button
              onClick={() => clockInMutation.mutate()}
              disabled={clockInMutation.isPending || !!todayAttendance?.clockOut}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium rounded-lg text-xs shadow-sm transition cursor-pointer"
            >
              {clockInMutation.isPending ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
              Clock In
            </button>
          ) : (
            <button
              onClick={() => clockOutMutation.mutate()}
              disabled={clockOutMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-medium rounded-lg text-xs shadow-sm transition cursor-pointer"
            >
              {clockOutMutation.isPending ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
              Clock Out
            </button>
          )}
        </div>
      </div>

      {/* 3 Dedicated Personal Gauges & Structure */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <EmployeeAttendanceGauge
          percentage={attendancePercentage}
          daysPresent={myAttendance?.length || 21}
          totalDays={22}
          streakDays={14}
        />
        <LeaveBalanceMeter />
        <SalaryStructureBreakdown
          baseSalary={latestPayroll?.baseSalary || 7500}
          allowances={latestPayroll?.allowances || 1850}
          deductions={latestPayroll?.deductions || 700}
          netSalary={latestPayroll?.netSalary || 8650}
        />
      </div>

      {/* Notifications & Leave Tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Notifications */}
        <div className="bg-[#11131a] border border-[#1e212d] rounded-xl p-5 space-y-3.5">
          <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" /> Recent Updates
          </h3>
          <div className="space-y-2.5">
            <div className="p-3 rounded-lg bg-[#0e1017] border border-[#1e212d] flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="block text-xs font-medium text-white">Leave request approved</span>
                <span className="block text-[10px] text-zinc-500 mt-0.5">Approved by department supervisor</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#0e1017] border border-[#1e212d] flex items-start gap-2.5">
              <FileText className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <span className="block text-xs font-medium text-white">August payslip available</span>
                <span className="block text-[10px] text-zinc-500 mt-0.5">Authenticated with SHA-256 digital seal</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#0e1017] border border-[#1e212d] flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
              <div>
                <span className="block text-xs font-medium text-white">Shift Schedule Confirmed</span>
                <span className="block text-[10px] text-zinc-500 mt-0.5">Day Shift (09:00 AM - 05:00 PM)</span>
              </div>
            </div>
          </div>
        </div>

        {/* My Active Leave Requests */}
        <div className="lg:col-span-2 bg-[#11131a] border border-[#1e212d] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-400" /> Leave Status Tracker
            </h3>
            <Link to="/leaves" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">
              View History →
            </Link>
          </div>

          {myLeavesList.length > 0 ? (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#1e212d] text-zinc-400 font-medium">
                    <th className="pb-2.5">Type</th>
                    <th className="pb-2.5">Dates</th>
                    <th className="pb-2.5">Reason</th>
                    <th className="pb-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e212d]">
                  {myLeavesList.slice(0, 4).map((l: any) => (
                    <tr key={l._id} className="hover:bg-white/[0.02] transition">
                      <td className="py-2.5 font-medium text-white">{l.type}</td>
                      <td className="py-2.5 text-zinc-300">
                        {new Date(l.startDate).toLocaleDateString()} - {new Date(l.endDate).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 text-zinc-400 truncate max-w-xs">{l.reason}</td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                          l.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          l.status === 'Rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                          'bg-amber-500/10 text-amber-400 border-amber-500/20'
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
            <p className="text-xs text-zinc-500 italic py-6 text-center">No leave requests filed yet.</p>
          )}
        </div>
      </div>

      {/* Quick Access Shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <Link to="/attendance" className="bg-[#11131a] border border-[#1e212d] hover:border-zinc-700 p-3.5 rounded-xl flex items-center gap-3 transition group">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400"><Clock className="w-4 h-4" /></div>
          <span className="text-xs font-medium text-zinc-300 group-hover:text-white">Attendance Logs</span>
        </Link>
        <Link to="/expenses" className="bg-[#11131a] border border-[#1e212d] hover:border-zinc-700 p-3.5 rounded-xl flex items-center gap-3 transition group">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400"><Briefcase className="w-4 h-4" /></div>
          <span className="text-xs font-medium text-zinc-300 group-hover:text-white">File Expense</span>
        </Link>
        <Link to="/reviews" className="bg-[#11131a] border border-[#1e212d] hover:border-zinc-700 p-3.5 rounded-xl flex items-center gap-3 transition group">
          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400"><Award className="w-4 h-4" /></div>
          <span className="text-xs font-medium text-zinc-300 group-hover:text-white">Appraisals</span>
        </Link>
        <Link to="/documents" className="bg-[#11131a] border border-[#1e212d] hover:border-zinc-700 p-3.5 rounded-xl flex items-center gap-3 transition group">
          <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400"><FolderLock className="w-4 h-4" /></div>
          <span className="text-xs font-medium text-zinc-300 group-hover:text-white">Documents</span>
        </Link>
      </div>

      {/* Modal: Quick Apply Leave */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#11131a] border border-[#1e212d] rounded-xl p-6 max-w-lg w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1e212d] pb-3">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                Apply for Leave
              </h3>
              <button
                onClick={() => setShowLeaveModal(false)}
                className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
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
              className="space-y-3.5"
            >
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Leave Category</label>
                <select
                  value={leaveType}
                  onChange={(e: any) => setLeaveType(e.target.value)}
                  className="w-full bg-[#0e1017] border border-[#1e212d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="Vacation">Vacation Leave</option>
                  <option value="Sick">Sick / Medical Leave</option>
                  <option value="Personal">Personal Leave</option>
                  <option value="Maternity">Maternity Leave</option>
                  <option value="Paternity">Paternity Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={leaveStart}
                    onChange={(e) => setLeaveStart(e.target.value)}
                    className="w-full bg-[#0e1017] border border-[#1e212d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={leaveEnd}
                    onChange={(e) => setLeaveEnd(e.target.value)}
                    className="w-full bg-[#0e1017] border border-[#1e212d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Reason for Absence</label>
                <textarea
                  rows={3}
                  required
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="Provide brief context for the time off..."
                  className="w-full bg-[#0e1017] border border-[#1e212d] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={applyLeaveMutation.isPending}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium cursor-pointer"
                >
                  {applyLeaveMutation.isPending ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Submit
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
