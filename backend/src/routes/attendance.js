const express           = require('express');
const router            = express.Router();
const auth              = require('../middleware/auth');
const Attendance        = require('../models/Attendance');
const AttendanceSession = require('../models/AttendanceSession');
const User              = require('../models/User');

// Helper: haversine distance in meters
function haversineM(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// POST /api/attendance/mark — student marks attendance
router.post('/mark', auth, async (req, res) => {
  try {
    const { sessionId, bleVerified, rssiValue, faceVerified, faceMatchScore, location } = req.body;
    if (!sessionId) return res.status(400).json({ msg: 'sessionId required' });

    const session = await AttendanceSession.findById(sessionId);
    if (!session || !session.isActive || new Date() > session.endTime)
      return res.status(400).json({ msg: 'Session is inactive or expired' });

    // Verify student is in session's class
    const student = await User.findById(req.user.id).select('classGroup faceStatus');
    if (!student?.classGroup || student.classGroup.toString() !== session.classGroup.toString())
      return res.status(403).json({ msg: 'You are not enrolled in this class' });

    // Face must be approved
    if (student.faceStatus !== 'approved')
      return res.status(400).json({ msg: 'Face ID not approved. Contact admin.' });

    // Check if already marked
    const existing = await Attendance.findOne({ student: req.user.id, session: sessionId });
    if (existing) return res.status(400).json({ msg: 'Attendance already marked' });

    // BLE must be verified
    if (!bleVerified) return res.status(400).json({ msg: 'BLE proximity not verified' });

    // Face must be verified
    if (!faceVerified) return res.status(400).json({ msg: 'Face verification failed' });

    // Optional GPS check
    let locationVerified = !session.useGpsVerification; // true if GPS not required
    if (session.useGpsVerification && location) {
      const dist = haversineM(
        session.location.latitude, session.location.longitude,
        location.latitude, location.longitude
      );
      locationVerified = dist <= session.location.radius;
      if (!locationVerified)
        return res.status(400).json({ msg: `Too far from classroom (${Math.round(dist)}m away)` });
    }

    const attendance = new Attendance({
      student:         req.user.id,
      session:         sessionId,
      status:          'Present',
      bleVerified,
      rssiValue:       rssiValue || null,
      faceVerified,
      faceMatchScore:  faceMatchScore || null,
      locationVerified
    });
    await attendance.save();

    res.json({ msg: 'Attendance marked successfully ✅', attendance });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// GET /api/attendance/my — student's own history
router.get('/my', auth, async (req, res) => {
  try {
    const records = await Attendance.find({ student: req.user.id })
      .populate({ path: 'session', populate: [{ path: 'subject', select: 'name code' }, { path: 'classGroup', select: 'name' }] })
      .sort({ timestamp: -1 });
    res.json(records);
  } catch (err) { console.error(err.message); res.status(500).json({ msg: 'Server error' }); }
});

// Helper for stats computation
async function computeStudentStats(studentId, classGroupId) {
  const sessions = await AttendanceSession.find({ classGroup: classGroupId, endTime: { $lt: new Date() } }).populate('subject', 'name code');
  const attendances = await Attendance.find({ student: studentId });

  let subjectStats = {};
  sessions.forEach(s => {
    const subjId = s.subject?._id?.toString();
    if (!subjId) return;
    if (!subjectStats[subjId]) subjectStats[subjId] = { name: s.subject.name, code: s.subject.code, total: 0, attended: 0 };
    subjectStats[subjId].total++;
  });

  let attendedCount = 0;
  attendances.forEach(a => {
    const s = sessions.find(sess => sess._id.toString() === a.session.toString());
    if (s) {
      attendedCount++;
      const subjId = s.subject?._id?.toString();
      if (subjId && subjectStats[subjId]) subjectStats[subjId].attended++;
    }
  });

  const totalSessions = sessions.length;
  const overall = {
    total: totalSessions,
    attended: attendedCount,
    percentage: totalSessions > 0 ? Math.round((attendedCount / totalSessions) * 100) : 0
  };

  const subjects = Object.values(subjectStats).map(s => ({
    ...s,
    percentage: s.total > 0 ? Math.round((s.attended / s.total) * 100) : 0
  }));

  return { overall, subjects };
}

// GET /api/attendance/my-stats — student's stats
router.get('/my-stats', auth, async (req, res) => {
  try {
    const student = await User.findById(req.user.id);
    if (!student || student.role !== 'student') return res.status(403).json({ msg: 'Not a student' });
    const stats = await computeStudentStats(student._id, student.classGroup);
    res.json(stats);
  } catch (err) { console.error(err.message); res.status(500).json({ msg: 'Server error' }); }
});

// GET /api/attendance/student/:id/stats — admin: student's stats
router.get('/student/:id/stats', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Not authorized' });
    const student = await User.findById(req.params.id);
    if (!student || student.role !== 'student') return res.status(404).json({ msg: 'Student not found' });
    const stats = await computeStudentStats(student._id, student.classGroup);
    res.json(stats);
  } catch (err) { console.error(err.message); res.status(500).json({ msg: 'Server error' }); }
});

// GET /api/attendance/all — admin: all records
router.get('/all', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Not authorized' });
    const records = await Attendance.find()
      .populate('student', 'name rollNumber profilePicUrl')
      .populate({ path: 'session', populate: [{ path: 'subject', select: 'name code' }, { path: 'classGroup', select: 'name' }] })
      .sort({ timestamp: -1 }).limit(200);
    res.json(records);
  } catch (err) { console.error(err.message); res.status(500).json({ msg: 'Server error' }); }
});

