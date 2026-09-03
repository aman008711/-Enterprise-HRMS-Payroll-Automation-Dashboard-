import React, { useState, useRef, useEffect } from 'react';
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
  ShieldAlert,
  Briefcase,
  Clock,
  Settings,
  Award,
  FolderLock,
  Megaphone,
  Inbox,
  Bell,
  UserPlus,
  FileText
} from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
}

interface NavGroup {
  category: string;
  items: NavItem[];
}

const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const handleLogout = () => {
    logout();
  };

  // Close notifications dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Categorized Navigation schema
  const navGroups: NavGroup[] = [
    {
      category: 'Workspace',
      items: [
        { name: 'Overview', path: '/', icon: LayoutDashboard, roles: ['Admin', 'HR Manager', 'Employee'] },
        { name: 'Document Cabinet', path: '/documents', icon: FolderLock, roles: ['Admin', 'HR Manager', 'Employee'] },
        { name: 'Bulletins & News', path: '/bulletins', icon: Megaphone, roles: ['Admin', 'HR Manager', 'Employee'] }
      ]
    },
    {
      category: 'Workforce',
      items: [
        { name: 'Employees', path: '/employees', icon: Users, roles: ['Admin', 'HR Manager'] },
        { name: 'Time & Attendance', path: '/attendance', icon: Clock, roles: ['Admin', 'HR Manager', 'Employee'] },
        { name: 'Leave Requests', path: '/leaves', icon: Calendar, roles: ['Admin', 'HR Manager', 'Employee'] },
        { name: 'Shift Planner', path: '/schedule', icon: Calendar, roles: ['Admin', 'HR Manager', 'Employee'] }
      ]
    },
    {
      category: 'Finance',
      items: [
        { name: 'Payroll & Costs', path: '/payroll', icon: CreditCard, roles: ['Admin', 'HR Manager', 'Employee'] },
        { name: 'Expenses & Claims', path: '/expenses', icon: Briefcase, roles: ['Admin', 'HR Manager', 'Employee'] }
      ]
    },
    {
      category: 'Organization',
      items: [
        { name: 'Performance Reviews', path: '/reviews', icon: Award, roles: ['Admin', 'HR Manager', 'Employee'] },
        { name: 'Grievance Box', path: '/grievances', icon: Inbox, roles: ['Admin', 'HR Manager', 'Employee'] },
        { name: 'Offboarding', path: '/offboarding', icon: LogOut, roles: ['Admin', 'HR Manager', 'Employee'] }
      ]
    },
    {
      category: 'Administration',
      items: [
        { name: 'Onboard Employee', path: '/onboard', icon: UserPlus, roles: ['Admin', 'HR Manager'] },
        { name: 'Audit Trail', path: '/audit-logs', icon: ShieldAlert, roles: ['Admin'] },
        { name: 'System Settings', path: '/settings', icon: Settings, roles: ['Admin'] }
      ]
    }
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  // Sample real-time notifications
  const notifications = [
    {
      id: 1,
      title: 'Leave request submitted',
      description: 'Alice Smith requested 3 days Vacation leave',
      time: '15m ago',
      icon: Calendar,
      unread: true
    },
    {
      id: 2,
      title: 'Payroll run processed',
      description: 'August monthly payroll certified with SHA-256 seal',
      time: '2h ago',
      icon: CreditCard,
      unread: true
    },
    {
      id: 3,
      title: 'New policy announcement',
      description: 'Updated travel reimbursement guidelines posted',
      time: '1d ago',
      icon: FileText,
      unread: false
    }
  ];

  return (
    <div className="min-h-screen bg-[#090a0f] flex relative overflow-hidden custom-scrollbar">
      {/* Sidebar Navigation - Desktop View */}
      <aside className="hidden md:flex md:w-64 flex-col bg-[#0c0e14] border-r border-[#1a1d27] shrink-0 z-20">
        {/* Brand Header */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-[#1a1d27]">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
            <Briefcase className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-white font-semibold text-sm tracking-tight">Enterprise HRMS</span>
            <span className="text-[10px] text-zinc-500 font-medium">Workforce Suite v2.5</span>
          </div>
        </div>

        {/* Categorized Navigation Item Links */}
        <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto custom-scrollbar">
          {navGroups.map((group) => {
            const visibleItems = group.items.filter(item => item.roles.includes(user?.role || ''));
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.category} className="space-y-1">
                <span className="block px-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                  {group.category}
                </span>
                <div className="space-y-0.5">
                  {visibleItems.map((link) => {
                    const Icon = link.icon;
                    const active = isActive(link.path);
                    return (
                      <Link
                        key={link.path}
                        to={link.path}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          active
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]'
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-zinc-400'}`} />
                        <span className="truncate">{link.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User Card & Signout Footer */}
        <div className="p-3.5 border-t border-[#1a1d27] bg-[#0c0e14]">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-2.5 bg-[#11131a] border border-[#1e212d]">
            <div className="w-8 h-8 rounded-md bg-indigo-950 text-indigo-300 border border-indigo-800/40 flex items-center justify-center font-bold text-xs shrink-0">
              {user?.email[0]?.toUpperCase()}
            </div>
            <div className="overflow-hidden flex-1">
              <span className="block text-xs font-medium text-white truncate">{user?.email}</span>
              <span className="block text-[10px] font-medium text-zinc-400 mt-0.5">
                {user?.role}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-1.5 px-3 bg-white/[0.03] hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400 border border-[#1e212d] hover:border-rose-500/20 rounded-lg transition text-xs font-medium cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Sidebar Navigation - Mobile Drawer View */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex animate-fade-in">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />

          <aside className="relative flex w-68 max-w-xs flex-col bg-[#0c0e14] border-r border-[#1a1d27] p-4 z-50 shadow-2xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg bg-white/5 border border-white/10 text-zinc-300 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="h-12 flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                <Briefcase className="w-4 h-4" />
              </div>
              <span className="text-white font-semibold text-sm">Enterprise HRMS</span>
            </div>

            <nav className="flex-1 space-y-3.5 overflow-y-auto custom-scrollbar">
              {navGroups.map((group) => {
                const visibleItems = group.items.filter(item => item.roles.includes(user?.role || ''));
                if (visibleItems.length === 0) return null;

                return (
                  <div key={group.category} className="space-y-1">
                    <span className="block px-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                      {group.category}
                    </span>
                    <div className="space-y-0.5">
                      {visibleItems.map((link) => {
                        const Icon = link.icon;
                        const active = isActive(link.path);
                        return (
                          <Link
                            key={link.path}
                            to={link.path}
                            onClick={() => setMobileOpen(false)}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
                              active
                                ? 'bg-indigo-600 text-white'
                                : 'text-zinc-400 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            {link.name}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </nav>

            <div className="pt-3 border-t border-[#1a1d27]">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-medium cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main View Container */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10 overflow-x-hidden">
        {/* Header Navigation Bar */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 md:px-8 border-b border-[#1a1d27] bg-[#0c0e14]/90 backdrop-blur sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-lg bg-white/5 border border-white/10 text-zinc-300 cursor-pointer"
              title="Open Navigation Menu"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div>
              <h2 className="text-sm sm:text-base md:text-lg font-semibold text-white leading-none">
                {navGroups.flatMap(g => g.items).find(link => isActive(link.path))?.name || 'Overview'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-5">
            {/* System Status Indicator */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>System Operational • RBAC Active</span>
            </div>

            {/* Notification Center */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 rounded-lg bg-[#181a24] hover:bg-[#202330] border border-[#272a38] text-zinc-300 hover:text-white transition cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center shadow-sm">
                  2
                </span>
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-88 bg-[#11131a] border border-[#1e212d] rounded-xl shadow-2xl p-3 z-50 space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-[#1e212d] px-1">
                    <span className="text-xs font-semibold text-white">Notifications</span>
                    <span className="text-[10px] text-indigo-400 font-medium cursor-pointer hover:underline">
                      Mark all as read
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar">
                    {notifications.map((n) => {
                      const Icon = n.icon;
                      return (
                        <div
                          key={n.id}
                          className={`p-2.5 rounded-lg border flex items-start gap-2.5 transition text-xs ${
                            n.unread
                              ? 'bg-[#161824] border-indigo-500/20'
                              : 'bg-[#0e1017] border-[#1e212d]'
                          }`}
                        >
                          <div className="p-1.5 rounded-md bg-indigo-500/10 text-indigo-400 shrink-0 mt-0.5">
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <span className="block font-medium text-white truncate">{n.title}</span>
                            <span className="block text-[11px] text-zinc-400 line-clamp-1">{n.description}</span>
                            <span className="block text-[9px] text-zinc-500 mt-1">{n.time}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Summary */}
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-medium text-zinc-200">{user?.email}</span>
              <span className="text-[10px] text-zinc-400">{user?.role}</span>
            </div>

            <div className="w-8 h-8 rounded-lg bg-[#181a24] border border-[#272a38] flex items-center justify-center text-white font-semibold text-xs select-none">
              {user?.email[0]?.toUpperCase()}
            </div>
          </div>
        </header>

        {/* Dynamic Page Body */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto custom-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
