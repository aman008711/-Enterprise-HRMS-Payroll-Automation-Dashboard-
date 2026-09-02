import React, { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  Users,
  Calendar,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  User as UserIcon,
  ShieldAlert,
  Briefcase,
  Clock,
  Settings,
  Award,
  FolderLock,
  Megaphone,
  Inbox
} from 'lucide-react';

const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const handleLogout = () => {
    logout();
  };

  // Navigation schema with role permissions mapping
  const navLinks = [
    {
      name: 'Overview',
      path: '/',
      icon: LayoutDashboard,
      roles: ['Admin', 'HR Manager', 'Employee']
    },
    {
      name: 'Employees',
      path: '/employees',
      icon: Users,
      roles: ['Admin', 'HR Manager']
    },
    {
      name: 'Leave Requests',
      path: '/leaves',
      icon: Calendar,
      roles: ['Admin', 'HR Manager', 'Employee']
    },
    {
      name: 'Payroll & Costs',
      path: '/payroll',
      icon: CreditCard,
      roles: ['Admin', 'HR Manager', 'Employee']
    },
    {
      name: 'Expenses & Claims',
      path: '/expenses',
      icon: Briefcase,
      roles: ['Admin', 'HR Manager', 'Employee']
    },
    {
      name: 'Time & Attendance',
      path: '/attendance',
      icon: Clock,
      roles: ['Admin', 'HR Manager', 'Employee']
    },
    {
      name: 'Shift Planner',
      path: '/schedule',
      icon: Calendar,
      roles: ['Admin', 'HR Manager', 'Employee']
    },
    {
      name: 'Performance & Appraisals',
      path: '/reviews',
      icon: Award,
      roles: ['Admin', 'HR Manager', 'Employee']
    },
    {
      name: 'Document Cabinet',
      path: '/documents',
      icon: FolderLock,
      roles: ['Admin', 'HR Manager', 'Employee']
    },
    {
      name: 'Bulletins & News',
      path: '/bulletins',
      icon: Megaphone,
      roles: ['Admin', 'HR Manager', 'Employee']
    },
    {
      name: 'Grievance Box',
      path: '/grievances',
      icon: Inbox,
      roles: ['Admin', 'HR Manager', 'Employee']
    },
    {
      name: 'Offboarding',
      path: '/offboarding',
      icon: LogOut,
      roles: ['Admin', 'HR Manager', 'Employee']
    },
    {
      name: 'Audit Trail',
      path: '/audit-logs',
      icon: ShieldAlert,
      roles: ['Admin']
    },
    {
      name: 'System Settings',
      path: '/settings',
      icon: Settings,
      roles: ['Admin']
    }
  ];

  // Filter navigation links based on user role
  const filteredLinks = navLinks.filter(link => link.roles.includes(user?.role || ''));

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gradient-premium flex relative overflow-hidden custom-scrollbar">
      {/* Dynamic Ambient Background Glow Orbs */}
      <div className="absolute top-[-10%] right-[-5%] w-[55vw] h-[55vw] bg-brand-600/10 rounded-full blur-[150px] pointer-events-none animate-pulse-glow" />
      <div className="absolute bottom-[-15%] left-[-5%] w-[50vw] h-[50vw] bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none animate-pulse-glow" />
      <div className="absolute top-[40%] left-[25%] w-[35vw] h-[35vw] bg-purple-900/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Sidebar Navigation - Desktop View */}
      <aside className="hidden md:flex md:w-68 flex-col glass-panel shrink-0 z-20 shadow-2xl">
        {/* Brand Header */}
        <div className="h-20 flex items-center gap-3.5 px-6 border-b border-white/5 bg-white/2">
          <div className="relative flex items-center justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-brand-500/30 border border-white/20">
              <UserIcon className="w-5 h-5 text-white" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-white font-extrabold text-base tracking-tight font-heading">ENTERPRISE HRMS</span>
            </div>
            <span className="inline-block text-[9.5px] font-bold text-brand-300 tracking-wider uppercase bg-brand-500/10 px-2 py-0.5 rounded-full border border-brand-500/20 mt-0.5">
              Gateway v2.5
            </span>
          </div>
        </div>

        {/* Navigation Item Links */}
        <nav className="flex-1 px-3.5 py-5 space-y-1.5 overflow-y-auto custom-scrollbar">
          {filteredLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 group ${active
                    ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white shadow-lg shadow-brand-600/25 border border-white/20 translate-x-1'
                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent hover:translate-x-1'
                  }`}
              >
                <div className={`p-1.5 rounded-lg transition-colors ${active ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-400 group-hover:text-brand-300 group-hover:bg-brand-500/15'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="truncate">{link.name}</span>
                {active && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Card & Signout Footer */}
        <div className="p-4 border-t border-white/5 bg-slate-950/40 backdrop-blur">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-3 bg-white/3 border border-white/5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 border border-white/20 flex items-center justify-center text-white font-black text-sm shadow-md shadow-brand-500/20 shrink-0">
              {user?.email[0]?.toUpperCase()}
            </div>
            <div className="overflow-hidden flex-1">
              <span className="block text-xs font-bold text-white truncate">{user?.email}</span>
              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400 uppercase tracking-widest mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                {user?.role} Active
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-white/3 hover:bg-red-500/15 text-gray-400 hover:text-red-400 border border-white/5 hover:border-red-500/30 rounded-xl transition duration-200 text-xs font-semibold cursor-pointer select-none"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Sidebar Navigation - Mobile Drawer View */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex animate-fade-in">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={() => setMobileOpen(false)} />

          <aside className="relative flex w-72 max-w-xs flex-col bg-slate-950 border-r border-white/10 p-5 z-50 shadow-2xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-4 top-4 p-2 rounded-lg bg-white/5 border border-white/10 text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="h-14 flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white shadow-lg">
                <UserIcon className="w-5 h-5" />
              </div>
              <span className="text-white font-extrabold text-base">HRMS Portal</span>
            </div>

            <nav className="flex-1 space-y-1.5 overflow-y-auto custom-scrollbar">
              {filteredLinks.map((link) => {
                const Icon = link.icon;
                const active = isActive(link.path);
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition ${active
                        ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    {link.name}
                  </Link>
                );
              })}
            </nav>

            <div className="pt-4 border-t border-white/5">
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-3 bg-white/5 border border-white/10">
                <div className="w-9 h-9 rounded-xl bg-brand-500/20 flex items-center justify-center text-brand-300 font-bold text-sm shrink-0">
                  {user?.email[0]?.toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <span className="block text-xs font-bold text-white truncate">{user?.email}</span>
                  <span className="block text-[10px] font-bold text-brand-400 uppercase tracking-wider">{user?.role}</span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-red-950/20 hover:bg-red-600 text-red-400 hover:text-white rounded-xl transition duration-200 text-xs font-semibold cursor-pointer select-none"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main View Container */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10 overflow-x-hidden">
        {/* Header Navigation Bar */}
        <header className="h-20 flex items-center justify-between px-6 md:px-8 border-b border-white/5 glass-panel backdrop-blur-xl sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-white cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-xl md:text-2xl font-black text-white leading-none font-heading tracking-tight">
                {filteredLinks.find(link => isActive(link.path))?.name || 'Overview'}
              </h2>
              <p className="hidden sm:block text-[11px] text-gray-400 font-medium mt-1">
                Centralized HRMS Automation & Automated Payroll Gateway
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Live Security Verification Badge */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold select-none">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>AES-256 Protected • RBAC Enforced</span>
            </div>

            <div className="hidden md:flex flex-col text-right">
              <span className="text-[10px] text-brand-300 font-extrabold uppercase tracking-widest">{user?.role}</span>
              <span className="text-xs font-bold text-gray-200">{user?.email}</span>
            </div>

            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 border border-white/20 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-brand-500/20 select-none">
              {user?.email[0]?.toUpperCase()}
            </div>
          </div>
        </header>

        {/* Dynamic Page Body */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
