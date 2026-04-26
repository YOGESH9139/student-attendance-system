import { ShieldCheck, Bluetooth, ScanFace, MapPin, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

const features = [
  { icon: Bluetooth, name: 'BLE Proximity',    desc: 'ESP32 beacon verifies you are physically inside the classroom in real-time.' },
  { icon: ScanFace,  name: 'Face Verification',desc: 'face-api.js matches your live camera feed against your enrolled face ID.' },
  { icon: MapPin,    name: 'GPS (Optional)',    desc: 'Optional second-layer GPS check ensures you are within the campus boundary.' },
  { icon: Clock,     name: 'Real-time Logging', desc: 'Attendance is timestamped and visible to your teacher instantly.' },
];

export default function Landing() {
  const { user } = useAuth();
  if (user) return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard'} replace />;

  return (
    <div className="landing-hero">
      <div className="hero-tag"><ShieldCheck size={16} /> Multi-Factor Attendance</div>
      <h1 className="hero-title">
        Smart Attendance<br /><span>CSE IDP</span>
      </h1>
      <p className="hero-sub">
        Secure, proxy-proof attendance using BLE proximity, face recognition, and real-time verification — built for your classroom.
      </p>
      <div className="hero-btns">
        <Link to="/login"    className="btn btn-primary btn-lg">Login</Link>
        <Link to="/register" className="btn btn-ghost btn-lg">Register</Link>
      </div>

      <div className="feature-grid">
        {features.map(f => (
          <div key={f.name} className="feature-card">
            <div className="feature-icon"><f.icon size={22} /></div>
            <div className="feature-name">{f.name}</div>
            <div className="feature-desc">{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
