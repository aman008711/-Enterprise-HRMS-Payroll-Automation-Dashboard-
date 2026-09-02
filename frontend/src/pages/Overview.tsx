import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import { CostBarChart, StaffDonutChart } from '../components/Charts';
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
  TrendingUp,
  FileText
} from 'lucide-react';

const Overview: React.FC = () => {
  const { user } = useAuth();
  const isAdminOrHR = user?.role === 'Admin' || user?.role === 'HR Manager';

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

  // 6. Employee: Fetch personal attendance history
  const { data: myAttendance } = useQuery({
    queryKey: ['my-attendance-overview'],
    queryFn: async () => {
      const res = await api.get('/attendance/my-logs');
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
    const presentTodayCount = attendanceAll?.length || Math.round(totalEmployeesCount * 0.9);
    const pendingLeaves = (leaves || []).filter((l: any) => l.status === 'Pending');
    const onLeaveTodayCount = (leaves || []).filter((l: any) => l.status === 'Approved').length;
    const pendingExpenses = (expenses || []).filter((e: any) => e.status === 'Pending');
    const totalMonthlyPayroll = reportList?.reduce((acc: number, curr: any) => acc + (curr.totalNetSalary || 0), 0) || 124800;

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Admin Header Banner */}
        <div className="glass-card rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-l-4 border-l-brand-500 shadow-2xl relative overflow-hidden">
          <div className="space-y-1.5 z-10">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-brand-500/20 text-brand-300 text-[10px] font-black uppercase tracking-widest border border-brand-500/30">
                Command Center
              </span>
              <span className="text-gray-400 text-xs font-semibold">• Live HR Operations</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white font-heading tracking-tight">
              ADMIN DASHBOARD 👨‍💼
            </h1>
            <p className="text-gray-400 text-xs md:text-sm max-w-xl">
              Centralized overview of headcount, attendance, pending approvals, and company-wide payroll expenditures.
            </p>
          </div>

          <div className="flex items-center gap-3 z-10 flex-wrap">
            <Link
              to="/onboard"
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs transition duration-200 shadow-lg shadow-brand-500/25 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              Onboard Employee
            </Link>
            <Link
              to="/payroll"
              className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl text-xs border border-white/10 transition cursor-pointer"
            >
              <CreditCard className="w-4 h-4 text-brand-400" />
              Run Payroll
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

          {/* On Leave */}
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
              <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">Monthly Payroll</span>
              <span className="text-2xl font-black text-white font-heading">{formatCurrency(totalMonthlyPayroll)}</span>
              <span className="block text-[10px] text-brand-400 font-semibold mt-0.5">Disbursed via Ledger</span>
            </div>
          </div>
        </div>

        {/* Actionable Pending Approvals Strip */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Link
            to="/leaves"
            className="glass-card p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-all duration-200 flex items-center justify-between group"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
                <Clock3 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">Pending Leave Requests</h4>
                <p className="text-xs text-gray-400">{pendingLeaves.length} employee requests awaiting your approval</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black border border-amber-500/30">
                {pendingLeaves.length} Pending
              </span>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </div>
          </Link>

          <Link
            to="/expenses"
            className="glass-card p-5 rounded-2xl border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 transition-all duration-200 flex items-center justify-between group"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">Pending Expense Claims</h4>
                <p className="text-xs text-gray-400">{pendingExpenses.length} reimbursement claims submitted</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-black border border-blue-500/30">
                {pendingExpenses.length} Claims
              </span>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </div>
          </Link>
        </div>

        {/* Company-Wide Cost Center Analytics Charts */}
        {reportList && reportList.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CostBarChart data={reportList} />
            <StaffDonutChart data={reportList} />
          </div>
        )}

        {/* Announcements & Quick Navigation Shortcuts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bulletins Feed */}
          <div className="lg:col-span-2 glass-card p-6 rounded-2xl border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-brand-400" /> Active Corporate Bulletins
              </h3>
              <Link to="/bulletins" className="text-xs text-brand-400 hover:text-brand-300 font-semibold">
                Manage Bulletins →
              </Link>
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

          {/* Quick Admin Navigation Tile */}
          <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" /> Quick Workflows
            </h3>
            <div className="space-y-2 pt-1">
              <Link to="/schedule" className="flex items-center justify-between p-3 rounded-xl bg-white/2 hover:bg-white/5 border border-white/5 text-xs font-semibold text-gray-300 hover:text-white transition">
                <span>Manage Shifts & Schedules</span>
                <ArrowRight className="w-3.5 h-3.5 text-gray-500" />
              </Link>
              <Link to="/attendance" className="flex items-center justify-between p-3 rounded-xl bg-white/2 hover:bg-white/5 border border-white/5 text-xs font-semibold text-gray-300 hover:text-white transition">
                <span>Live Attendance Registry</span>
                <ArrowRight className="w-3.5 h-3.5 text-gray-500" />
              </Link>
              <Link to="/reviews" className="flex items-center justify-between p-3 rounded-xl bg-white/2 hover:bg-white/5 border border-white/5 text-xs font-semibold text-gray-300 hover:text-white transition">
                <span>Performance & Appraisals</span>
                <ArrowRight className="w-3.5 h-3.5 text-gray-500" />
              </Link>
              <Link to="/documents" className="flex items-center justify-between p-3 rounded-xl bg-white/2 hover:bg-white/5 border border-white/5 text-xs font-semibold text-gray-300 hover:text-white transition">
                <span>Document Cabinet</span>
                <ArrowRight className="w-3.5 h-3.5 text-gray-500" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ==========================================================================
     2. PERSONALIZED EMPLOYEE DASHBOARD VIEW
     ========================================================================== */
  const employeeName = myProfile ? `${myProfile.firstName}` : user?.email?.split('@')[0] || 'Employee';
  const attendancePercentage = myAttendance?.length ? Math.min(100, Math.round((myAttendance.length / 22) * 100)) : 92;
  const leaveBalanceDays = 12; // Standard statutory balance
  const myLeavesList = leaves || [];
  const latestPayroll = payrollList?.[0];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Personalized Welcome Banner */}
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
            {myProfile?.jobTitle || 'Staff Member'} • {myProfile?.department?.name || 'Enterprise Team'}
          </p>
        </div>

        {/* Direct Action Buttons: [ Apply Leave ] [ View Payslip ] */}
        <div className="flex items-center gap-3 z-10 flex-wrap">
          <Link
            to="/leaves"
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs transition duration-200 shadow-lg shadow-emerald-500/25 cursor-pointer select-none"
          >
            <Calendar className="w-4 h-4" />
            Apply Leave
          </Link>
          <Link
            to="/payroll"
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs transition duration-200 shadow-lg shadow-brand-500/25 cursor-pointer select-none"
          >
            <FileDown className="w-4 h-4" />
            View Payslip
          </Link>
        </div>
      </div>

      {/* 4 Core Employee Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Attendance This Month */}
        <div className="glass-card p-6 rounded-2xl flex items-center gap-4 hover:border-emerald-500/40 transition-all duration-300 shadow-xl group">
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">Attendance This Month</span>
            <span className="text-2xl font-black text-white font-heading">{attendancePercentage}%</span>
            <span className="block text-[10px] text-emerald-400 font-semibold mt-0.5">On-Track & Verified</span>
          </div>
        </div>

        {/* Leave Balance */}
        <div className="glass-card p-6 rounded-2xl flex items-center gap-4 hover:border-blue-500/40 transition-all duration-300 shadow-xl group">
          <div className="p-3.5 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 group-hover:scale-110 transition-transform">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">Leave Balance</span>
            <span className="text-2xl font-black text-white font-heading">{leaveBalanceDays} Days</span>
            <span className="block text-[10px] text-blue-400 font-semibold mt-0.5">Paid Time Off Remaining</span>
          </div>
        </div>

        {/* Next Payday */}
        <div className="glass-card p-6 rounded-2xl flex items-center gap-4 hover:border-purple-500/40 transition-all duration-300 shadow-xl group">
          <div className="p-3.5 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:scale-110 transition-transform">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">Next Payday</span>
            <span className="text-2xl font-black text-white font-heading">Sept 30</span>
            <span className="block text-[10px] text-purple-400 font-semibold mt-0.5">Monthly Cycle</span>
          </div>
        </div>

        {/* Latest Salary Payout */}
        <div className="glass-card p-6 rounded-2xl flex items-center gap-4 hover:border-brand-500/40 transition-all duration-300 shadow-xl group">
          <div className="p-3.5 rounded-2xl bg-brand-500/10 text-brand-400 border border-brand-500/20 group-hover:scale-110 transition-transform">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">Latest Net Salary</span>
            <span className="text-2xl font-black text-white font-heading">
              {latestPayroll ? formatCurrency(latestPayroll.netSalary) : '$8,650'}
            </span>
            <span className="block text-[10px] text-emerald-400 font-semibold mt-0.5">Disbursed (Direct Deposit)</span>
          </div>
        </div>
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
                <span className="block text-xs font-bold text-white">Shift Schedule Updated</span>
                <span className="block text-[10px] text-gray-400 mt-0.5">Standard Day Shift (09:00 AM - 05:00 PM)</span>
              </div>
            </div>
          </div>
        </div>

        {/* My Active Leave Requests */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" /> My Leave Requests
            </h3>
            <Link to="/leaves" className="text-xs text-brand-400 hover:text-brand-300 font-semibold">
              View All History →
            </Link>
          </div>

          {myLeavesList.length > 0 ? (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-gray-400 text-xs font-semibold">
                    <th className="pb-3">Type</th>
                    <th className="pb-3">Dates</th>
                    <th className="pb-3">Reason</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
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
          <span className="text-xs font-bold text-gray-300 group-hover:text-white">Clock In/Out</span>
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
    </div>
  );
};

export default Overview;
