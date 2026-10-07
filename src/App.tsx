import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { RoleGuard } from './routes/RoleGuard';
import { PlatformGuard } from './routes/PlatformGuard';

// Public Pages
import { LandingPage } from './pages/public/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';

// Customer Pages & Layout
import { CustomerLayout } from './layouts/CustomerLayout';
import { CustomerDashboard } from './pages/customer/CustomerDashboard';
import { CustomerServicesPage } from './pages/customer/CustomerServicesPage';
import { CustomerBookingPage } from './pages/customer/CustomerBookingPage';
import { CustomerAppointmentsPage } from './pages/customer/CustomerAppointmentsPage';
import { CustomerProfilePage } from './pages/customer/CustomerProfilePage';
import { CustomerNotificationsPage } from './pages/customer/CustomerNotificationsPage';

// Barber Pages & Layout
import { BarberLayout } from './layouts/BarberLayout';
import { BarberDashboard } from './pages/barber/BarberDashboard';
import { BarberWalkInPage } from './pages/barber/BarberWalkInPage';
import { BarberSchedulePage } from './pages/barber/BarberSchedulePage';
import { BarberProfilePage } from './pages/barber/BarberProfilePage';
import { BarberNotificationsPage } from './pages/barber/BarberNotificationsPage';

// Admin Pages & Layout
import { AdminLayout } from './layouts/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminBarbersPage } from './pages/admin/AdminBarbersPage';
import { AdminServicesPage } from './pages/admin/AdminServicesPage';
import { AdminAppointmentsPage } from './pages/admin/AdminAppointmentsPage';
import { AdminSchedulePage } from './pages/admin/AdminSchedulePage';
import { AdminReportsPage } from './pages/admin/AdminReportsPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';

// Platform Super Admin Pages & Layout
import { PlatformLayout } from './layouts/PlatformLayout';
import { PlatformDashboard } from './pages/platform/PlatformDashboard';
import { BusinessesPage } from './pages/platform/BusinessesPage';
import { BusinessDetailsPage } from './pages/platform/BusinessDetailsPage';
import { PlatformUsersPage } from './pages/platform/PlatformUsersPage';
import { PlatformPlansPage } from './pages/platform/PlatformPlansPage';
import { PlatformAuditLogsPage } from './pages/platform/PlatformAuditLogsPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <TenantProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Platform Super Admin Routes */}
            <Route
              path="/platform"
              element={
                <ProtectedRoute>
                  <PlatformGuard>
                    <PlatformLayout />
                  </PlatformGuard>
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<PlatformDashboard />} />
              <Route path="businesses" element={<BusinessesPage />} />
              <Route path="businesses/:id" element={<BusinessDetailsPage />} />
              <Route path="users" element={<PlatformUsersPage />} />
              <Route path="plans" element={<PlatformPlansPage />} />
              <Route path="audit-logs" element={<PlatformAuditLogsPage />} />
              <Route path="logs" element={<Navigate to="/platform/audit-logs" replace />} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Route>

            {/* Super Admin Route Aliases */}
            <Route path="/super-admin" element={<Navigate to="/platform/dashboard" replace />} />
            <Route path="/super-admin/dashboard" element={<Navigate to="/platform/dashboard" replace />} />
            <Route path="/super-admin/tenants" element={<Navigate to="/platform/businesses" replace />} />
            <Route path="/super-admin/tenants/:id" element={<Navigate to="/platform/businesses/:id" replace />} />
            <Route path="/super-admin/*" element={<Navigate to="/platform/dashboard" replace />} />

            {/* Customer Routes */}
            <Route
              path="/customer"
              element={
                <ProtectedRoute>
                  <RoleGuard allowedRoles={['CUSTOMER']}>
                    <CustomerLayout />
                  </RoleGuard>
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<CustomerDashboard />} />
              <Route path="services" element={<CustomerServicesPage />} />
              <Route path="book" element={<CustomerBookingPage />} />
              <Route path="appointments" element={<CustomerAppointmentsPage />} />
              <Route path="profile" element={<CustomerProfilePage />} />
              <Route path="notifications" element={<CustomerNotificationsPage />} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Route>

            {/* Barber Routes */}
            <Route
              path="/barber"
              element={
                <ProtectedRoute>
                  <RoleGuard allowedRoles={['BARBER']}>
                    <BarberLayout />
                  </RoleGuard>
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<BarberDashboard />} />
              <Route path="walk-in" element={<BarberWalkInPage />} />
              <Route path="appointments" element={<BarberSchedulePage />} />
              <Route path="profile" element={<BarberProfilePage />} />
              <Route path="notifications" element={<BarberNotificationsPage />} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Route>

            {/* Admin / Shop Owner / Manager Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <RoleGuard allowedRoles={['SHOP_OWNER', 'MANAGER', 'ADMIN']}>
                    <AdminLayout />
                  </RoleGuard>
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="barbers" element={<AdminBarbersPage />} />
              <Route path="services" element={<AdminServicesPage />} />
              <Route path="appointments" element={<AdminAppointmentsPage />} />
              <Route path="schedule" element={<AdminSchedulePage />} />
              <Route path="reports" element={<AdminReportsPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Route>

            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </TenantProvider>
    </AuthProvider>
  );
};

export default App;
