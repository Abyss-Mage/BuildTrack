import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import ThemeToggle from '../ui/ThemeToggle';
import { Menu, PlusCircle, Bell, User } from 'lucide-react';

export function Navbar({ onOpenNewExpense }) {
  const { user } = useAuthStore();
  const { toggleSidebar } = useUiStore();

  const canCreateExpense = ['admin', 'project_manager', 'site_engineer'].includes(user?.role);

  return (
    <header className="sticky top-0 z-30 h-16 material-thin shadow-[0_1px_0_rgb(0_0_0/0.05)] px-4 lg:px-8 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          aria-label="Open navigation menu"
          className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 lg:hidden"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div>
          <h2 className="text-sm font-semibold tracking-tight text-slate-900 hidden sm:block">
            Construction Project Cost Control
          </h2>
          <p className="text-xs text-slate-500 hidden sm:block">
            Verified Site Expenses & Financial Tracking
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {canCreateExpense && onOpenNewExpense && (
          <button
            onClick={onOpenNewExpense}
            className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-brand-500 hover:bg-brand-400 text-slate-950 font-semibold text-xs sm:text-sm shadow-sm"
          >
            <PlusCircle className="w-4 h-4" aria-hidden="true" />
            <span>New Expense</span>
          </button>
        )}

        <ThemeToggle />

        <div className="h-8 w-px bg-slate-200 hidden sm:block" />

        <div className="flex items-center gap-2.5 pl-1">
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
            <User className="w-4 h-4" />
          </div>
          <div className="hidden md:block text-left">
            <span className="block text-xs font-semibold text-slate-800 leading-tight">
              {user?.name}
            </span>
            <span className="block text-[11px] text-slate-500 capitalize">
              {user?.role?.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
