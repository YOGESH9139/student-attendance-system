import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Bluetooth, ScanFace, CheckSquare, Plus, ArrowRight } from 'lucide-react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

export default function AdminDashboard() {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const [stats,     setStats]     = useState({ totalStudents:0, activeSessions:0, today:0, pendingFace:0 });
  const [recentAtt, setRecentAtt] = useState([]);
  const [sessions,  setSessions]  = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/users/students'),
      api.get('/sessions/active'),
      api.get('/attendance/stats'),
      api.get('/users/face-approvals'),
      api.get('/attendance/all'),
    ]).then(([stu, ses, attStats, face, att]) => {
      setStats({
        totalStudents:  stu.data.length,
        activeSessions: ses.data.length,
        today:          attStats.data.today,
        pendingFace:    face.data.length,
      });
      setSessions(ses.data);
      setRecentAtt(att.data.slice(0, 50));
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  // Build last 7 days attendance chart data
  const last7 = (() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0);
      days.push(d);
    }
    return days.map(d => {
      const next = new Date(d); next.setDate(next.getDate()+1);
      const count = recentAtt.filter(r => {
        const t = new Date(r.timestamp);
        return t >= d && t < next;
      }).length;
      return { label: d.toLocaleDateString('en',{weekday:'short',month:'short',day:'numeric'}), count };
    });
  })();

  const lineData = {
    labels: last7.map(d => d.label),
    datasets: [{
      label: 'Attendance',
      data: last7.map(d => d.count),
      borderColor: '#2563eb',
      backgroundColor: 'rgba(37,99,235,.08)',
      fill: true, tension: 0.4, pointRadius: 5,
      pointBackgroundColor: '#2563eb',
    }]
  };

  const lineOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, title: { display: false } },
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f1f5f9' } },
      x: { grid: { display: false } }
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner"/></div>;

  return (
    <div className="page">
      <div className="mb-6">
        <div className="page-title">Admin Dashboard</div>
        <div className="page-sub">Welcome back, {user?.name?.split(' ')[0]} — here's your overview</div>
      </div>

      {/* Stats */}
      <div className="stat-grid mb-6">
        <div className="stat-card">
          <div className="stat-icon blue"><Users size={22}/></div>
          <div>
            <div className="stat-value">{stats.totalStudents}</div>
            <div className="stat-label">Students</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><Bluetooth size={22}/></div>
          <div>
            <div className="stat-value">{stats.activeSessions}</div>
            <div className="stat-label">Active Sessions</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue"><CheckSquare size={22}/></div>
          <div>
            <div className="stat-value">{stats.today}</div>
            <div className="stat-label">Present Today</div>
          </div>
        </div>
        <div className="stat-card" onClick={() => navigate('/admin/face-approvals')} style={{cursor:'pointer'}}>
          <div className="stat-icon amber"><ScanFace size={22}/></div>
          <div>
            <div className="stat-value">{stats.pendingFace}</div>
            <div className="stat-label">Face Approvals</div>
          </div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1.5rem',alignItems:'start'}}>
        {/* Attendance chart */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Attendance — Last 7 Days</span>
          </div>
          <div style={{height:220}}>
            <Line data={lineData} options={lineOpts}/>
          </div>
        </div>

        {/* Active sessions */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Active Sessions</span>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/admin/sessions')}>
              <Plus size={13}/> New
            </button>
          </div>
          {sessions.length === 0 ? (
            <div className="empty-state" style={{padding:'1.5rem'}}>
              <Bluetooth size={32} style={{opacity:.3,margin:'0 auto .75rem'}}/>
              <p>No active sessions right now.</p>
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:'.6rem'}}>
              {sessions.map(s => (
                <div key={s._id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'.75rem',background:'var(--bg)',borderRadius:10,gap:'.5rem'}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:'.88rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                      {s.subject?.name}
                    </div>
                    <div className="text-xs text-muted">{s.classGroup?.name} · 📍 {s.room}</div>
                  </div>
                  <span className="badge badge-green" style={{fontSize:'.7rem',flexShrink:0}}>
                    <span className="ble-pulse green" style={{width:7,height:7}}/> LIVE
                  </span>
                </div>
              ))}
              <button className="btn btn-ghost btn-sm mt-2" onClick={() => navigate('/admin/sessions')}>
                View all <ArrowRight size={13}/>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="section-title mt-6">Quick Actions</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:'1rem'}}>
        {[
          { label:'Start Session',    icon:Bluetooth, to:'/admin/sessions',       color:'#dbeafe',iconColor:'var(--primary)' },
          { label:'Manage Classes',   icon:Users,     to:'/admin/classes',        color:'#dcfce7',iconColor:'var(--success)' },
          { label:'Face Approvals',   icon:ScanFace,  to:'/admin/face-approvals', color:'#fef3c7',iconColor:'var(--warning)' },
          { label:'Attendance Logs',  icon:CheckSquare,to:'/admin/attendance',    color:'#ede9fe',iconColor:'#7c3aed' },
        ].map(a => (
          <button key={a.label} className="card" onClick={() => navigate(a.to)}
            style={{display:'flex',alignItems:'center',gap:'1rem',cursor:'pointer',border:'1px solid var(--border)',transition:'all .15s',textAlign:'left'}}
            onMouseEnter={e=>e.currentTarget.style.boxShadow='var(--shadow-md)'}
            onMouseLeave={e=>e.currentTarget.style.boxShadow='var(--shadow)'}
          >
            <div style={{width:44,height:44,borderRadius:10,background:a.color,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <a.icon size={20} color={a.iconColor}/>
            </div>
            <span style={{fontWeight:600,fontSize:'.92rem'}}>{a.label}</span>
            <ArrowRight size={15} style={{marginLeft:'auto',color:'var(--text-muted)'}}/>
          </button>
        ))}
      </div>

      {/* Recent attendance */}
      {recentAtt.length > 0 && (
        <>
          <div className="section-title mt-6">Recent Attendance</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Student</th><th>Subject</th><th>BLE</th><th>Face</th><th>Time</th></tr>
              </thead>
              <tbody>
                {recentAtt.slice(0,10).map(r=>(
                  <tr key={r._id}>
                    <td>
                      <div style={{fontWeight:600,fontSize:'.88rem'}}>{r.student?.name}</div>
                      <div style={{fontFamily:'monospace',fontSize:'.75rem',color:'var(--text-muted)'}}>{r.student?.rollNumber}</div>
                    </td>
                    <td className="text-sm">{r.session?.subject?.name}</td>
                    <td>{r.bleVerified  ? '✅' : '❌'}</td>
                    <td>{r.faceVerified ? '✅' : '❌'}</td>
                    <td className="text-sm text-muted">{new Date(r.timestamp).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
