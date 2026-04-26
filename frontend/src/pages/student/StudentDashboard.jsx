import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ScanFace, CheckCircle2, XCircle, Clock, Bluetooth } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/sessions/my'),
      api.get('/attendance/my'),
      api.get('/attendance/my-stats')
    ]).then(([s, h, st]) => {
      const attendedSessionIds = new Set(h.data.map(record => record.session?._id || record.session));
      const activeUnmarkedSessions = s.data.filter(session => !attendedSessionIds.has(session._id));

      setSessions(activeUnmarkedSessions);
      setHistory(h.data);
      setStats(st.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  const faceStatusBadge = () => {
    const map = { none: ['badge-gray', 'No Face ID'], pending: ['badge-amber', 'Pending Approval'], approved: ['badge-green', 'Face ID Active'], rejected: ['badge-red', 'Rejected — Re-enroll'] };
    const [cls, label] = map[user?.faceStatus] || map.none;
    return <span className={`badge ${cls}`}>{label}</span>;
  };

  return (
    <div className="page">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        {user?.profilePicUrl
          ? <img src={user.profilePicUrl} alt="pic" className="profile-pic-lg" />
          : <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 800, color: '#1d4ed8' }}>{user?.name?.[0]}</div>
        }
        <div>
          <div className="page-title" style={{ marginBottom: 0 }}>Hi, {user?.name?.split(' ')[0]} 👋</div>
          <div className="text-muted text-sm">{user?.rollNumber} · {user?.classGroup?.name || 'No class assigned'}</div>
          <div className="mt-2 flex gap-2 items-center">
            {faceStatusBadge()}
            {user?.faceStatus !== 'approved' && (
              <Link to="/student/face-setup" className="btn btn-primary btn-sm">
                <ScanFace size={14} /> {user?.faceStatus === 'none' ? 'Setup Face ID' : 'Re-enroll'}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Stats Section */}
      {stats && (
        <div className="mb-6">
          <div className="section-title">Attendance Overview</div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '1rem' }}>
            <div className="card" style={{ padding: '1rem', textAlign: 'center', background: 'var(--primary-light)', border: 'none' }}>
              <div className="text-2xl font-bold text-primary">{stats.overall.percentage}%</div>
              <div className="text-xs text-muted mt-1">Overall ({stats.overall.attended}/{stats.overall.total})</div>
            </div>
            {stats.subjects.map(s => (
              <div key={s.code} className="card" style={{ padding: '1rem', textAlign: 'center' }}>
                <div className="text-xl font-bold" style={{ color: s.percentage >= 75 ? 'var(--success)' : s.percentage >= 60 ? 'var(--warning)' : 'var(--danger)' }}>
                  {s.percentage}%
                </div>
                <div className="text-xs font-bold mt-1">{s.name}</div>
                <div className="text-xs text-muted">{s.attended}/{s.total}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Sessions */}
      <div className="section-title">
        <span className="ble-pulse green" style={{ display: 'inline-block' }} /> Active Sessions Today
      </div>

      {sessions.length === 0 ? (
        <div className="card empty-state mb-6">
          <Bluetooth size={36} />
          <p>No active sessions right now for your class.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
          {sessions.map(s => (
            <div key={s._id} className="session-card">
              <div className="session-info">
                <div className="session-subject">{s.subject?.name}</div>
                <div className="session-meta">
                  {s.subject?.code} · Room: {s.room} · {s.classGroup?.name}
                  <br />Ends: {new Date(s.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              {user?.faceStatus === 'approved' ? (
                <Link to={`/student/mark/${s._id}`} className="btn btn-primary btn-sm">
                  <Bluetooth size={14} /> Mark Present
                </Link>
              ) : (
                <span className="badge badge-amber">Setup Face ID First</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* History */}
      <div className="section-title">My Attendance History</div>
      {history.length === 0 ? (
        <div className="card empty-state">
          <Clock size={36} />
          <p>No attendance records yet.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Date & Time</th>
                <th>BLE</th>
                <th>Face</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map(r => (
                <tr key={r._id}>
                  <td>
                    <div className="font-bold">{r.session?.subject?.name}</div>
                    <div className="text-xs text-muted">{r.session?.subject?.code}</div>
                  </td>
                  <td className="text-sm">{new Date(r.timestamp).toLocaleString()}</td>
                  <td>{r.bleVerified ? <CheckCircle2 size={16} color="var(--success)" /> : <XCircle size={16} color="var(--danger)" />}</td>
                  <td>{r.faceVerified ? <CheckCircle2 size={16} color="var(--success)" /> : <XCircle size={16} color="var(--danger)" />}</td>
                  <td><span className="badge badge-green">{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
