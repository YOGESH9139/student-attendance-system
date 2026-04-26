import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, ScanFace, AlertCircle, User } from 'lucide-react';
import api from '../../api/axios';

export default function FaceApprovals() {
  const [pending,   setPending]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [msg,       setMsg]       = useState(null);
  const [preview,   setPreview]   = useState(null); // {student, url}

  const flash = (type, text) => { setMsg({type,text}); setTimeout(()=>setMsg(null), 4000); };

  const fetchPending = async () => {
    setLoading(true);
    try { const r = await api.get('/users/face-approvals'); setPending(r.data); }
    catch { flash('error','Failed to load approvals'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPending(); }, []);

  const action = async (id, act) => {
    try {
      await api.patch(`/users/${id}/face-action`, { action: act });
      flash('success', `Face ID ${act}d`);
      setPending(prev => prev.filter(s => s._id !== id));
      setPreview(null);
    } catch (err) { flash('error', err.response?.data?.msg || 'Action failed'); }
  };

  if (loading) return <div className="loading-screen"><div className="spinner"/></div>;

  return (
    <div className="page">
      <div className="page-title">Face ID Approvals</div>
      <div className="page-sub">Review and approve or reject student face enrollment submissions</div>

      {msg && (
        <div className={`alert ${msg.type==='error'?'alert-error':'alert-success'} mb-4`}>
          {msg.type==='error'?<AlertCircle size={16}/>:<CheckCircle2 size={16}/>} {msg.text}
        </div>
      )}

      {pending.length === 0 ? (
        <div className="card empty-state">
          <ScanFace size={48} style={{opacity:.3}} />
          <p>No pending face approvals. All caught up! 🎉</p>
        </div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:'1.25rem'}}>
          {pending.map(s => (
            <div key={s._id} className="card" style={{display:'flex',flexDirection:'column',gap:'1rem'}}>
              {/* Photo */}
              <div style={{position:'relative',borderRadius:12,overflow:'hidden',aspectRatio:'1',background:'#f1f5f9',cursor:'pointer'}}
                onClick={() => setPreview({student:s, url: s.facePhotoUrl})}>
                {s.facePhotoUrl
                  ? <img src={s.facePhotoUrl} alt={s.name} style={{width:'100%',height:'100%',objectFit:'cover'}} />
                  : <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <User size={60} color="var(--text-muted)" />
                    </div>
                }
                <div style={{position:'absolute',top:8,right:8}}>
                  <span className="badge badge-amber">Pending</span>
                </div>
                <div style={{position:'absolute',bottom:0,left:0,right:0,background:'linear-gradient(transparent,rgba(0,0,0,.6))',padding:'.5rem .75rem',color:'#fff',fontSize:'.82rem'}}>
                  Click to enlarge
                </div>
              </div>
              {/* Info */}
              <div>
                <div style={{fontWeight:700,fontSize:'.95rem'}}>{s.name}</div>
                <div className="text-sm text-muted" style={{fontFamily:'monospace'}}>{s.rollNumber}</div>
                <div className="text-xs text-muted">{s.classGroup?.name || 'No class'}</div>
                <div className="text-xs text-muted mt-2">
                  Submitted: {s.faceUpdatedAt ? new Date(s.faceUpdatedAt).toLocaleString() : '—'}
                </div>
              </div>
              {/* Actions */}
              <div style={{display:'flex',gap:'.75rem'}}>
                <button className="btn btn-success btn-sm" style={{flex:1}} onClick={()=>action(s._id,'approve')}>
                  <CheckCircle2 size={14}/> Approve
                </button>
                <button className="btn btn-danger btn-sm" style={{flex:1}} onClick={()=>action(s._id,'reject')}>
                  <XCircle size={14}/> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Photo Preview Modal */}
      {preview && (
        <div className="modal-backdrop" onClick={()=>setPreview(null)}>
          <div style={{background:'#fff',borderRadius:20,overflow:'hidden',maxWidth:500,width:'100%',boxShadow:'0 25px 50px rgba(0,0,0,.3)'}}
            onClick={e=>e.stopPropagation()}>
            {preview.url
              ? <img src={preview.url} alt={preview.student.name} style={{width:'100%',display:'block'}}/>
              : <div style={{height:300,display:'flex',alignItems:'center',justifyContent:'center',background:'#f1f5f9'}}>
                  <User size={80} color="var(--text-muted)"/>
                </div>
            }
            <div style={{padding:'1.25rem',borderTop:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div>
                <div style={{fontWeight:700}}>{preview.student.name}</div>
                <div className="text-sm text-muted">{preview.student.rollNumber} · {preview.student.classGroup?.name}</div>
              </div>
              <div style={{display:'flex',gap:'.5rem'}}>
                <button className="btn btn-success btn-sm" onClick={()=>action(preview.student._id,'approve')}><CheckCircle2 size={14}/> Approve</button>
                <button className="btn btn-danger btn-sm"  onClick={()=>action(preview.student._id,'reject')}><XCircle size={14}/> Reject</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
