import { useState, useRef, useCallback } from 'react';

/**
 * Kalman filter for RSSI smoothing — reduces noise in BLE signal readings.
 * R = measurement noise, Q = process variance
 */
class KalmanFilter {
  constructor(R = 4, Q = 0.1) {
    this.R = R; this.Q = Q;
    this.x = null; this.P = 1;
  }
  filter(z) {
    if (this.x === null) { this.x = z; return this.x; }
    this.P = this.P + this.Q;
    const K = this.P / (this.P + this.R);
    this.x = this.x + K * (z - this.x);
    this.P = (1 - K) * this.P;
    return Math.round(this.x);
  }
}

/**
 * useBle — Web Bluetooth hook for scanning a specific beacon.
 *
 * Multi-beacon support: pass the session-specific bleDeviceName + bleServiceUUID.
 * Each classroom's ESP32 has a unique device name; the student app connects to the
 * correct one automatically based on their session's configuration.
 *
 * RSSI is read via watchAdvertisements() (Chrome 79+, Desktop & Android).
 * If unavailable, we fall back to "connected = inside" mode.
 */
export function useBle() {
  const [rssi,     setRssi]     = useState(null);
  const [bleState, setBleState] = useState('idle'); // idle | scanning | connected | error
  const [bleError, setBleError] = useState('');
  const [rssiHistory, setRssiHistory] = useState([]);

  const deviceRef   = useRef(null);
  const kf          = useRef(new KalmanFilter());
  const watchActive = useRef(false);

  /** Call with { bleDeviceName, bleServiceUUID, rssiThreshold } from the session */
  const startScan = useCallback(async ({ bleDeviceName, bleServiceUUID }) => {
    if (!navigator.bluetooth) {
      setBleError('Web Bluetooth not supported. Use Chrome on Android or Desktop.');
      setBleState('error');
      return false;
    }

    setBleState('scanning');
    setBleError('');
    kf.current = new KalmanFilter();

    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [bleServiceUUID]
      });

      deviceRef.current = device;

      // Disconnect handler
      device.addEventListener('gattserverdisconnected', () => {
        setBleState('idle');
        setRssi(null);
        watchActive.current = false;
      });

      // STRICT REQUIREMENT: watchAdvertisements must be enabled for live RSSI
      if (typeof device.watchAdvertisements !== 'function') {
        setBleError('Live distance tracking is disabled in your browser. Please go to chrome://flags/#enable-experimental-web-platform-features, set it to Enabled, and relaunch Chrome.');
        setBleState('error');
        return false;
      }

      await device.watchAdvertisements();
      watchActive.current = true;

      device.addEventListener('advertisementreceived', (event) => {
        if (event.rssi != null) {
          const smooth = kf.current.filter(event.rssi);
          setRssi(smooth);
          setRssiHistory(prev => {
            const next = [...prev, smooth];
            return next.length > 20 ? next.slice(-20) : next;
          });
        }
      });
      setBleState('connected');
      
      return true;
    } catch (err) {
      const msg =
        err.name === 'NotFoundError'   ? 'Beacon not found. Make sure you are in the classroom.' :
        err.name === 'SecurityError'   ? 'Bluetooth permission denied. Please allow Bluetooth access.' :
        err.name === 'NotSupportedError' ? 'Bluetooth not available on this device.' :
        err.message || 'BLE connection failed.';
      
      // Don't overwrite our custom flag error
      if (bleState !== 'error') {
        setBleError(msg);
        setBleState('error');
      }
      return false;
    }
  }, [bleState]);

  const stopScan = useCallback(() => {
    const device = deviceRef.current;
    if (device) {
      try { if (watchActive.current) device.unwatchAdvertisements?.(); } catch {}
      try { if (device.gatt?.connected) device.gatt.disconnect(); } catch {}
      deviceRef.current = null;
    }
    watchActive.current = false;
    setBleState('idle');
    setRssi(null);
    setRssiHistory([]);
  }, []);

  /** Returns true if current RSSI is within or better than threshold (RSSI >= threshold) */
  const isInside = useCallback((threshold) => {
    if (rssi === null) return false;
    return rssi >= threshold;
  }, [rssi]);

  return { rssi, bleState, bleError, rssiHistory, startScan, stopScan, isInside };
}
