import { useEffect, useState } from 'react';
import { Plus, BookOpen, Trash2, AlertCircle, CheckCircle2, X } from 'lucide-react';
import api from '../api/axios';

// Lightweight subjects management — accessible via Admin dashboard
// This is embedded inside ManageSessions so admin can add subjects on the fly
export default function SubjectManager({ classGroupId, onSubjectCreated }) {
  const [subjects,   setSubjects]   = useState([]);
  const [showForm,   setShowForm]   = useState(false);
  const [form,       setForm]       = useState({ name:'', code:'' });
  const [submitting, setSubmitting] = useState(false);
  const [msg,        setMsg]        = useState(null);

  const flash = (type,text) => { setMsg({type,text}); setTimeout(()=>setMsg(null),3000); };

  useEffect(() => {
    if (!classGroupId) return;
    api.get(`/subjects/by-group/${classGroupId}`)
       .then(r => setSubjects(r.data))
       .catch(()=>{});
  }, [classGroupId]);

  const create = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      const r = await api.post('/subjects', { ...form, classGroupId });
      setSubjects(prev => [r.data, ...prev]);
      if (onSubjectCreated) onSubjectCreated(r.data);
      flash('success',`Subject ${r.data.name} created`);
      setShowForm(false);
      setForm({ name:'', code:'' });
    } catch (err) { flash('error', err.response?.data?.msg||'Failed'); }
    finally { setSubmitting(false); }
  };

  const del = async (id) => {
    if (!window.confirm('Delete this subject?')) return;
    try {
      await api.delete(`/subjects/${id}`);
      setSubjects(prev => prev.filter(s=>s._id!==id));
      flash('success','Deleted');
    } catch { flash('error','Delete failed'); }
  };

  if (!classGroupId) return null;

  return (
    <div>
      {msg && <div className={`alert ${msg.type==='error'?'alert-error':'alert-success'} mb-3`}>
        {msg.type==='error'?<AlertCircle size={14}/>:<CheckCircle2 size={14}/>} {msg.text}
      </div>}
      <div className="flex items-center justify-between mb-3">
        <span style={{fontWeight:700,fontSize:'.88rem'}}>Subjects for this class</span>
        <button className="btn btn-primary btn-sm" onClick={()=>setShowForm(p=>!p)}>
          <Plus size={13}/> Add Subject
        </button>
      </div>
      {showForm && (
        <div style={{background:'var(--bg)',borderRadius:10,padding:'1rem',marginBottom:'1rem',border:'1px solid var(--border)'}}>
          <form onSubmit={create}>
            <div className="grid-2">
              <div className="form-group" style={{marginBottom:'.75rem'}}>
                <label className="form-label">Subject Name</label>
                <input className="form-input" placeholder="Data Structures" value={form.name}
                  onChange={e=>setForm(p=>({...p,name:e.target.value}))} required/>
              </div>
              <div className="form-group" style={{marginBottom:'.75rem'}}>
                <label className="form-label">Subject Code</label>
                <input className="form-input mono" placeholder="CS201" value={form.code}
                  onChange={e=>setForm(p=>({...p,code:e.target.value.toUpperCase()}))} required/>
              </div>
            </div>
            <div style={{display:'flex',gap:'.5rem'}}>
              <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                {submitting?'Creating…':'Create'}
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={()=>setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
      {subjects.length === 0
        ? <div className="text-sm text-muted" style={{padding:'.5rem 0'}}>No subjects yet for this class.</div>
        : <div style={{display:'flex',flexDirection:'column',gap:'.4rem'}}>
            {subjects.map(s=>(
              <div key={s._id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'.5rem .75rem',background:'#fff',borderRadius:8,border:'1px solid var(--border)'}}>
                <div>
                  <span style={{fontWeight:600,fontSize:'.88rem'}}>{s.name}</span>
                  <span style={{fontFamily:'monospace',fontSize:'.75rem',color:'var(--text-muted)',marginLeft:'.5rem'}}>{s.code}</span>
                </div>
                <button className="btn btn-ghost btn-sm" style={{padding:'.25rem .5rem'}} onClick={()=>del(s._id)}>
                  <Trash2 size={13} color="var(--danger)"/>
                </button>
              </div>
            ))}
          </div>
      }
    </div>
  );
}
