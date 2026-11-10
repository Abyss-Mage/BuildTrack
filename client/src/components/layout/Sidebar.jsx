import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import {
  LayoutDashboard,
  Building2,
  Receipt,
  CheckSquare,
  BarChart3,
  Users,
  Tags,
  HardHat,
  X,
  LogOut,
  Landmark,
  Banknote,
  ShieldAlert,
  Settings as SettingsIcon,
  Wallet,
  ClipboardList,
  FileSpreadsheet,
} from 'lucide-react';

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const { sidebarOpen, setSidebarOpen } = useUiStore();

  const isRole = (roles) => roles.includes(user?.role);

  const navItems = [
    { name: 'Dashboard', to: '/', icon: LayoutDashboard, roles: ['admin', 'site_in_charge', 'accountant'] },
    { name: 'Projects', to: '/projects', icon: Building2, roles: ['admin', 'site_in_charge', 'accountant'] },
    { name: 'Expenses', to: '/expenses', icon: Receipt, roles: ['admin', 'site_in_charge', 'accountant'] },
    { name: 'Advances', to: '/advances', icon: Wallet, roles: ['admin', 'site_in_charge', 'accountant'] },
    { name: 'Purchase Requisitions', to: '/purchase-requisitions', icon: ClipboardList, roles: ['admin', 'site_in_charge', 'accountant'] },
    { name: 'Approvals', to: '/approvals', icon: CheckSquare, roles: ['admin', 'accountant'] },
    { name: 'Accounts & Payouts', to: '/accounts', icon: Landmark, roles: ['admin', 'accountant'] },
    { name: 'Payroll & Wages', to: '/payroll', icon: Banknote, roles: ['admin', 'accountant'] },
    { name: 'Wage Sheets (Excel)', to: '/wage-sheets', icon: FileSpreadsheet, roles: ['admin', 'accountant'] },
    { name: 'Reports & P&L', to: '/reports', icon: BarChart3, roles: ['admin', 'accountant'] },
    { name: 'Team Users', to: '/users', icon: Users, roles: ['admin'] },
    { name: 'Audit Logs', to: '/audit-logs', icon: ShieldAlert, roles: ['admin'] },
    { name: 'Categories', to: '/categories', icon: Tags, roles: ['admin'] },
    { name: 'Account Settings', to: '/settings', icon: SettingsIcon, roles: ['admin', 'site_in_charge', 'accountant'] },
  ];

  const visibleItems = navItems.filter((item) => isRole(item.roles));

  return (
    <>
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-scrim-in lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 theme-light material-dark text-slate-300 flex flex-col border-r border-white/5 transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-6 h-16 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-brand-500 text-slate-950 flex items-center justify-center font-bold shadow-md shadow-brand-500/20">
              <HardHat className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <span className="font-bold text-white text-base tracking-tight leading-none block">
                BUILD<span className="text-brand-400">TRACK</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block mt-0.5">
                Expense Portal
              </span>
            </div>
          </div>

          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation menu"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current User Card */}
        <div className="px-4 py-3 border-b border-white/5">
          <NavLink
            to="/settings"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-full bg-brand-500/20 text-brand-400 border border-brand-500/30 flex items-center justify-center font-bold text-xs uppercase">
              {user?.name?.slice(0, 2) || 'US'}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-semibold text-white truncate group-hover:text-brand-300 transition-colors">
                {user?.name}
              </p>
              <p className="text-[10px] text-brand-400 font-medium capitalize truncate">
                {user?.role?.replace(/_/g, ' ')}
              </p>
            </div>
            <SettingsIcon className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300" />
          </NavLink>
        </div>

        {/* Navigation Links */}
        <nav aria-label="Main navigation" className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2 rounded-xl text-[13px] font-medium ${
                    isActive
                      ? 'bg-brand-500 text-slate-950 font-semibold shadow-[0_1px_2px_rgb(0_0_0/0.3),inset_0_1px_0_rgb(255_255_255/0.25)]'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`
                }
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Footer / Logout */}
        <div className="p-3 border-t border-white/5">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
