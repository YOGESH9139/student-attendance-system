const express  = require('express');
const router   = express.Router();
const auth     = require('../middleware/auth');
const Subject  = require('../models/Subject');

// ─────────────────────────────────────────────
// POST /api/subjects
// Private (admin) — create a subject
// ─────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin')
      return res.status(403).json({ msg: 'Not authorized' });

    const { name, code, classGroupId } = req.body;
    if (!name || !code || !classGroupId)
      return res.status(400).json({ msg: 'name, code, and classGroupId are required' });

    const existing = await Subject.findOne({ code: code.toUpperCase().trim() });
    if (existing)
      return res.status(400).json({ msg: 'Subject code already exists' });

    const subject = new Subject({
      name:       name.trim(),
      code:       code.toUpperCase().trim(),
      classGroup: classGroupId,
      instructor: req.user.id
    });
    await subject.save();
    res.status(201).json(subject);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ─────────────────────────────────────────────
// GET /api/subjects
// Private (admin) — list all subjects
// ─────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin')
      return res.status(403).json({ msg: 'Not authorized' });

    const subjects = await Subject.find()
      .populate('classGroup', 'name')
      .populate('instructor', 'name rollNumber')
      .sort({ createdAt: -1 });
    res.json(subjects);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ─────────────────────────────────────────────
// GET /api/subjects/by-group/:classGroupId
// Private — list subjects for a specific class group
// ─────────────────────────────────────────────
router.get('/by-group/:classGroupId', auth, async (req, res) => {
  try {
    const subjects = await Subject.find({ classGroup: req.params.classGroupId })
      .populate('instructor', 'name');
    res.json(subjects);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/subjects/:id
// Private (admin)
// ─────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin')
      return res.status(403).json({ msg: 'Not authorized' });

    await Subject.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Subject deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
