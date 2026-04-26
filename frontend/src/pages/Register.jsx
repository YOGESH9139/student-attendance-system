import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, AlertCircle } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form, setForm]   = useState({ name: '', rollNumber: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    if (form.password.length < 6)      { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        name: form.name, rollNumber: form.rollNumber, password: form.password
      });
      login(res.data.token, res.data.user);
      navigate('/student/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.msg || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">🛡️ SmartAttend</div>
        <h1 className="auth-title">Create account</h1>
        <p className="auth-sub">Register with your college roll number</p>

        {error && <div className="alert alert-error mb-4"><AlertCircle size={16} /> {error}</div>}

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input name="name" value={form.name} onChange={handle} className="form-input" placeholder="Your full name" required />
          </div>
          <div className="form-group">
            <label className="form-label">Roll Number</label>
            <input name="rollNumber" value={form.rollNumber} onChange={handle} className="form-input mono" placeholder="e.g. 24011P0501" required />
            <div className="form-hint">Must match your college roll number exactly</div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Password</label>
              <input name="password" type="password" value={form.password} onChange={handle} className="form-input" placeholder="Min 6 chars" required />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm</label>
              <input name="confirm" type="password" value={form.confirm} onChange={handle} className="form-input" placeholder="Repeat" required />
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-full mt-4" disabled={loading}>
            <UserPlus size={16} /> {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
