import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Bluetooth, ScanFace, CheckCircle2, AlertCircle, ArrowLeft, Wifi, Clock } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useBle } from '../../hooks/useBle';
import { useFaceApi } from '../../hooks/useFaceApi';
import RssiGauge from '../../components/RssiGauge';

const FACE_MATCH_THRESHOLD = 0.52; // euclidean distance

export default function MarkAttendance() {
  const { sessionId } = useParams();
  const navigate      = useNavigate();
  const { user }      = useAuth();

  const [session,    setSession]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [phase,      setPhase]      = useState('init');  // init | ble | face | verify | success | already | error
  const [errMsg,     setErrMsg]     = useState('');
  const [faceResult, setFaceResult] = useState(null);    // { matched, score }
  const [storedDesc, setStoredDesc] = useState(null);    // student's enrolled descriptor
  const [timeLeft,   setTimeLeft]   = useState('');

  // BLE
  const { rssi, bleState, bleError, startScan, stopScan, isInside } = useBle();

  // Face API
  const { modelsLoaded, loadingModels, modelError, videoRef, loadModels, startCamera, stopCamera, detectFace, capturePhotoBase64, compareDescriptors } = useFaceApi();

  const faceIntervalRef = useRef(null);
  const [liveFaceOk, setLiveFaceOk] = useState(false); // face visible in camera

  // ── Load session + models ──────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const [sesRes, descRes] = await Promise.all([
          api.get(`/sessions/${sessionId}`),
          api.get(`/users/${user._id || user.id}/descriptor`)
        ]);
        setSession(sesRes.data);
        setStoredDesc(descRes.data.descriptor);
        setPhase('ble');
      } catch (err) {
        if (err.response?.status === 400 && err.response?.data?.msg?.includes('already')) {
          setPhase('already');
        } else {
          setErrMsg(err.response?.data?.msg || 'Failed to load session');
          setPhase('error');
        }
      } finally { setLoading(false); }
    };
    init();
    loadModels();
    return () => { stopScan(); stopCamera(); clearInterval(faceIntervalRef.current); };
  }, [sessionId]);

  // ── Session countdown ───────────────────────────────────────────
  useEffect(() => {
    if (!session) return;
    const tick = () => {
      const diff = Math.max(0, new Date(session.endTime) - new Date());
      const m = Math.floor(diff / 60000), s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${m}:${String(s).padStart(2,'0')}`);
      if (diff === 0) setPhase('error') && setErrMsg('Session has ended.');
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [session]);

  // ── Start camera + live face polling once BLE connected ─────────
  useEffect(() => {
    if (bleState !== 'connected') return;

    (async () => {
      setPhase('face');
      await startCamera('user');
      faceIntervalRef.current = setInterval(async () => {
        const d = await detectFace();
        setLiveFaceOk(!!d);
      }, 800);
    })();

    return () => {
      clearInterval(faceIntervalRef.current);
    };
  }, [bleState]);

  // ── BLE connect ─────────────────────────────────────────────────
  const connectBle = useCallback(async () => {
    if (!session) return;
    await startScan({
      bleDeviceName:  session.bleDeviceName,
      bleServiceUUID: session.bleServiceUUID
    });
  }, [session, startScan]);

  // ── Verify & Mark ───────────────────────────────────────────────
  const verify = useCallback(async () => {
    setPhase('verify');
    try {
      // Detect live face
      const detection = await detectFace();
      if (!detection) {
        setErrMsg('No face detected. Look directly at the camera and try again.');
        setPhase('face');
        return;
      }

      const score = compareDescriptors(detection.descriptor, storedDesc);
      const matched = score < FACE_MATCH_THRESHOLD;

      setFaceResult({ matched, score: score.toFixed(3) });

      if (!matched) {
        setErrMsg(`Face did not match. Distance: ${score.toFixed(3)} (threshold: ${FACE_MATCH_THRESHOLD}). Make sure you enrolled correctly.`);
        setPhase('face');
        return;
      }

      // Get optional GPS
      let location = null;
      if (session.useGpsVerification) {
        try {
          const pos = await new Promise((res,rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout:8000 }));
          location = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        } catch { /* GPS optional — backend will reject if required */ }
      }

      // Submit attendance
      await api.post('/attendance/mark', {
        sessionId,
        bleVerified:   true,
        rssiValue:     rssi,
        faceVerified:  true,
        faceMatchScore: parseFloat(score),
        location
      });

      stopCamera();
      stopScan();
      setPhase('success');
    } catch (err) {
      if (err.response?.data?.msg?.includes('already')) {
        setPhase('already');
      } else {
        setErrMsg(err.response?.data?.msg || 'Verification failed');
        setPhase('face');
      }
    }
  }, [session, sessionId, rssi, storedDesc, detectFace, compareDescriptors, stopCamera, stopScan]);

  const inside = session ? isInside(session.rssiThreshold) : false;
  const canVerify = bleState === 'connected' && inside && liveFaceOk && modelsLoaded;

  if (loading) return <div className="loading-screen"><div className="spinner"/></div>;

  return (
    <div className="page-md">
      {/* Back button */}
      <button className="btn btn-ghost btn-sm mb-4" onClick={() => { stopScan(); stopCamera(); navigate('/student/dashboard'); }}>
        <ArrowLeft size={15}/> Back to Dashboard
      </button>

      {/* Session header */}
      {session && (
        <div className="card mb-4">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'.75rem'}}>
            <div>
              <div style={{fontWeight:800,fontSize:'1.15rem'}}>{session.subject?.name}</div>
              <div className="text-sm text-muted">{session.subject?.code} · 📍 {session.room} · {session.classGroup?.name}</div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:'.5rem'}}>
              <Clock size={15} color="var(--warning)"/>
              <span style={{fontFamily:'monospace',fontWeight:700,color:'var(--warning)'}}>{timeLeft}</span>
              <span className="badge badge-green"><span className="ble-pulse green" style={{width:7,height:7}}/> LIVE</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Phase: BLE ────────────────────────────────────── */}
      {phase === 'ble' && (
        <div className="card" style={{textAlign:'center'}}>
          <div style={{width:72,height:72,borderRadius:'50%',background:'var(--primary-light)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 1.25rem'}}>
            <Bluetooth size={36} color="var(--primary)"/>
          </div>
          <h2 style={{fontWeight:700,marginBottom:'.5rem'}}>Step 1: Connect to Classroom Beacon</h2>
          <p className="text-muted" style={{marginBottom:'1.5rem',fontSize:'.92rem'}}>
            Make sure you are inside the classroom. Your browser will ask for Bluetooth permission.
            Select <strong style={{color:'var(--primary)'}}>{session?.bleDeviceName}</strong> from the list.
          </p>

          {bleError && <div className="alert alert-error mb-4"><AlertCircle size={16}/> {bleError}</div>}

          <RssiGauge rssi={rssi} rssiThreshold={session?.rssiThreshold || -75} bleState={bleState} />

          <button
            className="btn btn-primary btn-lg mt-4"
            onClick={connectBle}
            disabled={bleState === 'scanning' || bleState === 'connected'}
          >
            <Bluetooth size={18}/>
            {bleState === 'idle'     && 'Scan for Beacon'}
            {bleState === 'scanning' && 'Scanning…'}
            {bleState === 'connected'&& 'Connected ✓'}
          </button>

          {bleState === 'connected' && !inside && (
            <div className="alert alert-warning mt-4">
              <AlertCircle size={16}/> You are connected but the signal is weak ({rssi} dBm). Move closer to the beacon and wait for the signal to improve.
            </div>
          )}
          {bleState === 'connected' && inside && (
            <div className="alert alert-success mt-4">
              <CheckCircle2 size={16}/> You are inside the classroom! Loading face verification…
            </div>
          )}
        </div>
      )}

      {/* ── Phase: Face ────────────────────────────────────── */}
      {phase === 'face' && (
        <div className="card">
          <h2 style={{fontWeight:700,marginBottom:'.75rem',textAlign:'center'}}>Step 2: Face Verification</h2>

          {/* RSSI mini bar */}
          <div style={{marginBottom:'1rem'}}>
            <RssiGauge rssi={rssi} rssiThreshold={session?.rssiThreshold||-75} bleState={bleState}/>
          </div>

          {errMsg && <div className="alert alert-error mb-4"><AlertCircle size={16}/> {errMsg}</div>}

          {loadingModels && (
            <div className="alert alert-info mb-4">
              <div className="spinner" style={{width:14,height:14,borderWidth:2,display:'inline-block',marginRight:8}}/>
              Loading AI models…
            </div>
          )}

          {/* Camera */}
          <div className="camera-wrap" style={{maxWidth:'100%',marginBottom:'1rem'}}>
            <video ref={videoRef} autoPlay playsInline muted
              style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',transform:'scaleX(-1)'}}/>
            {!liveFaceOk && modelsLoaded && (
              <div className="camera-overlay" style={{background:'rgba(0,0,0,.4)'}}>
                <div style={{textAlign:'center'}}>
                  <ScanFace size={40} style={{marginBottom:'.5rem',opacity:.7}}/>
                  <div>Position your face in the frame…</div>
                </div>
              </div>
            )}
            {liveFaceOk && (
              <div style={{position:'absolute',bottom:10,left:0,right:0,textAlign:'center'}}>
                <span style={{background:'rgba(22,163,74,.85)',color:'#fff',borderRadius:999,padding:'.35rem 1rem',fontWeight:600,fontSize:'.85rem'}}>
                  ✓ Face detected
                </span>
              </div>
            )}
          </div>

          <button
            className="btn btn-success btn-full btn-lg"
            onClick={verify}
            disabled={!canVerify}
          >
            <ScanFace size={18}/>
            {!inside      ? 'Move Closer to Beacon First' :
             !modelsLoaded ? 'Loading AI Models…' :
             !liveFaceOk  ? 'Position Your Face…' :
             'Verify & Mark Attendance'}
          </button>

          {!inside && bleState === 'connected' && (
            <div className="alert alert-warning mt-4">
              <AlertCircle size={15}/> Signal too weak ({rssi} dBm). Move closer to the ESP32 beacon in the classroom.
            </div>
          )}
        </div>
      )}

      {/* ── Phase: Verifying ──────────────────────────────── */}
      {phase === 'verify' && (
        <div className="card" style={{textAlign:'center',padding:'3rem 1rem'}}>
          <div className="spinner" style={{margin:'0 auto 1.25rem',width:48,height:48,borderWidth:4}}/>
          <h3 style={{fontWeight:700}}>Verifying your identity…</h3>
          <p className="text-muted mt-2">Comparing face, checking BLE signal, recording attendance</p>
        </div>
      )}

      {/* ── Phase: Success ────────────────────────────────── */}
      {phase === 'success' && (
        <div className="card" style={{textAlign:'center',padding:'2.5rem 1rem'}}>
          <CheckCircle2 size={72} color="var(--success)" style={{margin:'0 auto 1.25rem',display:'block'}}/>
          <h2 style={{fontWeight:800,fontSize:'1.5rem',color:'var(--success)',marginBottom:'.5rem'}}>
            Attendance Marked! ✅
          </h2>
          <p className="text-muted" style={{marginBottom:'.5rem'}}>
            {session?.subject?.name} · {session?.room}
          </p>
          <p className="text-xs text-muted" style={{marginBottom:'1.5rem'}}>
            {new Date().toLocaleString()}
            {faceResult && ` · Face match score: ${faceResult.score}`}
          </p>
          <div style={{display:'flex',gap:'1rem',justifyContent:'center',marginBottom:'1rem'}}>
            <div className="card" style={{padding:'.75rem 1.25rem',textAlign:'center',flex:1,border:'1px solid #bbf7d0'}}>
              <div style={{fontSize:'1.3rem'}}>📶</div>
              <div className="text-xs text-muted">BLE Verified</div>
              <div style={{fontWeight:700,color:'var(--success)'}}>✓</div>
            </div>
            <div className="card" style={{padding:'.75rem 1.25rem',textAlign:'center',flex:1,border:'1px solid #bbf7d0'}}>
              <div style={{fontSize:'1.3rem'}}>🤳</div>
              <div className="text-xs text-muted">Face Matched</div>
              <div style={{fontWeight:700,color:'var(--success)'}}>✓</div>
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/student/dashboard')}>
            Back to Dashboard
          </button>
        </div>
      )}

      {/* ── Already marked ────────────────────────────────── */}
      {phase === 'already' && (
        <div className="card" style={{textAlign:'center',padding:'2.5rem 1rem'}}>
          <CheckCircle2 size={60} color="var(--primary)" style={{margin:'0 auto 1rem',display:'block'}}/>
          <h2 style={{fontWeight:700,marginBottom:'.5rem'}}>Already Marked!</h2>
          <p className="text-muted" style={{marginBottom:'1.5rem'}}>
            Your attendance for this session has already been recorded.
          </p>
          <button className="btn btn-ghost" onClick={() => navigate('/student/dashboard')}>
            Back to Dashboard
          </button>
        </div>
      )}

      {/* ── Error ─────────────────────────────────────────── */}
      {phase === 'error' && (
        <div className="card" style={{textAlign:'center',padding:'2.5rem 1rem'}}>
          <AlertCircle size={60} color="var(--danger)" style={{margin:'0 auto 1rem',display:'block'}}/>
          <h2 style={{fontWeight:700,marginBottom:'.5rem',color:'var(--danger)'}}>Error</h2>
          <p className="text-muted" style={{marginBottom:'1.5rem'}}>{errMsg || 'Something went wrong.'}</p>
          <button className="btn btn-ghost" onClick={() => navigate('/student/dashboard')}>
            Back to Dashboard
          </button>
        </div>
      )}
    </div>
  );
}
