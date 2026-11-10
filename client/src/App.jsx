import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// Layout
import MainLayout from './components/layout/MainLayout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Expenses from './pages/Expenses';
import Approvals from './pages/Approvals';
import Accounts from './pages/Accounts';
import Reports from './pages/Reports';
import Users from './pages/Users';
import AuditLogs from './pages/AuditLogs';
import Categories from './pages/Categories';
import Settings from './pages/Settings';
import Advances from './pages/Advances';
import PurchaseRequisitions from './pages/PurchaseRequisitions';
import WageSheets from './pages/WageSheets';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, token } = useAuthStore();

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

// Site In-Charges have no dashboard; their home is Expenses
function Home() {
  const { user } = useAuthStore();
  return user?.role === 'site_in_charge' ? <Navigate to="/expenses" replace /> : <Dashboard />;
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Protected Dashboard and Modules */}
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Home />} />
          <Route
            path="/projects"
            element={
              <ProtectedRoute allowedRoles={['admin', 'accountant']}>
                <Projects />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:id"
            element={
              <ProtectedRoute allowedRoles={['admin', 'accountant']}>
                <ProjectDetail />
              </ProtectedRoute>
            }
          />
          <Route path="/expenses" element={<Expenses />} />

          {/* Approvals: Accountant, Admin */}
          <Route
            path="/approvals"
            element={
              <ProtectedRoute allowedRoles={['admin', 'accountant']}>
                <Approvals />
              </ProtectedRoute>
            }
          />

          {/* Accounts & Payouts: Accountant, Admin */}
          <Route
            path="/accounts"
            element={
              <ProtectedRoute allowedRoles={['admin', 'accountant']}>
                <Accounts />
              </ProtectedRoute>
            }
          />

          <Route path="/advances" element={<Advances />} />
          <Route path="/purchase-requisitions" element={<PurchaseRequisitions />} />

          <Route
            path="/wage-sheets"
            element={
              <ProtectedRoute allowedRoles={['admin', 'accountant']}>
                <WageSheets />
              </ProtectedRoute>
            }
          />

          {/* Reports: Accountant, Admin */}
          <Route
            path="/reports"
            element={
              <ProtectedRoute allowedRoles={['admin', 'accountant']}>
                <Reports />
              </ProtectedRoute>
            }
          />

          {/* User Management: Admin only */}
          <Route
            path="/users"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Users />
              </ProtectedRoute>
            }
          />

          {/* Full Audit Logs: Strictly Super Admin Only */}
          <Route
            path="/audit-logs"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AuditLogs />
              </ProtectedRoute>
            }
          />

          {/* Category Management: Admin only */}
          <Route
            path="/categories"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Categories />
              </ProtectedRoute>
            }
          />

          {/* Personal Settings & Password Reset: All authenticated users */}
          <Route path="/settings" element={<Settings />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
