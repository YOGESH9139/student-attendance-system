import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Download, AlertCircle, ScanFace } from 'lucide-react';
import api from '../../api/axios';

export default function AttendanceView() {
  const [records,   setRecords]  = useState([]);
  const [sessions,  setSessions] = useState([]);
  const [stats,     setStats]    = useState([]);
  const [selSession,setSelSession]= useState('all');
  const [loading,   setLoading]  = useState(true);
  const [msg,       setMsg]      = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/attendance/all'),
      api.get('/sessions/all'),
      api.get('/attendance/subject-stats')
    ]).then(([r, s, st]) => {
      setRecords(r.data);
      setSessions(s.data);
      setStats(st.data);
    }).catch(() => setMsg({ type:'error', text:'Failed to load records' }))
      .finally(() => setLoading(false));
  }, []);

  const filtered = selSession === 'all'
    ? records
    : records.filter(r => r.session?._id === selSession);

  const exportCSV = () => {
    const header = 'Roll Number,Name,Subject,Code,Room,Date,BLE,Face,Status\n';
    const rows = filtered.map(r =>
      [
        r.student?.rollNumber,
        `"${r.student?.name}"`,
        `"${r.session?.subject?.name}"`,
        r.session?.subject?.code,
        r.session?.room || '',
        new Date(r.timestamp).toLocaleString(),
        r.bleVerified ? 'Yes' : 'No',
        r.faceVerified ? 'Yes' : 'No',
        r.status
      ].join(',')
    ).join('\n');
    const blob = new Blob([header + rows], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='attendance.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="loading-screen"><div className="spinner"/></div>;

  return (
    <div className="page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="page-title">Attendance Records</div>
          <div className="page-sub">Full log of all student attendance verifications</div>
        </div>
        <button className="btn btn-ghost" onClick={exportCSV} disabled={filtered.length===0}>
          <Download size={15}/> Export CSV
        </button>
      </div>

      {msg && <div className={`alert ${msg.type==='error'?'alert-error':'alert-success'} mb-4`}><AlertCircle size={16}/>{msg.text}</div>}

      {/* Global Stats Overview */}
      {stats.length > 0 && (
        <div className="mb-6">
          <div className="section-title">Overall Subject-Wise Attendance</div>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
            {stats.map(s => (
              <div key={s.code} className="card" style={{ padding: '1rem', textAlign: 'center' }}>
                <div className="text-xl font-bold" style={{ color: s.percentage >= 75 ? 'var(--success)' : s.percentage >= 60 ? 'var(--warning)' : 'var(--danger)' }}>
                  {s.percentage}%
                </div>
                <div className="text-xs font-bold mt-1">{s.name}</div>
                <div className="text-xs text-muted">{s.attended} / {s.expected}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter by session */}
      <div className="flex items-center gap-3 mb-4">
        <label className="form-label" style={{margin:0,whiteSpace:'nowrap'}}>Filter by session:</label>
        <select className="form-input" style={{maxWidth:320}} value={selSession} onChange={e=>setSelSession(e.target.value)}>
          <option value="all">All Sessions ({records.length} records)</option>
          {sessions.map(s => (
            <option key={s._id} value={s._id}>
              {s.subject?.name} — {new Date(s.startTime).toLocaleDateString()}
            </option>
          ))}
        </select>
        <span className="text-muted text-sm">{filtered.length} record{filtered.length!==1?'s':''}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="card empty-state">
          <ScanFace size={40} style={{opacity:.3}}/>
          <p>No attendance records {selSession!=='all' ? 'for this session' : 'yet'}.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Subject</th>
                <th>Room</th>
                <th>Date & Time</th>
                <th>RSSI</th>
                <th>BLE</th>
                <th>Face</th>
                <th>Face Score</th>
                <th>GPS</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r._id}>
                  <td>
                    <div style={{display:'flex',alignItems:'center',gap:'.6rem'}}>
                      {r.student?.profilePicUrl
                        ? <img src={r.student.profilePicUrl} alt="" style={{width:32,height:32,borderRadius:'50%',objectFit:'cover',border:'1px solid var(--border)'}}/>
                        : <div style={{width:32,height:32,borderRadius:'50%',background:'#dbeafe',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:'.78rem',color:'#1d4ed8'}}>
                            {r.student?.name?.[0]}
                          </div>
                      }
                      <div>
                        <div style={{fontWeight:600,fontSize:'.88rem'}}>{r.student?.name}</div>
                        <div style={{fontFamily:'monospace',fontSize:'.75rem',color:'var(--text-muted)'}}>{r.student?.rollNumber}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{fontWeight:600,fontSize:'.88rem'}}>{r.session?.subject?.name}</div>
                    <div className="text-xs text-muted">{r.session?.subject?.code}</div>
                  </td>
                  <td className="text-sm">{r.session?.room||'—'}</td>
                  <td className="text-sm" style={{whiteSpace:'nowrap'}}>{new Date(r.timestamp).toLocaleString()}</td>
                  <td style={{fontFamily:'monospace',fontSize:'.82rem'}}>{r.rssiValue!=null?`${r.rssiValue} dBm`:'—'}</td>
                  <td>{r.bleVerified  ? <CheckCircle2 size={16} color="var(--success)"/> : <XCircle size={16} color="var(--danger)"/>}</td>
                  <td>{r.faceVerified ? <CheckCircle2 size={16} color="var(--success)"/> : <XCircle size={16} color="var(--danger)"/>}</td>
                  <td style={{fontFamily:'monospace',fontSize:'.82rem',color:r.faceMatchScore<0.4?'var(--success)':r.faceMatchScore<0.52?'var(--warning)':'var(--danger)'}}>
                    {r.faceMatchScore!=null ? r.faceMatchScore.toFixed(3) : '—'}
                  </td>
                  <td>{r.locationVerified ? <CheckCircle2 size={16} color="var(--success)"/> : <span className="text-xs text-muted">—</span>}</td>
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
