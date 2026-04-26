import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, AlertCircle } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form, setForm]   = useState({ rollNumber: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await api.post('/auth/login', form);
      login(res.data.token, res.data.user);
      navigate(res.data.user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.msg || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">🛡️ SmartAttend</div>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-sub">Sign in with your roll number</p>

        {error && (
          <div className="alert alert-error mb-4">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Roll Number</label>
            <input
              name="rollNumber" value={form.rollNumber} onChange={handle}
              className="form-input mono" placeholder="e.g. 24011P0501 or ADMIN001"
              required autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              name="password" type="password" value={form.password} onChange={handle}
              className="form-input" placeholder="Your password"
              required
            />
            <div className="form-hint">Default password = your roll number (change after first login)</div>
          </div>
          <button type="submit" className="btn btn-primary btn-full mt-4" disabled={loading}>
            <LogIn size={16} /> {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          No account? <Link to="/register">Register here</Link>
        </div>
      </div>
    </div>
  );
}
