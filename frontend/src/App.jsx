import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/student/StudentDashboard';
import FaceSetup from './pages/student/FaceSetup';
import MarkAttendance from './pages/student/MarkAttendance';
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageClasses from './pages/admin/ManageClasses';
import ManageSessions from './pages/admin/ManageSessions';
import FaceApprovals from './pages/admin/FaceApprovals';
import AttendanceView from './pages/admin/AttendanceView';

function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="app-main">
        <Routes>
          <Route path="/"        element={<Landing />} />
          <Route path="/login"   element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Student Routes */}
          <Route path="/student/dashboard" element={
            <ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>
          } />
          <Route path="/student/face-setup" element={
            <ProtectedRoute role="student"><FaceSetup /></ProtectedRoute>
          } />
          <Route path="/student/mark/:sessionId" element={
            <ProtectedRoute role="student"><MarkAttendance /></ProtectedRoute>
          } />

          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={
            <ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>
          } />
          <Route path="/admin/classes" element={
            <ProtectedRoute role="admin"><ManageClasses /></ProtectedRoute>
          } />
          <Route path="/admin/sessions" element={
            <ProtectedRoute role="admin"><ManageSessions /></ProtectedRoute>
          } />
          <Route path="/admin/face-approvals" element={
            <ProtectedRoute role="admin"><FaceApprovals /></ProtectedRoute>
          } />
          <Route path="/admin/attendance" element={
            <ProtectedRoute role="admin"><AttendanceView /></ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
