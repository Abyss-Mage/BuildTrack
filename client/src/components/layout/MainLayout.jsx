import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { usePageMotion } from '../../hooks/usePageMotion';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import ToastNotification from '../ui/ToastNotification';
import ExpenseFormModal from '../../pages/ExpenseFormModal';

function PageTransition() {
  const scope = usePageMotion(':scope > * > *');
  return (
    <div ref={scope}>
      <Outlet />
    </div>
  );
}

export function MainLayout() {
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-amber-500 focus:text-slate-900 focus:font-semibold"
      >
        Skip to main content
      </a>
      {/* Sidebar navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Navbar onOpenNewExpense={() => setIsExpenseModalOpen(true)} />

        <main id="main-content" tabIndex={-1} className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto focus:outline-none">
          <PageTransition key={pathname} />
        </main>
      </div>

      {/* Global New Expense Modal */}
      {isExpenseModalOpen && (
        <ExpenseFormModal
          isOpen={isExpenseModalOpen}
          onClose={() => setIsExpenseModalOpen(false)}
          onSuccess={() => {
            setIsExpenseModalOpen(false);
            window.dispatchEvent(new CustomEvent('expense-added'));
          }}
        />
      )}

      {/* Global Toast */}
      <ToastNotification />
    </div>
  );
}

export default MainLayout;