// GET /api/attendance/session/:sessionId — admin: records for one session
router.get('/session/:sessionId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Not authorized' });
    const records = await Attendance.find({ session: req.params.sessionId })
      .populate('student', 'name rollNumber profilePicUrl facePhotoUrl')
      .sort({ timestamp: 1 });
    res.json(records);
  } catch (err) { console.error(err.message); res.status(500).json({ msg: 'Server error' }); }
});

// GET /api/attendance/stats — admin: summary stats for dashboard
router.get('/stats', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Not authorized' });
    const total = await Attendance.countDocuments();
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const today = await Attendance.countDocuments({ timestamp: { $gte: todayStart } });
    res.json({ total, today });
  } catch (err) { console.error(err.message); res.status(500).json({ msg: 'Server error' }); }
});

// GET /api/attendance/subject-stats — admin: global subject stats
router.get('/subject-stats', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Not authorized' });
    const sessions = await AttendanceSession.find({ endTime: { $lt: new Date() } }).populate('subject', 'name code').populate('classGroup');
    const allStudents = await User.find({ role: 'student' }).select('classGroup');
    
    // Group students by classGroup to know how many per class
    const classCount = {};
    allStudents.forEach(s => {
      const cgId = s.classGroup?.toString();
      if (cgId) classCount[cgId] = (classCount[cgId] || 0) + 1;
    });

    const attendances = await Attendance.find();

    let subjectStats = {};
    sessions.forEach(s => {
      const subjId = s.subject?._id?.toString();
      if (!subjId) return;
      if (!subjectStats[subjId]) {
        subjectStats[subjId] = { name: s.subject.name, code: s.subject.code, expected: 0, attended: 0 };
      }
      const cgId = s.classGroup?._id?.toString();
      const studentsInClass = cgId ? (classCount[cgId] || 0) : 0;
      subjectStats[subjId].expected += studentsInClass;
    });

    attendances.forEach(a => {
      const s = sessions.find(sess => sess._id.toString() === a.session.toString());
      if (s) {
        const subjId = s.subject?._id?.toString();
        if (subjId && subjectStats[subjId]) {
          subjectStats[subjId].attended++;
        }
      }
    });

    const subjects = Object.values(subjectStats).map(s => ({
      ...s,
      percentage: s.expected > 0 ? Math.round((s.attended / s.expected) * 100) : 0
    }));

    res.json(subjects);
  } catch (err) { console.error(err.message); res.status(500).json({ msg: 'Server error' }); }
});

module.exports = router;
