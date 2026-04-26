const mongoose = require('mongoose');

// Fixed BLE service UUID for this system (same in ESP32 firmware)
const SYSTEM_BLE_UUID = '12ab34cd-56ef-7890-abcd-ef1234567890';

const AttendanceSessionSchema = new mongoose.Schema({
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  classGroup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ClassGroup',
    required: true
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  room: {
    type: String,
    required: true,
    trim: true    // e.g. "Room 203, Block A"
  },
  // BLE Configuration
  bleDeviceName: {
    type: String,
    default: 'CLASSROOM_101'
  },
  bleServiceUUID: {
    type: String,
    default: SYSTEM_BLE_UUID
  },
  rssiThreshold: {
    type: Number,
    default: -75    // dBm — students within this RSSI value are "inside"
  },
  // GPS (optional layer)
  useGpsVerification: {
    type: Boolean,
    default: false
  },
  location: {
    latitude:  { type: Number, default: null },
    longitude: { type: Number, default: null },
    radius:    { type: Number, default: 100 }  // meters
  },
  // Session state
  isActive: {
    type: Boolean,
    default: true
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date,
    required: true
  },
  duration: {
    type: Number,
    required: true    // minutes
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AttendanceSession', AttendanceSessionSchema);
