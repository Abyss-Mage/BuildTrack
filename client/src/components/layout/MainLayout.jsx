import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import ToastNotification from '../ui/ToastNotification';
import ExpenseFormModal from '../../pages/ExpenseFormModal';

export function MainLayout() {
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Navbar onOpenNewExpense={() => setIsExpenseModalOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
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
