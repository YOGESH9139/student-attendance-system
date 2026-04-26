import { Bluetooth, BluetoothOff, BluetoothSearching } from 'lucide-react';

/**
 * RssiGauge — shows BLE signal strength visually.
 * rssiThreshold: the session's threshold (e.g. -75)
 * rssi: current smoothed RSSI value (negative dBm)
 * bleState: 'idle' | 'scanning' | 'connected' | 'error'
 */
export default function RssiGauge({ rssi, rssiThreshold = -75, bleState }) {
  // Normalize RSSI to a 0–100% bar
  // Typical range: -100 (terrible) to -30 (excellent)
  const MIN_RSSI = -100;
  const MAX_RSSI = -30;
  const pct = rssi != null
    ? Math.max(0, Math.min(100, ((rssi - MIN_RSSI) / (MAX_RSSI - MIN_RSSI)) * 100))
    : 0;

  const getZone = () => {
    if (rssi == null) return 'unknown';
    if (rssi >= rssiThreshold)           return 'inside';
    if (rssi >= rssiThreshold - 10)      return 'border';
    return 'outside';
  };

  const zone = getZone();

  const barColor = zone === 'inside'  ? 'var(--success)' :
                   zone === 'border'  ? 'var(--warning)' :
                   zone === 'outside' ? 'var(--danger)'  : 'var(--border)';

  const zoneLabel  = zone === 'inside'  ? '✅ Inside Classroom' :
                     zone === 'border'  ? '⚠️ Borderline — Move Closer' :
                     zone === 'outside' ? '❌ Outside Range' : '—';

  const stateIcon = bleState === 'scanning'  ? <BluetoothSearching size={18} color="var(--primary)" /> :
                    bleState === 'connected' ? <Bluetooth           size={18} color="var(--success)" /> :
                                              <BluetoothOff        size={18} color="var(--text-muted)" />;

  return (
    <div className="ble-gauge">
      <div className="ble-status-row">
        <span style={{ display:'flex', alignItems:'center', gap:'.4rem' }}>
          {stateIcon}
          <span className="text-sm" style={{ fontWeight:600 }}>
            {bleState === 'idle'      && 'Beacon Not Connected'}
            {bleState === 'scanning'  && 'Searching for Beacon…'}
            {bleState === 'connected' && 'Beacon Connected'}
            {bleState === 'error'     && 'Connection Failed'}
          </span>
        </span>
        <span className="ble-rssi-val">
          {rssi != null ? `${rssi} dBm` : '— dBm'}
        </span>
      </div>

      <div className="ble-bar-track">
        <div
          className="ble-bar-fill"
          style={{ width: `${pct}%`, background: barColor, transition: 'width .5s ease, background .3s' }}
        />
      </div>

      <div className="ble-status-row">
        <span className={`ble-zone-badge ble-zone-${zone}`}>
          {bleState === 'connected' ? zoneLabel : ''}
        </span>
        <span className="text-xs text-muted">
          Threshold: {rssiThreshold} dBm
        </span>
      </div>
    </div>
  );
}
