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
import Reports from './pages/Reports';
import Users from './pages/Users';
import Categories from './pages/Categories';

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
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/expenses" element={<Expenses />} />

          {/* Approvals: PM, Accountant, Admin */}
          <Route
            path="/approvals"
            element={
              <ProtectedRoute allowedRoles={['admin', 'project_manager', 'accountant']}>
                <Approvals />
              </ProtectedRoute>
            }
          />

          {/* Reports: PM, Accountant, Admin */}
          <Route
            path="/reports"
            element={
              <ProtectedRoute allowedRoles={['admin', 'project_manager', 'accountant']}>
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

          {/* Category Management: Admin only */}
          <Route
            path="/categories"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Categories />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
