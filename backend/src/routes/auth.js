const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const auth    = require('../middleware/auth');
const User    = require('../models/User');

const signToken = (user) =>
  jwt.sign(
    { user: { id: user.id, role: user.role } },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

// ─────────────────────────────────────────────
// POST /api/auth/register
// Public — students register with roll number
// ─────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, rollNumber, password } = req.body;

    if (!name || !rollNumber || !password)
      return res.status(400).json({ msg: 'All fields are required' });

    const upper = rollNumber.toUpperCase().trim();

    let existing = await User.findOne({ rollNumber: upper });
    if (existing)
      return res.status(400).json({ msg: 'Roll number already registered' });

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const user = new User({ name: name.trim(), rollNumber: upper, password: hashed, role: 'student' });
    await user.save();

    const token = signToken(user);
    res.json({
      token,
      user: { id: user.id, name: user.name, rollNumber: user.rollNumber, role: user.role, classGroup: user.classGroup }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/login
// Public — login with roll number + password
// ─────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { rollNumber, password } = req.body;

    if (!rollNumber || !password)
      return res.status(400).json({ msg: 'Roll number and password required' });

    const user = await User.findOne({ rollNumber: rollNumber.toUpperCase().trim() });
    if (!user)
      return res.status(400).json({ msg: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ msg: 'Invalid credentials' });

    const token = signToken(user);
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        rollNumber: user.rollNumber,
        role: user.role,
        classGroup: user.classGroup,
        profilePicUrl: user.profilePicUrl,
        faceStatus: user.faceStatus
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ─────────────────────────────────────────────
// GET /api/auth/me
// Private — get current logged-in user
// ─────────────────────────────────────────────
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password -faceDescriptor')
      .populate('classGroup', 'name department year section');
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
