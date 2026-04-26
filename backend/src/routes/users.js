const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const User    = require('../models/User');
const { uploadBase64, deleteByUrl } = require('../utils/cloudinary');

// ─────────────────────────────────────────────
// POST /api/users/face
// Private (student) — submit face enrollment
// Body: { descriptor: [128 floats], photoBase64: "data:image/jpeg;base64,..." }
// ─────────────────────────────────────────────
router.post('/face', auth, async (req, res) => {
  try {
    const { descriptor, photoBase64 } = req.body;

    if (!descriptor || !Array.isArray(descriptor) || descriptor.length !== 128) {
      console.log('400 Error: Invalid descriptor', typeof descriptor, Array.isArray(descriptor), descriptor?.length);
      return res.status(400).json({ msg: 'Invalid face descriptor' });
    }
    if (!photoBase64) {
      console.log('400 Error: Missing photoBase64');
      return res.status(400).json({ msg: 'Face photo required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    // Delete old photo from Cloudinary if exists
    if (user.facePhotoUrl) await deleteByUrl(user.facePhotoUrl);

    // Upload enrollment photo to Cloudinary
    const photoUrl = await uploadBase64(
      photoBase64,
      'sas/face-enrollments',
      `enrollment_${user.rollNumber}_${Date.now()}`
    );

    user.faceDescriptor = descriptor;
    user.facePhotoUrl   = photoUrl;
    user.faceStatus     = 'pending';
    user.faceUpdatedAt  = new Date();
    await user.save();

    res.json({ msg: 'Face submitted for approval', faceStatus: 'pending', facePhotoUrl: photoUrl });
  } catch (err) {
    console.error('Face upload error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ─────────────────────────────────────────────
// GET /api/users/face-approvals
// Private (admin) — get all pending face enrollments
// ─────────────────────────────────────────────
router.get('/face-approvals', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin')
      return res.status(403).json({ msg: 'Not authorized' });

    const pending = await User.find({ faceStatus: 'pending' })
      .select('-password -faceDescriptor')
      .populate('classGroup', 'name');

    res.json(pending);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ─────────────────────────────────────────────
// PATCH /api/users/:id/face-action
// Private (admin) — approve or reject face enrollment
// Body: { action: 'approve' | 'reject' }
// ─────────────────────────────────────────────
router.patch('/:id/face-action', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin')
      return res.status(403).json({ msg: 'Not authorized' });

    const { action } = req.body;
    if (!['approve', 'reject'].includes(action))
      return res.status(400).json({ msg: 'Invalid action' });

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });

    if (action === 'approve') {
      user.faceStatus   = 'approved';
      // Set profile pic from the enrollment photo
      user.profilePicUrl = user.facePhotoUrl;
    } else {
      user.faceStatus = 'rejected';
      // Clear descriptor on rejection
      user.faceDescriptor = [];
    }
    await user.save();

    res.json({ msg: `Face ${action}d successfully`, faceStatus: user.faceStatus });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ─────────────────────────────────────────────
// GET /api/users/students
// Private (admin) — list all students
// ─────────────────────────────────────────────
router.get('/students', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin')
      return res.status(403).json({ msg: 'Not authorized' });

    const students = await User.find({ role: 'student' })
      .select('-password -faceDescriptor')
      .populate('classGroup', 'name');

    res.json(students);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ─────────────────────────────────────────────
// GET /api/users/:id/descriptor
// Private — get face descriptor for a student (for client-side comparison)
// ─────────────────────────────────────────────
router.get('/:id/descriptor', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('faceDescriptor faceStatus');
    if (!user) return res.status(404).json({ msg: 'User not found' });
    if (user.faceStatus !== 'approved')
      return res.status(403).json({ msg: 'Face ID not approved yet' });

    res.json({ descriptor: user.faceDescriptor });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
