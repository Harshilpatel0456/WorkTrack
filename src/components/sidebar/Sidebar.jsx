import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarDays,
  Clock,
  UserCheck,
  FileText,
  MessageSquare,
  Bell,
  Settings,
  Briefcase,
  History,
  User,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Camera,
  Search,
  LogOut,
  Layers,
} from 'lucide-react';

export const Sidebar = ({ isOpen, onClose }) => {
  const { role, selectedEmployeeId, selectedCustomerId, logout } = useAuth();
  const { notifications, isSidebarCollapsed, toggleSidebarCollapse } = useApp();
  const [searchQuery, setSearchQuery] = useState('');

  // Role-specific nav links
  const adminLinks = [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/admin/employees', label: 'Employees', icon: Users },
    { to: '/admin/customers', label: 'Customers', icon: Building2 },
    { to: '/admin/assignments', label: 'Employee Assignments', icon: Briefcase },
    { to: '/admin/shifts', label: 'Shift Management', icon: Clock },
    { to: '/admin/attendance', label: 'Attendance', icon: UserCheck },
    { to: '/admin/reports', label: 'Daily Reports', icon: FileText },
    { to: '/admin/feedback', label: 'Feedback Monitoring', icon: MessageSquare },
    { to: '/admin/notifications', label: 'Notifications', icon: Bell, badgeCount: notifications.filter(n => n.targetRole === 'admin' && !n.isRead).length },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  const employeeLinks = [
    { to: '/employee', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/employee/surveillance', label: 'Hourly CCTV Audit', icon: Camera },
    { to: '/employee/shifts', label: 'My Shifts', icon: CalendarDays },
    { to: '/employee/attendance', label: 'Attendance', icon: Clock },
    { to: '/employee/daily-report', label: 'Daily Report', icon: FileText },
    { to: '/employee/history', label: 'Report History', icon: History },
    { to: '/employee/feedback', label: 'Feedback', icon: MessageSquare },
    { to: '/employee/notifications', label: 'Notifications', icon: Bell, badgeCount: notifications.filter(n => n.targetRole === 'employee' && n.targetEmployeeId === selectedEmployeeId && !n.isRead).length },
    { to: '/employee/profile', label: 'Profile', icon: User },
  ];

  const customerLinks = [
    { to: '/customer', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/customer/surveillance', label: 'CCTV Surveillance', icon: Camera },
    { to: '/customer/employees', label: 'Assigned Employees', icon: Users },
    { to: '/customer/reports', label: 'Daily Reports', icon: FileText },
    { to: '/customer/shift-reports', label: 'Shift-wise Reports', icon: Layers },
    { to: '/customer/feedback', label: 'Feedback & Comments', icon: MessageSquare },
    { to: '/customer/notifications', label: 'Notifications', icon: Bell, badgeCount: notifications.filter(n => n.targetRole === 'customer' && n.targetCustomerId === selectedCustomerId && !n.isRead).length },
    { to: '/customer/settings', label: 'Notification Settings', icon: Sliders },
    { to: '/customer/profile', label: 'Profile', icon: Building2 },
  ];

  const rawLinks = role === 'admin' ? adminLinks : (role === 'employee' ? employeeLinks : customerLinks);
  const links = searchQuery.trim()
    ? rawLinks.filter(item => item.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : rawLinks;

  const getRoleHeader = () => {
    if (role === 'admin') return { title: 'Admin Console', subtitle: 'Global Workforce Control' };
    if (role === 'employee') return { title: 'Employee Portal', subtitle: 'Shift & Report Self-Service' };
    return { title: 'Customer Portal', subtitle: 'Client Visibility & Handover' };
  };

  const roleMeta = getRoleHeader();

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 bg-white border-r border-slate-200/80 flex flex-col transition-all duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${
          isSidebarCollapsed ? 'w-64 lg:w-20' : 'w-64'
        }`}
      >
        {/* Protruding Chevron Toggle Button (Floating on the right border - CodingLab style) */}
        <button
          onClick={toggleSidebarCollapse}
          aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden lg:flex absolute -right-3.5 top-6 w-7 h-7 rounded-full bg-[#245CE2] hover:bg-blue-700 text-white items-center justify-center shadow-md active:scale-90 transition-all duration-200 z-50 cursor-pointer border-2 border-white"
        >
          {isSidebarCollapsed ? (
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          ) : (
            <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
          )}
        </button>

        {/* Brand Header */}
        <div className={`h-16 border-b border-slate-100 flex items-center px-4 transition-all duration-300 ${
          isSidebarCollapsed ? 'lg:justify-center' : 'justify-between'
        }`}>
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-[#245CE2] flex items-center justify-center text-white shadow-sm font-black text-lg flex-shrink-0">
              W
            </div>
            <div className={`transition-opacity duration-200 ${
              isSidebarCollapsed ? 'block lg:hidden' : 'block'
            }`}>
              <div className="font-extrabold text-slate-900 text-lg tracking-tight leading-none whitespace-nowrap">
                Work<span className="text-[#245CE2]">Track</span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium leading-none mt-1 whitespace-nowrap">
                Enterprise Workforce
              </p>
            </div>
          </div>
        </div>

        {/* Search Bar (Expandable or Icon-only when collapsed) */}
        <div className="px-3 pt-3">
          {isSidebarCollapsed ? (
            <>
              {/* Desktop Collapsed Search Button */}
              <div className="hidden lg:flex justify-center">
                <button
                  onClick={toggleSidebarCollapse}
                  className="w-10 h-10 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors group relative"
                  title="Search (Expand to search)"
                >
                  <Search className="w-4 h-4" />
                  <div className="hidden group-hover:flex items-center absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-xs font-semibold rounded-lg whitespace-nowrap shadow-xl z-50 pointer-events-none">
                    Search menu
                  </div>
                </button>
              </div>

              {/* Mobile Drawer Search (Full input) */}
              <div className="relative flex lg:hidden items-center">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search navigation..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#245CE2] focus:bg-white transition-all"
                />
              </div>
            </>
          ) : (
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search navigation..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#245CE2] focus:bg-white transition-all"
              />
            </div>
          )}
        </div>

        {/* Workspace Indicator Card */}
        {isSidebarCollapsed ? (
          <>
            {/* Desktop Collapsed Workspace Dot */}
            <div
              className="hidden lg:flex mx-auto mt-2 w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 items-center justify-center group relative cursor-default"
              title={`${roleMeta.title} • ${roleMeta.subtitle}`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <div className="hidden group-hover:flex flex-col absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs rounded-lg whitespace-nowrap shadow-xl z-50 pointer-events-none">
                <span className="font-bold text-white">{roleMeta.title}</span>
                <span className="text-[10px] text-slate-300">{roleMeta.subtitle}</span>
              </div>
            </div>

            {/* Mobile Drawer Workspace Card */}
            <div className="lg:hidden p-3 mx-3 mt-2 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  Current Workspace
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              <div className="text-xs font-bold text-slate-800 mt-1 truncate">
                {roleMeta.title}
              </div>
              <div className="text-[11px] text-slate-500 truncate">
                {roleMeta.subtitle}
              </div>
            </div>
          </>
        ) : (
          <div className="p-3 mx-3 mt-2 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                Current Workspace
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <div className="text-xs font-bold text-slate-800 mt-1 truncate">
              {roleMeta.title}
            </div>
            <div className="text-[11px] text-slate-500 truncate">
              {roleMeta.subtitle}
            </div>
          </div>
        )}

        {/* Navigation items */}
        <div className="flex-1 px-2.5 py-3 overflow-y-auto space-y-1 overflow-x-hidden">
          {links.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onClose}
                title={isSidebarCollapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `group relative flex items-center rounded-xl text-xs font-semibold transition-all duration-150 ${
                    isSidebarCollapsed
                      ? 'px-3 py-2.5 lg:justify-center'
                      : 'px-3 py-2.5 justify-between'
                  } ${
                    isActive
                      ? 'bg-[#245CE2] text-white shadow-sm shadow-blue-500/20'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className={`flex items-center gap-3 ${isSidebarCollapsed ? 'lg:justify-center' : ''}`}>
                      <div className="relative flex items-center justify-center">
                        <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
                        {/* Collapsed Badge Dot / Count */}
                        {isSidebarCollapsed && item.badgeCount > 0 && (
                          <span className="hidden lg:flex absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-extrabold w-3.5 h-3.5 rounded-full items-center justify-center shadow-xs">
                            {item.badgeCount > 9 ? '9+' : item.badgeCount}
                          </span>
                        )}
                      </div>
                      <span className={`whitespace-nowrap transition-opacity duration-200 ${
                        isSidebarCollapsed ? 'block lg:hidden' : 'block'
                      }`}>
                        {item.label}
                      </span>
                    </div>

                    {/* Expanded Badge Count */}
                    {item.badgeCount > 0 && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                          isSidebarCollapsed ? 'block lg:hidden' : 'block'
                        } ${
                          isActive
                            ? 'bg-white text-[#245CE2]'
                            : 'bg-[#245CE2] text-white'
                        }`}
                      >
                        {item.badgeCount}
                      </span>
                    )}

                    {/* Floating Flyout Tooltip when Collapsed on Desktop */}
                    {isSidebarCollapsed && (
                      <div className="hidden group-hover:lg:flex items-center gap-2 absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg whitespace-nowrap shadow-xl z-50 pointer-events-none animate-in fade-in slide-in-from-left-1 duration-150">
                        <span>{item.label}</span>
                        {item.badgeCount > 0 && (
                          <span className="bg-[#245CE2] text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                            {item.badgeCount}
                          </span>
                        )}
                      </div>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Footer actions: Logout + SaaS Info */}
        <div className="p-3 border-t border-slate-100 flex flex-col gap-2">
          {/* Logout Button */}
          <button
            onClick={logout}
            className={`group relative flex items-center rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors ${
              isSidebarCollapsed
                ? 'px-3 py-2.5 lg:justify-center'
                : 'px-3 py-2.5 gap-3'
            }`}
            title="Log out of system"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <span className={`whitespace-nowrap ${isSidebarCollapsed ? 'block lg:hidden' : 'block'}`}>
              Logout
            </span>
            {isSidebarCollapsed && (
              <div className="hidden group-hover:lg:block absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg whitespace-nowrap shadow-xl z-50 pointer-events-none">
                Logout
              </div>
            )}
          </button>

          {/* Footer Branding Info */}
          {isSidebarCollapsed ? (
            <>
              {/* Desktop Collapsed Footer Icon */}
              <div
                className="hidden lg:flex justify-center py-1 group relative cursor-default text-slate-400 hover:text-[#245CE2] transition-colors"
                title="WorkTrack v1.0 • SaaS Production Ready"
              >
                <Sparkles className="w-4 h-4" />
                <div className="hidden group-hover:flex flex-col absolute left-full ml-3 px-3 py-1.5 bg-slate-900 text-white text-[11px] rounded-lg whitespace-nowrap shadow-xl z-50 pointer-events-none">
                  <span className="font-bold text-white">WorkTrack v1.0</span>
                  <span className="text-[10px] text-slate-300">SaaS Production Ready</span>
                </div>
              </div>

              {/* Mobile Drawer Footer Info */}
              <div className="lg:hidden text-slate-400 text-[11px] px-1">
                <div className="flex items-center gap-2 font-medium text-slate-500">
                  <Sparkles className="w-3.5 h-3.5 text-[#245CE2]" />
                  <span>v1.0 • SaaS Production Ready</span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-slate-400 text-[11px] px-1">
              <div className="flex items-center gap-2 font-medium text-slate-500">
                <Sparkles className="w-3.5 h-3.5 text-[#245CE2]" />
                <span>v1.0 • SaaS Production Ready</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Faculty Evaluation Prototype
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
