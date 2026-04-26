import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();

  const adminLinks = [
    { to: '/admin/dashboard',     label: 'Dashboard' },
    { to: '/admin/sessions',      label: 'Sessions' },
    { to: '/admin/classes',       label: 'Classes' },
    { to: '/admin/face-approvals',label: 'Face Approvals' },
    { to: '/admin/attendance',    label: 'Attendance' },
  ];

  const studentLinks = [
    { to: '/student/dashboard', label: 'Dashboard' },
    { to: '/student/face-setup',label: 'Face ID' },
  ];

  const links = !user ? [] : user.role === 'admin' ? adminLinks : studentLinks;

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <ShieldCheck size={22} /> SmartAttend
        </Link>

        <div className="navbar-links">
          {links.map(l => (
            <Link key={l.to} to={l.to} className={`nav-link ${pathname === l.to ? 'active' : ''}`}>
              {l.label}
            </Link>
          ))}

          {!user ? (
            <>
              <Link to="/login"    className={`nav-link ${pathname === '/login'    ? 'active' : ''}`}>Login</Link>
              <Link to="/register" className={`nav-link ${pathname === '/register' ? 'active' : ''}`}>Register</Link>
            </>
          ) : (
            <div className="flex items-center gap-2" style={{ marginLeft: '.5rem' }}>
              {user.profilePicUrl
                ? <img src={user.profilePicUrl} alt="pic" className="nav-avatar" />
                : <div className="nav-avatar-placeholder">{user.name?.[0]?.toUpperCase() || '?'}</div>
              }
              <button className="btn-logout" onClick={logout}>
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
