import { useEffect, useState, useCallback } from 'react';
import { ScanFace, Camera, CheckCircle2, AlertCircle, RefreshCw, Info } from 'lucide-react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useFaceApi } from '../../hooks/useFaceApi';

const FACE_THRESHOLD = 0.52; // euclidean distance < this = same person

export default function FaceSetup() {
  const { user, refreshUser } = useAuth();
  const { modelsLoaded, loadingModels, modelError, videoRef, loadModels, startCamera, stopCamera, detectFace, capturePhotoBase64 } = useFaceApi();

  const [phase, setPhase]       = useState('intro');  // intro | camera | capturing | uploading | done | error
  const [detection, setDetection] = useState(null);   // face detection result
  const [countdown, setCountdown] = useState(null);
  const [errMsg,  setErrMsg]    = useState('');
  const [pollId,  setPollId]    = useState(null);

  useEffect(() => {
    loadModels();
    return () => { stopCamera(); clearInterval(pollId); };
  }, []);

  const openCamera = async () => {
    setPhase('camera');
    await startCamera('user');
    // Poll for face every 700ms
    const id = setInterval(async () => {
      const d = await detectFace();
      setDetection(d);
    }, 700);
    setPollId(id);
  };

  const capture = async () => {
    clearInterval(pollId);
    
    // Grab photo BEFORE any async operations that might cause React to unmount the video
    const photo = capturePhotoBase64(0.88);
    if (!photo) {
      setErrMsg('Camera not ready. Please try again.');
      setPhase('error');
      return;
    }

    // Now await face detection (or we could just use the existing `detection` state, 
    // but running it once more ensures we get the descriptor exactly matching the photo)
    const detected = await detectFace();
    if (!detected) {
      setErrMsg('No face detected. Please position your face in the camera and try again.');
      setPhase('error');
      return;
    }

    const descriptor = Array.from(detected.descriptor);

    setPhase('uploading');
    try {
      await api.post('/users/face', { descriptor, photoBase64: photo });
      await refreshUser();
      setPhase('done');
    } catch (err) {
      console.error(err);
      setErrMsg(err.response?.data?.msg || 'Upload failed. Please try again.');
      setPhase('error');
    }
    stopCamera();
  };

  const retry = () => {
    setPhase('intro'); setDetection(null); setErrMsg('');
    stopCamera(); clearInterval(pollId);
  };

  let faceBoxStyle = null;
  if (detection && videoRef.current && videoRef.current.videoWidth) {
    const video = videoRef.current;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const cw = video.clientWidth;
    const ch = video.clientHeight;

    const scale = Math.max(cw / vw, ch / vh);
    const scaledW = vw * scale;
    const scaledH = vh * scale;
    const offsetX = (scaledW - cw) / 2;
    const offsetY = (scaledH - ch) / 2;

    const box = detection.detection.box;
    const x = (box.x * scale) - offsetX;
    const y = (box.y * scale) - offsetY;
    const w = box.width * scale;
    const h = box.height * scale;

    const flippedX = cw - (x + w);

    faceBoxStyle = {
      position: 'absolute',
      border: '2px solid var(--success)',
      borderRadius: 8,
      left: `${flippedX}px`,
      top: `${y}px`,
      width: `${w}px`,
      height: `${h}px`,
      pointerEvents: 'none',
      transition: 'all .1s ease'
    };
  }

  return (
    <div className="page-md">
      <div className="page-title">Face ID Setup</div>
      <div className="page-sub">
        Enroll your face for attendance verification. An admin will approve it before it becomes active.
      </div>

      {/* Current status */}
      {user?.faceStatus && user.faceStatus !== 'none' && (
        <div className={`alert ${
          user.faceStatus === 'approved' ? 'alert-success' :
          user.faceStatus === 'pending'  ? 'alert-warning' : 'alert-error'
        } mb-4`}>
          {user.faceStatus === 'approved' && <><CheckCircle2 size={16}/> Your Face ID is approved and active. Re-enrolling will require admin approval again.</>}
          {user.faceStatus === 'pending'  && <><Info size={16}/> Your Face ID is pending admin approval. You'll be notified when approved.</>}
          {user.faceStatus === 'rejected' && <><AlertCircle size={16}/> Your Face ID was rejected. Please re-enroll with a clearer photo.</>}
        </div>
      )}

      {loadingModels && (
        <div className="alert alert-info mb-4">
          <div className="spinner" style={{width:16,height:16,borderWidth:2,marginRight:8}} />
          Loading AI face models (first time may take ~30 seconds)…
        </div>
      )}
      {modelError && <div className="alert alert-error mb-4"><AlertCircle size={16}/>{modelError}</div>}

      <div className="card">
        {/* ── Intro ─────────────────────────── */}
        {phase === 'intro' && (
          <div style={{textAlign:'center', padding:'2rem 1rem'}}>
            <div style={{width:80,height:80,borderRadius:'50%',background:'var(--primary-light)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 1.25rem'}}>
              <ScanFace size={40} color="var(--primary)"/>
            </div>
            <h2 style={{fontSize:'1.2rem',fontWeight:700,marginBottom:'.5rem'}}>Enroll Your Face</h2>
            <p className="text-muted" style={{maxWidth:380,margin:'0 auto 1.5rem',fontSize:'.92rem'}}>
              Position yourself in good lighting, look directly at the camera, and make sure your face is clearly visible. Remove glasses if possible.
            </p>
            <div style={{background:'var(--bg)',borderRadius:10,padding:'1rem',marginBottom:'1.5rem',textAlign:'left'}}>
              <div style={{fontWeight:600,marginBottom:'.5rem',fontSize:'.9rem'}}>Tips for best results:</div>
              {['Good, even lighting on your face','Face the camera directly','Neutral expression','No hat or sunglasses'].map(t=>(
                <div key={t} style={{display:'flex',alignItems:'center',gap:'.5rem',fontSize:'.85rem',color:'var(--text-muted)',marginBottom:'.3rem'}}>
                  <CheckCircle2 size={14} color="var(--success)"/> {t}
                </div>
              ))}
            </div>
            <button className="btn btn-primary btn-lg" onClick={openCamera} disabled={!modelsLoaded || loadingModels}>
              <Camera size={18}/> Open Camera
            </button>
          </div>
        )}

        {/* ── Camera ───────────────────────── */}
        {phase === 'camera' && (
          <div style={{textAlign:'center'}}>
            <h3 style={{fontWeight:700,marginBottom:'.75rem'}}>Position Your Face</h3>
            <div className="camera-wrap" style={{maxWidth:420,margin:'0 auto 1rem'}}>
              <video ref={videoRef} autoPlay playsInline muted style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',transform:'scaleX(-1)'}} />
              {faceBoxStyle && <div style={faceBoxStyle}/>}
              {!detection && (
                <div style={{position:'absolute',bottom:10,left:0,right:0,textAlign:'center'}}>
                  <span style={{background:'rgba(0,0,0,.6)',color:'#fff',borderRadius:999,padding:'.3rem .8rem',fontSize:'.8rem'}}>
                    Looking for face…
                  </span>
                </div>
              )}
              {detection && (
                <div style={{position:'absolute',bottom:10,left:0,right:0,textAlign:'center'}}>
                  <span style={{background:'rgba(22,163,74,.85)',color:'#fff',borderRadius:999,padding:'.3rem .8rem',fontSize:'.8rem',fontWeight:600}}>
                    ✓ Face detected — ready to capture!
                  </span>
                </div>
              )}
            </div>
            <div style={{display:'flex',justifyContent:'center',gap:'1rem', flexWrap:'wrap', width:'100%'}}>
              <button className="btn btn-ghost w-full md:w-auto" onClick={retry} style={{flex:1, minWidth:'120px'}}>Cancel</button>
              <button className="btn btn-success btn-lg w-full md:w-auto" onClick={capture} disabled={!detection} style={{flex:2, minWidth:'200px'}}>
                <ScanFace size={18}/> Capture & Submit
              </button>
            </div>
            <p className="text-xs text-muted mt-4">The green box confirms your face is detected. Click Capture when ready.</p>
          </div>
        )}

        {/* ── Capturing / Uploading ─────────── */}
        {(phase === 'capturing' || phase === 'uploading') && (
          <div style={{textAlign:'center',padding:'2rem'}}>
            <div className="spinner" style={{margin:'0 auto 1rem',width:40,height:40,borderWidth:3}} />
            <p style={{fontWeight:600}}>{phase === 'capturing' ? 'Analyzing face…' : 'Uploading to server…'}</p>
            <p className="text-muted text-sm mt-2">Please wait, do not close this page.</p>
          </div>
        )}

        {/* ── Done ─────────────────────────── */}
        {phase === 'done' && (
          <div style={{textAlign:'center',padding:'2rem'}}>
            <CheckCircle2 size={60} color="var(--success)" style={{margin:'0 auto 1rem',display:'block'}} />
            <h3 style={{fontWeight:700,fontSize:'1.2rem',marginBottom:'.5rem'}}>Face Enrolled Successfully!</h3>
            <p className="text-muted" style={{marginBottom:'1.5rem'}}>
              Your Face ID is now pending admin approval. You'll be able to mark attendance once approved.
            </p>
            <button className="btn btn-ghost" onClick={retry}><RefreshCw size={14}/> Re-enroll Again</button>
          </div>
        )}

        {/* ── Error ────────────────────────── */}
        {phase === 'error' && (
          <div style={{textAlign:'center',padding:'2rem'}}>
            <AlertCircle size={52} color="var(--danger)" style={{margin:'0 auto 1rem',display:'block'}}/>
            <h3 style={{fontWeight:700,fontSize:'1.1rem',marginBottom:'.5rem',color:'var(--danger)'}}>Enrollment Failed</h3>
            <p className="text-muted" style={{marginBottom:'1.5rem'}}>{errMsg}</p>
            <button className="btn btn-primary" onClick={retry}><RefreshCw size={14}/> Try Again</button>
          </div>
        )}
      </div>
    </div>
  );
}
