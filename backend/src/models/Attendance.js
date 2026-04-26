const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AttendanceSession',
    required: true
  },
  status: {
    type: String,
    enum: ['Present'],
    default: 'Present'
  },
  // Verification flags
  bleVerified: {
    type: Boolean,
    default: false
  },
  rssiValue: {
    type: Number,   // Smoothed RSSI at verification time (e.g. -65)
    default: null
  },
  faceVerified: {
    type: Boolean,
    default: false
  },
  faceMatchScore: {
    type: Number,   // Euclidean distance (lower = better match, <0.55 = pass)
    default: null
  },
  locationVerified: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Prevent duplicate attendance for same student + session
AttendanceSchema.index({ student: 1, session: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
