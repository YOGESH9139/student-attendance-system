import { useEffect, useState } from 'react';
import { Plus, Square, Bluetooth, Clock, MapPin, AlertCircle, CheckCircle2, X, Info } from 'lucide-react';
import api from '../../api/axios';

const DURATIONS = [30, 45, 60, 90, 120];
const DEFAULT_UUID = '12ab34cd-56ef-7890-abcd-ef1234567890';

export default function ManageSessions() {
  const [sessions,  setSessions]  = useState([]);
  const [subjects,  setSubjects]  = useState([]);
  const [groups,    setGroups]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [msg,       setMsg]       = useState(null);
  const [showForm,  setShowForm]  = useState(false);
  const [submitting,setSubmitting]= useState(false);

  const [form, setForm] = useState({
    subjectId:'', classGroupId:'', room:'',
    bleDeviceName:'CLASSROOM_101',
    rssiThreshold:-75,
    duration:60,
    useGpsVerification:false,
    lat:'', lng:'', radius:50
  });

  const flash = (type, text) => { setMsg({type,text}); setTimeout(()=>setMsg(null), 4500); };

  useEffect(() => {
    Promise.all([
      api.get('/sessions/all'),
      api.get('/subjects'),
      api.get('/classgroups')
    ]).then(([s,sub,g]) => {
      setSessions(s.data); setSubjects(sub.data); setGroups(g.data);
    }).catch(()=>flash('error','Failed to load data')).finally(()=>setLoading(false));
  }, []);

  const createSession = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      const payload = {
        subjectId:    form.subjectId,
        classGroupId: form.classGroupId,
        room:         form.room,
        bleDeviceName: form.bleDeviceName,
        rssiThreshold: form.rssiThreshold,
        duration:      form.duration,
        useGpsVerification: form.useGpsVerification,
        location: form.useGpsVerification
          ? { latitude: parseFloat(form.lat), longitude: parseFloat(form.lng), radius: parseInt(form.radius) }
          : {}
      };
      const r = await api.post('/sessions', payload);
      setSessions(prev => [r.data, ...prev]);
      flash('success','Session started successfully');
      setShowForm(false);
      resetForm();
    } catch (err) { flash('error', err.response?.data?.msg || 'Failed to create session'); }
    finally { setSubmitting(false); }
  };

  const stopSession = async (id) => {
    if (!window.confirm('Stop this session? Students will no longer be able to mark attendance.')) return;
    try {
      await api.patch(`/sessions/${id}/stop`);
      setSessions(prev => prev.map(s => s._id===id ? {...s, isActive:false} : s));
      flash('success','Session stopped');
    } catch { flash('error','Failed to stop session'); }
  };

  const resetForm = () => setForm({
    subjectId:'', classGroupId:'', room:'',
    bleDeviceName:'CLASSROOM_101', rssiThreshold:-75, duration:60,
    useGpsVerification:false, lat:'', lng:'', radius:50
  });

  const f = (k,v) => setForm(p=>({...p,[k]:v}));

  const isActive = (s) => s.isActive && new Date(s.endTime) > new Date();

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="page-title">Attendance Sessions</div>
          <div className="page-sub">Start and manage live attendance sessions for your classes</div>
        </div>
        <button className="btn btn-primary" onClick={()=>setShowForm(true)}>
          <Plus size={16}/> Start Session
        </button>
      </div>

      {msg && (
        <div className={`alert ${msg.type==='error'?'alert-error':'alert-success'} mb-4`}>
          {msg.type==='error'?<AlertCircle size={16}/>:<CheckCircle2 size={16}/>} {msg.text}
        </div>
      )}

      {/* Active Sessions */}
      <div className="section-title">Active Sessions</div>
      {sessions.filter(isActive).length === 0 ? (
        <div className="card empty-state mb-6">
          <Bluetooth size={36}/><p>No active sessions right now. Start one using the button above.</p>
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:'.75rem',marginBottom:'1.75rem'}}>
          {sessions.filter(isActive).map(s => (
            <div key={s._id} style={{
              display:'flex', alignItems:'center', justifyContent:'space-between',
              background:'#fff', border:'1px solid var(--border)', borderRadius:14, padding:'1rem 1.25rem',
              boxShadow:'var(--shadow)', gap:'1rem'
            }}>
              <div style={{flex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:'.6rem'}}>
                  <span className="badge badge-green" style={{fontSize:'.72rem'}}>
                    <span className="ble-pulse green" style={{width:7,height:7}} /> LIVE
                  </span>
                  <span style={{fontWeight:700,fontSize:'1rem'}}>{s.subject?.name}</span>
                  <span className="badge badge-blue" style={{fontSize:'.72rem'}}>{s.subject?.code}</span>
                </div>
                <div className="text-sm text-muted mt-2" style={{display:'flex',gap:'1.25rem',flexWrap:'wrap'}}>
                  <span>📍 {s.room}</span>
                  <span>👥 {s.classGroup?.name}</span>
                  <span style={{display:'flex',alignItems:'center',gap:'.3rem'}}>
                    <Bluetooth size={13}/> {s.bleDeviceName}
                  </span>
                  <span>📶 {s.rssiThreshold} dBm</span>
                  <span style={{display:'flex',alignItems:'center',gap:'.3rem'}}>
                    <Clock size={13}/> Ends {new Date(s.endTime).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
                  </span>
                  {s.useGpsVerification && <span style={{display:'flex',alignItems:'center',gap:'.3rem'}}><MapPin size={13}/> GPS ON</span>}
                </div>
              </div>
              <button className="btn btn-danger btn-sm" onClick={()=>stopSession(s._id)}>
                <Square size={13}/> Stop
              </button>
            </div>
          ))}
        </div>
      )}

      {/* History */}
      <div className="section-title">Session History</div>
      {sessions.filter(s=>!isActive(s)).length === 0 ? (
        <div className="card empty-state"><Clock size={36}/><p>No past sessions yet.</p></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th>Subject</th><th>Class</th><th>Room</th>
              <th>Beacon</th><th>Started</th><th>Duration</th><th>Status</th>
            </tr></thead>
            <tbody>
              {sessions.filter(s=>!isActive(s)).map(s => (
                <tr key={s._id}>
                  <td><div style={{fontWeight:600}}>{s.subject?.name}</div><div className="text-xs text-muted">{s.subject?.code}</div></td>
                  <td>{s.classGroup?.name}</td>
                  <td>{s.room}</td>
                  <td style={{fontFamily:'monospace',fontSize:'.82rem'}}>{s.bleDeviceName}</td>
                  <td className="text-sm">{new Date(s.startTime).toLocaleString()}</td>
                  <td>{s.duration} min</td>
                  <td><span className="badge badge-gray">Ended</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Create Session Modal ─────────────────────── */}
      {showForm && (
        <div className="modal-backdrop" onClick={()=>setShowForm(false)}>
          <div className="modal" style={{maxWidth:580}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Start New Attendance Session</span>
              <button className="modal-close" onClick={()=>{setShowForm(false);resetForm();}}><X size={18}/></button>
            </div>
            <form onSubmit={createSession}>
              <div className="modal-body" style={{maxHeight:'70vh',overflowY:'auto'}}>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Class Group</label>
                    <select className="form-input" value={form.classGroupId} onChange={e=>f('classGroupId',e.target.value)} required>
                      <option value="">Select class…</option>
                      {groups.map(g=><option key={g._id} value={g._id}>{g.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Subject</label>
                    <select className="form-input" value={form.subjectId} onChange={e=>f('subjectId',e.target.value)} required>
                      <option value="">Select subject…</option>
                      {subjects.map(s=><option key={s._id} value={s._id}>{s.name} ({s.code})</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Room / Location</label>
                    <input className="form-input" placeholder="e.g. Room 203, Block A" value={form.room} onChange={e=>f('room',e.target.value)} required/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Duration</label>
                    <select className="form-input" value={form.duration} onChange={e=>f('duration',parseInt(e.target.value))}>
                      {DURATIONS.map(d=><option key={d} value={d}>{d} minutes</option>)}
                    </select>
                  </div>
                </div>

                {/* BLE Config */}
                <div style={{background:'var(--primary-light)',borderRadius:10,padding:'1rem',marginBottom:'1rem'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'.5rem',marginBottom:'.75rem'}}>
                    <Bluetooth size={16} color="var(--primary)"/>
                    <span style={{fontWeight:700,fontSize:'.9rem',color:'var(--primary)'}}>Beacon Configuration</span>
                    <Info size={14} color="var(--primary)" title="Each classroom has its own ESP32 beacon with a unique device name"/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">ESP32 Device Name</label>
                    <input className="form-input mono" placeholder="CLASSROOM_101" value={form.bleDeviceName}
                      onChange={e=>f('bleDeviceName',e.target.value.toUpperCase())} required/>
                    <div className="form-hint">
                      Must match the <code>DEVICE_NAME</code> in your classroom's ESP32 firmware.
                      Each classroom has a unique name (e.g. <em>CLASSROOM_101</em>, <em>CLASSROOM_202</em>).
                    </div>
                  </div>
                  <div className="form-group" style={{marginBottom:0}}>
                    <label className="form-label">
                      RSSI Threshold: <strong>{form.rssiThreshold} dBm</strong>
                    </label>
                    <input
                      type="range" min={-100} max={-40} step={1}
                      value={form.rssiThreshold}
                      style={{'--pct': `${((form.rssiThreshold+100)/60*100).toFixed(0)}%`}}
                      onChange={e=>f('rssiThreshold',parseInt(e.target.value))}
                    />
                    <div className="text-xs text-muted" style={{display:'flex',justifyContent:'space-between'}}>
                      <span>-100 dBm (far)</span><span>-40 dBm (very close)</span>
                    </div>
                    <div className="form-hint">
                      Students with RSSI ≥ {form.rssiThreshold} dBm are considered inside. Recommended: -70 to -80 dBm for a standard classroom.
                    </div>
                  </div>
                </div>

                {/* GPS Toggle */}
                <div style={{display:'flex',alignItems:'center',gap:'.75rem',marginBottom:'1rem'}}>
                  <input type="checkbox" id="gps-toggle" checked={form.useGpsVerification}
                    onChange={e=>f('useGpsVerification',e.target.checked)} style={{width:18,height:18,accentColor:'var(--primary)',cursor:'pointer'}}/>
                  <label htmlFor="gps-toggle" style={{fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:'.4rem'}}>
                    <MapPin size={15}/> Enable GPS Verification (optional extra layer)
                  </label>
                </div>
                {form.useGpsVerification && (
                  <div style={{background:'#fff',border:'1px solid var(--border)',borderRadius:10,padding:'1rem',marginBottom:'1rem'}}>
                    <div className="grid-2">
                      <div className="form-group">
                        <label className="form-label">Latitude</label>
                        <input className="form-input" type="number" step="any" placeholder="13.0827" value={form.lat} onChange={e=>f('lat',e.target.value)} required/>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Longitude</label>
                        <input className="form-input" type="number" step="any" placeholder="80.2707" value={form.lng} onChange={e=>f('lng',e.target.value)} required/>
                      </div>
                    </div>
                    <div className="form-group" style={{marginBottom:0}}>
                      <label className="form-label">Allowed Radius (meters)</label>
                      <input className="form-input" type="number" min={10} max={500} value={form.radius} onChange={e=>f('radius',e.target.value)}/>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={()=>{setShowForm(false);resetForm();}}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Starting…' : '▶ Start Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
