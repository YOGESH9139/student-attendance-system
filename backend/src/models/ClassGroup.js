const mongoose = require('mongoose');

const ClassGroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true    // e.g. "CSE IDP"
  },
  department: {
    type: String,
    required: true,
    trim: true    // e.g. "CSE"
  },
  year: {
    type: Number,
    required: true  // 1, 2, 3, 4
  },
  section: {
    type: String,
    required: true,
    trim: true    // e.g. "IDP", "A", "B"
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ClassGroup', ClassGroupSchema);
