import { useState, useRef, useCallback } from 'react';
import * as faceapi from 'face-api.js';

const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

/**
 * useFaceApi — loads face-api.js models, manages camera, detects & compares faces.
 * Uses TinyFaceDetector (lightweight, fast on mobile).
 */
export function useFaceApi() {
  const [modelsLoaded,  setModelsLoaded]  = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelError,    setModelError]    = useState('');

  const videoRef  = useRef(null);
  const streamRef = useRef(null);

  const loadModels = useCallback(async () => {
    if (modelsLoaded || loadingModels) return;
    setLoadingModels(true);
    setModelError('');
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      setModelsLoaded(true);
    } catch (err) {
      setModelError('Failed to load AI models. Check your internet connection and reload.');
      console.error('face-api load error:', err);
    } finally {
      setLoadingModels(false);
    }
  }, [modelsLoaded, loadingModels]);

  const startCamera = useCallback(async (facingMode = 'user') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      return stream;
    } catch (err) {
      throw new Error('Camera access denied. Please allow camera permission.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  /**
   * Detect a single face in the current video frame.
   * Returns a faceapi detection object with descriptor, or null.
   */
  const detectFace = useCallback(async () => {
    if (!videoRef.current || !modelsLoaded) return null;
    if (videoRef.current.readyState < 2) return null; // not ready
    try {
      return await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224 }))
        .withFaceLandmarks()
        .withFaceDescriptor() || null;
    } catch { return null; }
  }, [modelsLoaded]);

  /**
   * Capture a JPEG base64 screenshot from the current video frame.
   * quality: 0.0–1.0
   */
  const capturePhotoBase64 = useCallback((quality = 0.88) => {
    const video = videoRef.current;
    if (!video) return null;
    const canvas = document.createElement('canvas');
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    // Mirror for selfie-correct orientation
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', quality);
  }, []);

  /**
   * Compare two 128-dim descriptors. Returns euclidean distance.
   * Threshold: <0.5 = same person, 0.5–0.6 = borderline, >0.6 = different
   */
  const compareDescriptors = useCallback((d1, d2) => {
    if (!d1 || !d2 || d1.length !== d2.length) return 999;
    return faceapi.euclideanDistance(Array.from(d1), Array.from(d2));
  }, []);

  return {
    modelsLoaded, loadingModels, modelError,
    videoRef, streamRef,
    loadModels, startCamera, stopCamera,
    detectFace, capturePhotoBase64, compareDescriptors
  };
}
