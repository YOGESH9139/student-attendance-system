const mongoose = require('mongoose');

const SubjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true    // e.g. "Data Structures"
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true    // e.g. "CS201"
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
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Subject', SubjectSchema);
