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
  Briefcase
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
    <div className="min-h-screen bg-gradient-premium flex custom-scrollbar">
      {/* Background glow effects */}
      <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-brand-600/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] bg-brand-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Sidebar Navigation - Desktop View */}
      <aside className="hidden md:flex md:w-64 flex-col glass-panel shrink-0 z-20">
        <div className="h-16 flex items-center gap-3 px-6 border-b border-white/5">
          <div className="p-1.5 rounded-lg bg-brand-500/20 text-brand-400 border border-brand-500/30">
            <UserIcon className="w-5 h-5" />
          </div>
          <div>
            <span className="text-white font-bold text-lg tracking-tight">HRMS Portal</span>
            <span className="block text-[10px] text-brand-400 font-semibold tracking-wider uppercase leading-none mt-0.5">Enterprise v1.0</span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
          {filteredLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition duration-200 ${active
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20 border border-brand-500/40'
                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
              >
                <Icon className="w-5 h-5" />
                {link.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5 bg-white/1">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl mb-4">
            <div className="w-9 h-9 rounded-full bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 font-bold text-sm shrink-0">
              {user?.email[0]?.toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <span className="block text-sm font-bold text-white truncate">{user?.email}</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-400 uppercase tracking-wider mt-0.5">
                <ShieldAlert className="w-3 h-3 animate-pulse" />
                {user?.role}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-white/5 hover:bg-red-950/20 text-gray-400 hover:text-red-400 border border-white/5 hover:border-red-500/20 rounded-xl transition duration-200 text-sm font-semibold cursor-pointer select-none"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Sidebar Navigation - Mobile Drawer View */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setMobileOpen(false)} />

          <aside className="relative flex w-64 max-w-xs flex-col bg-slate-950 border-r border-white/10 p-5 z-50">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-4 top-4 p-2 rounded-lg bg-white/5 border border-white/10 text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="h-16 flex items-center gap-3 mb-6">
              <div className="p-1.5 rounded-lg bg-brand-500/20 text-brand-400 border border-brand-500/30">
                <UserIcon className="w-5 h-5" />
              </div>
              <span className="text-white font-bold text-lg">HRMS Portal</span>
            </div>

            <nav className="flex-1 space-y-2 overflow-y-auto custom-scrollbar">
              {filteredLinks.map((link) => {
                const Icon = link.icon;
                const active = isActive(link.path);
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${active
                        ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                  >
                    <Icon className="w-5 h-5" />
                    {link.name}
                  </Link>
                );
              })}
            </nav>

            <div className="pt-4 border-t border-white/5">
              <div className="flex items-center gap-3 px-3 py-2 rounded-xl mb-4 bg-white/5 border border-white/10">
                <div className="w-9 h-9 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-400 font-bold text-sm shrink-0">
                  {user?.email[0]?.toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <span className="block text-sm font-bold text-white truncate">{user?.email}</span>
                  <span className="block text-[10px] font-bold text-brand-400 uppercase tracking-wider mt-0.5">{user?.role}</span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-red-950/20 hover:bg-red-600 text-red-400 hover:text-white rounded-xl transition duration-200 text-sm font-semibold cursor-pointer select-none"
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
        {/* Header Navigation */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-white/5 glass-panel md:bg-transparent md:border-b-0 backdrop-blur-md md:backdrop-blur-none">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-lg bg-white/5 border border-white/10 text-white cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-extrabold text-white leading-none">
              {filteredLinks.find(link => isActive(link.path))?.name || 'Overview'}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-[10px] text-brand-400 font-bold uppercase tracking-wider">{user?.role}</span>
              <span className="text-sm font-bold text-white">{user?.email}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/25 flex items-center justify-center text-brand-400 font-bold shadow-md shadow-brand-500/5 select-none">
              {user?.email[0]?.toUpperCase()}
            </div>
          </div>
        </header>

        {/* Dynamic Nested Body */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
