import { useEffect, useState } from 'react';
import SubjectManager from '../../components/SubjectManager';
import { Plus, Upload, Users, ChevronRight, UserPlus, X, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../../api/axios';

const CSV_TEMPLATE = 'rollNumber,name\n24011P0501,Student One\n24011P0502,Student Two';

export default function ManageClasses() {
  const [groups, setGroups] = useState([]);
  const [selected, setSelected] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);

  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showAddStu, setShowAddStu] = useState(false);
  const [showCSV, setShowCSV] = useState(false);

  const [groupForm, setGroupForm] = useState({ name: '', department: '', year: '2', section: '' });
  const [stuForm, setStuForm] = useState({ rollNumber: '', name: '' });
  const [csvText, setCsvText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const flash = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  useEffect(() => { fetchGroups(); }, []);
  useEffect(() => { if (selected) fetchStudents(selected); }, [selected]);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const r = await api.get('/classgroups');
      setGroups(r.data);
    } catch {
      flash('error', 'Failed to load class groups');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async (id) => {
    try {
      const r = await api.get('/classgroups/' + id + '/students');
      setStudents(r.data);
    } catch {
      setStudents([]);
    }
  };

  const createGroup = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/classgroups', groupForm);
      flash('success', 'Class group created');
      setShowNewGroup(false);
      setGroupForm({ name: '', department: '', year: '2', section: '' });
      fetchGroups();
    } catch (err) {
      flash('error', err.response?.data?.msg || 'Failed to create group');
    } finally {
      setSubmitting(false);
    }
  };

  const addStudent = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/classgroups/' + selected + '/add-student', stuForm);
      flash('success', 'Student ' + stuForm.rollNumber + ' added');
      setShowAddStu(false);
      setStuForm({ rollNumber: '', name: '' });
      fetchStudents(selected);
    } catch (err) {
      flash('error', err.response?.data?.msg || 'Failed to add student');
    } finally {
      setSubmitting(false);
    }
  };

  const importCSV = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const r = await api.post('/classgroups/' + selected + '/import-csv', { csv: csvText });
      flash('success', r.data.msg);
      setShowCSV(false);
      setCsvText('');
      fetchStudents(selected);
    } catch (err) {
      flash('error', err.response?.data?.msg || 'CSV import failed');
    } finally {
      setSubmitting(false);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'students_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedGroup = groups.find(g => g._id === selected);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="page-title">Manage Classes</div>
          <div className="page-sub">Create class groups and manage student enrollments</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowNewGroup(true)}>
          <Plus size={16} /> New Class Group
        </button>
      </div>

      {msg && (
        <div className={'alert ' + (msg.type === 'error' ? 'alert-error' : 'alert-success') + ' mb-4'}>
          {msg.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />} {msg.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Group List */}
        <div>
          <div className="section-title">Class Groups ({groups.length})</div>
          {groups.length === 0 ? (
            <div className="card empty-state">
              <Users size={32} /><p>No class groups yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
              {groups.map(g => (
                <button
                  key={g._id}
                  onClick={() => setSelected(g._id)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '.85rem 1rem', borderRadius: 10,
                    border: '1px solid ' + (selected === g._id ? 'var(--primary)' : 'var(--border)'),
                    background: selected === g._id ? 'var(--primary-light)' : '#fff',
                    cursor: 'pointer', textAlign: 'left', transition: 'all .15s'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '.9rem', color: selected === g._id ? 'var(--primary)' : 'var(--text)' }}>{g.name}</div>
                    <div className="text-xs text-muted">{g.department} - Year {g.year} - Section {g.section}</div>
                  </div>
                  <ChevronRight size={16} color={selected === g._id ? 'var(--primary)' : 'var(--text-muted)'} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Students Panel */}
        <div>
          {!selected ? (
            <div className="card empty-state">
              <Users size={36} />
              <p>Select a class group to view and manage students.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="section-title" style={{ marginBottom: 0 }}>
                  {selectedGroup?.name} - Students ({students.length})
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-ghost btn-sm" onClick={downloadTemplate}>
                    <Download size={14} /> CSV Template
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowCSV(true)}>
                    <Upload size={14} /> Import CSV
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={() => setShowAddStu(true)}>
                    <UserPlus size={14} /> Add Student
                  </button>
                </div>
              </div>

              {students.length === 0 ? (
                <div className="card empty-state">
                  <Users size={36} />
                  <p>No students yet. Add manually or import via CSV.</p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Roll Number</th>
                        <th>Name</th>
                        <th>Face ID</th>
                        <th>Registered</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s, i) => (
                        <tr key={s._id}>
                          <td className="text-muted text-sm">{i + 1}</td>
                          <td><span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{s.rollNumber}</span></td>
                          <td>{s.name}</td>
                          <td>
                            <span className={'badge ' + (
                              s.faceStatus === 'approved' ? 'badge-green' :
                              s.faceStatus === 'pending' ? 'badge-amber' :
                              s.faceStatus === 'rejected' ? 'badge-red' : 'badge-gray'
                            )}>
                              {s.faceStatus || 'none'}
                            </span>
                          </td>
                          <td className="text-sm text-muted">{new Date(s.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Subjects Panel */}
      {selected && (
        <div className="card mt-6">
          <div className="card-header">
            <span className="card-title">Subjects - {selectedGroup?.name}</span>
          </div>
          <SubjectManager classGroupId={selected} />
        </div>
      )}

      {/* Create Group Modal */}
      {showNewGroup && (
        <div className="modal-backdrop" onClick={() => setShowNewGroup(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Create Class Group</span>
              <button className="modal-close" onClick={() => setShowNewGroup(false)}><X size={18} /></button>
            </div>
            <form onSubmit={createGroup}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Group Name</label>
                  <input className="form-input" placeholder="e.g. CSE IDP" value={groupForm.name}
                    onChange={e => setGroupForm(p => ({ ...p, name: e.target.value }))} required />
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Department</label>
                    <input className="form-input" placeholder="CSE" value={groupForm.department}
                      onChange={e => setGroupForm(p => ({ ...p, department: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Section</label>
                    <input className="form-input" placeholder="IDP" value={groupForm.section}
                      onChange={e => setGroupForm(p => ({ ...p, section: e.target.value }))} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Year</label>
                  <select className="form-input" value={groupForm.year} onChange={e => setGroupForm(p => ({ ...p, year: e.target.value }))}>
                    <option value="1">Year 1</option>
                    <option value="2">Year 2</option>
                    <option value="3">Year 3</option>
                    <option value="4">Year 4</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowNewGroup(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddStu && (
        <div className="modal-backdrop" onClick={() => setShowAddStu(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Add Student</span>
              <button className="modal-close" onClick={() => setShowAddStu(false)}><X size={18} /></button>
            </div>
            <form onSubmit={addStudent}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Roll Number</label>
                  <input className="form-input mono" placeholder="e.g. 24011P0501" value={stuForm.rollNumber}
                    onChange={e => setStuForm(p => ({ ...p, rollNumber: e.target.value.toUpperCase() }))} required />
                  <div className="form-hint">Default password will be set to the roll number</div>
                </div>
                <div className="form-group">
                  <label className="form-label">Name <span className="text-muted">(optional)</span></label>
                  <input className="form-input" placeholder="Full name" value={stuForm.name}
                    onChange={e => setStuForm(p => ({ ...p, name: e.target.value }))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowAddStu(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Adding...' : 'Add Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {showCSV && (
        <div className="modal-backdrop" onClick={() => setShowCSV(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Import Students via CSV</span>
              <button className="modal-close" onClick={() => setShowCSV(false)}><X size={18} /></button>
            </div>
            <form onSubmit={importCSV}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Paste CSV content</label>
                  <textarea
                    className="form-input"
                    style={{ height: 200, resize: 'vertical', fontFamily: 'monospace', fontSize: '.82rem' }}
                    placeholder="rollNumber,name&#10;24011P0501,Yogesh Kumar&#10;24011P0502,Arjun Sharma"
                    value={csvText}
                    onChange={e => setCsvText(e.target.value)}
                    required
                  />
                  <div className="form-hint">
                    Columns: <strong>rollNumber</strong> (required), <strong>name</strong> (optional).
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowCSV(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting || !csvText.trim()}>
                  {submitting ? 'Importing...' : 'Import Students'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
