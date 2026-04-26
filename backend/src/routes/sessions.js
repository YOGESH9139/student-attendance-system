const express           = require('express');
const router            = express.Router();
const auth              = require('../middleware/auth');
const AttendanceSession = require('../models/AttendanceSession');
const User              = require('../models/User');

const BLE_UUID = '12ab34cd-56ef-7890-abcd-ef1234567890';

router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Not authorized' });
    const { subjectId, classGroupId, room, bleDeviceName, rssiThreshold, useGpsVerification, location, duration } = req.body;
    if (!subjectId || !classGroupId || !room || !duration)
      return res.status(400).json({ msg: 'subject, classGroup, room, duration required' });

    const session = new AttendanceSession({
      subject: subjectId, classGroup: classGroupId, instructor: req.user.id,
      room: room.trim(), bleDeviceName: bleDeviceName || 'CLASSROOM_101',
      bleServiceUUID: BLE_UUID, rssiThreshold: rssiThreshold || -75,
      useGpsVerification: useGpsVerification || false, location: location || {},
      duration: parseInt(duration), isActive: true,
      startTime: new Date(), endTime: new Date(Date.now() + parseInt(duration) * 60000)
    });
    await session.save();
    const pop = await AttendanceSession.findById(session.id)
      .populate('subject', 'name code').populate('classGroup', 'name').populate('instructor', 'name');
    res.status(201).json(pop);
  } catch (err) { console.error(err.message); res.status(500).json({ msg: 'Server error' }); }
});

router.get('/my', auth, async (req, res) => {
  try {
    const student = await User.findById(req.user.id).select('classGroup');
    if (!student?.classGroup) return res.json([]);
    const sessions = await AttendanceSession.find({
      classGroup: student.classGroup, isActive: true, endTime: { $gt: new Date() }
    }).populate('subject', 'name code').populate('classGroup', 'name').populate('instructor', 'name').sort({ startTime: -1 });
    res.json(sessions);
  } catch (err) { console.error(err.message); res.status(500).json({ msg: 'Server error' }); }
});

router.get('/active', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Not authorized' });
    const sessions = await AttendanceSession.find({ isActive: true, endTime: { $gt: new Date() } })
      .populate('subject', 'name code').populate('classGroup', 'name').populate('instructor', 'name').sort({ startTime: -1 });
    res.json(sessions);
  } catch (err) { console.error(err.message); res.status(500).json({ msg: 'Server error' }); }
});

router.get('/all', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Not authorized' });
    const sessions = await AttendanceSession.find()
      .populate('subject', 'name code').populate('classGroup', 'name').populate('instructor', 'name')
      .sort({ startTime: -1 }).limit(100);
    res.json(sessions);
  } catch (err) { console.error(err.message); res.status(500).json({ msg: 'Server error' }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const session = await AttendanceSession.findById(req.params.id)
      .populate('subject', 'name code').populate('classGroup', 'name').populate('instructor', 'name');
    if (!session) return res.status(404).json({ msg: 'Session not found' });
    res.json(session);
  } catch (err) { console.error(err.message); res.status(500).json({ msg: 'Server error' }); }
});

router.patch('/:id/stop', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Not authorized' });
    const session = await AttendanceSession.findByIdAndUpdate(req.params.id,
      { isActive: false, endTime: new Date() }, { new: true });
    if (!session) return res.status(404).json({ msg: 'Session not found' });
    res.json({ msg: 'Session stopped', session });
  } catch (err) { console.error(err.message); res.status(500).json({ msg: 'Server error' }); }
});

module.exports = router;
