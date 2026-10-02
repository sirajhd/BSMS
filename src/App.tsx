import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { RoleGuard } from './routes/RoleGuard';

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

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Customer Routes (Protected + Role Guard) */}
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

          {/* Barber Routes (Protected + Role Guard) */}
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

          {/* Admin Routes (Protected + Role Guard) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={['ADMIN']}>
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
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;