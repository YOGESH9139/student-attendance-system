const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  rollNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['student', 'admin'],
    default: 'student'
  },
  // Only for students
  classGroup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ClassGroup',
    default: null
  },
  // Face verification
  faceDescriptor: {
    type: [Number],   // 128-dim Float32 from face-api.js
    default: []
  },
  faceStatus: {
    type: String,
    enum: ['none', 'pending', 'approved', 'rejected'],
    default: 'none'
  },
  facePhotoUrl: {
    type: String,     // Cloudinary URL of enrollment photo
    default: null
  },
  profilePicUrl: {
    type: String,     // Cloudinary URL — set after face approval
    default: null
  },
  faceUpdatedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', UserSchema);
