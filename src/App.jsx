import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { NotificationProvider } from './context/NotificationContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ProtectedRoute } from './components/common/ProtectedRoute';

// Layouts
import { AdminLayout } from './layouts/AdminLayout';
import { EmployeeLayout } from './layouts/EmployeeLayout';
import { CustomerLayout } from './layouts/CustomerLayout';

// Auth Pages
import { Login } from './pages/auth/Login';
import { SignUp } from './pages/auth/SignUp';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { ResetPassword } from './pages/auth/ResetPassword';

// Admin Pages
import { AdminOverview } from './pages/admin/AdminOverview';
import { EmployeeManagement } from './pages/admin/EmployeeManagement';
import { CustomerManagement } from './pages/admin/CustomerManagement';
import { EmployeeAssignments } from './pages/admin/EmployeeAssignments';
import { ShiftManagement } from './pages/admin/ShiftManagement';
import { AttendanceMonitoring } from './pages/admin/AttendanceMonitoring';
import { DailyReportsMonitoring } from './pages/admin/DailyReportsMonitoring';
import { FeedbackMonitoring } from './pages/admin/FeedbackMonitoring';
import { NotificationCenter as AdminNotifications } from './components/notifications/NotificationCenter';
import { AdminSettings } from './pages/admin/AdminSettings';

// Employee Pages
import { EmployeeOverview } from './pages/employee/EmployeeOverview';
import { HourlySurveillance } from './pages/employee/HourlySurveillance';
import { MyShifts } from './pages/employee/MyShifts';
import { EmployeeAttendance } from './pages/employee/EmployeeAttendance';
import { DailyReportForm } from './pages/employee/DailyReportForm';
import { ReportHistory } from './pages/employee/ReportHistory';
import { EmployeeFeedback } from './pages/employee/EmployeeFeedback';
import { NotificationCenter as EmployeeNotifications } from './components/notifications/NotificationCenter';
import { EmployeeProfile } from './pages/employee/EmployeeProfile';

// Customer Pages
import { CustomerOverview } from './pages/customer/CustomerOverview';
import { CustomerSurveillance } from './pages/customer/CustomerSurveillance';
import { CustomerAssignedEmployees } from './pages/customer/CustomerAssignedEmployees';
import { CustomerDailyReports } from './pages/customer/CustomerDailyReports';
import { CustomerShiftReports } from './pages/customer/CustomerShiftReports';
import { CustomerFeedback } from './pages/customer/CustomerFeedback';
import { NotificationCenter as CustomerNotifications } from './components/notifications/NotificationCenter';
import { NotificationPreferences as CustomerNotificationSettings } from './components/notifications/NotificationPreferences';
import { CustomerProfile } from './pages/customer/CustomerProfile';

// Root redirect helper
const RootRedirect = () => {
  const { isAuthenticated, role } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const roleLower = (role || '').toLowerCase();
  if (roleLower === 'admin') return <Navigate to="/admin" replace />;
  if (roleLower === 'employee') return <Navigate to="/employee" replace />;
  if (roleLower === 'customer') return <Navigate to="/customer" replace />;
  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <NotificationProvider>
          <BrowserRouter>
            <ErrorBoundary>
            <Routes>
              {/* Index & Auth Pages */}
              <Route path="/" element={<RootRedirect />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<SignUp />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Admin Protected Routes */}
              <Route element={<ProtectedRoute allowedRoles={['admin', 'ADMIN']} />}>
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminOverview />} />
                  <Route path="employees" element={<EmployeeManagement />} />
                  <Route path="customers" element={<CustomerManagement />} />
                  <Route path="assignments" element={<EmployeeAssignments />} />
                  <Route path="shifts" element={<ShiftManagement />} />
                  <Route path="attendance" element={<AttendanceMonitoring />} />
                  <Route path="reports" element={<DailyReportsMonitoring />} />
                  <Route path="feedback" element={<FeedbackMonitoring />} />
                  <Route path="notifications" element={<AdminNotifications />} />
                  <Route path="settings" element={<AdminSettings />} />
                  <Route path="profile" element={<AdminSettings />} />
                </Route>
              </Route>

              {/* Employee Protected Routes */}
              <Route element={<ProtectedRoute allowedRoles={['employee', 'EMPLOYEE']} />}>
                <Route path="/employee" element={<EmployeeLayout />}>
                  <Route index element={<EmployeeOverview />} />
                  <Route path="surveillance" element={<HourlySurveillance />} />
                  <Route path="shifts" element={<MyShifts />} />
                  <Route path="attendance" element={<EmployeeAttendance />} />
                  <Route path="daily-report" element={<DailyReportForm />} />
                  <Route path="history" element={<ReportHistory />} />
                  <Route path="feedback" element={<EmployeeFeedback />} />
                  <Route path="notifications" element={<EmployeeNotifications />} />
                  <Route path="profile" element={<EmployeeProfile />} />
                </Route>
              </Route>

              {/* Customer Protected Routes */}
              <Route element={<ProtectedRoute allowedRoles={['customer', 'CUSTOMER']} />}>
                <Route path="/customer" element={<CustomerLayout />}>
                  <Route index element={<CustomerOverview />} />
                  <Route path="surveillance" element={<CustomerSurveillance />} />
                  <Route path="employees" element={<CustomerAssignedEmployees />} />
                  <Route path="reports" element={<CustomerDailyReports />} />
                  <Route path="shift-reports" element={<CustomerShiftReports />} />
                  <Route path="feedback" element={<CustomerFeedback />} />
                  <Route path="notifications" element={<CustomerNotifications />} />
                  <Route path="settings" element={<CustomerNotificationSettings />} />
                  <Route path="profile" element={<CustomerProfile />} />
                </Route>
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<RootRedirect />} />
            </Routes>
            </ErrorBoundary>
          </BrowserRouter>
        </NotificationProvider>
      </AppProvider>
    </AuthProvider>
  );
}

export default App;
