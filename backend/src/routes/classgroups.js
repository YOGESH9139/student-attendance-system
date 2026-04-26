const express    = require('express');
const router     = express.Router();
const auth       = require('../middleware/auth');
const ClassGroup = require('../models/ClassGroup');
const User       = require('../models/User');
const bcrypt     = require('bcrypt');
const { parse }  = require('csv-parse/sync');

// ─────────────────────────────────────────────
// POST /api/classgroups
// Private (admin) — create a class group
// ─────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin')
      return res.status(403).json({ msg: 'Not authorized' });

    const { name, department, year, section } = req.body;
    if (!name || !department || !year || !section)
      return res.status(400).json({ msg: 'All fields required' });

    const group = new ClassGroup({
      name: name.trim(),
      department: department.trim(),
      year: parseInt(year),
      section: section.trim(),
      createdBy: req.user.id
    });
    await group.save();
    res.status(201).json(group);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ─────────────────────────────────────────────
// GET /api/classgroups
// Private (admin) — list all class groups
// ─────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin')
      return res.status(403).json({ msg: 'Not authorized' });

    const groups = await ClassGroup.find().populate('createdBy', 'name');
    res.json(groups);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ─────────────────────────────────────────────
// POST /api/classgroups/:id/add-student
// Private (admin) — add a single student by roll number
// Body: { rollNumber, name }  (name optional — auto-set to roll number if missing)
// ─────────────────────────────────────────────
router.post('/:id/add-student', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin')
      return res.status(403).json({ msg: 'Not authorized' });

    const group = await ClassGroup.findById(req.params.id);
    if (!group) return res.status(404).json({ msg: 'Class group not found' });

    const { rollNumber, name } = req.body;
    if (!rollNumber) return res.status(400).json({ msg: 'Roll number required' });

    const upper = rollNumber.toUpperCase().trim();

    // Check if already exists
    let student = await User.findOne({ rollNumber: upper });
    if (student) {
      // Just assign to this class if not already
      if (student.classGroup && student.classGroup.toString() !== group.id)
        return res.status(400).json({ msg: 'Student already in a different class' });
      student.classGroup = group.id;
      await student.save();
      return res.json({ msg: 'Student assigned to class', student });
    }

    // Create new student account, default password = roll number
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(upper, salt);

    student = new User({
      name:       name ? name.trim() : upper,
      rollNumber: upper,
      password:   hashed,
      role:       'student',
      classGroup: group.id
    });
    await student.save();

    res.status(201).json({ msg: 'Student added', student: { id: student.id, rollNumber: student.rollNumber, name: student.name } });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ─────────────────────────────────────────────
// POST /api/classgroups/:id/import-csv
// Private (admin) — bulk import students via CSV
// Body: { csv: "rollNumber,name\n24011P0501,Student One\n..." }
// CSV columns: rollNumber (required), name (optional)
// ─────────────────────────────────────────────
router.post('/:id/import-csv', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin')
      return res.status(403).json({ msg: 'Not authorized' });

    const group = await ClassGroup.findById(req.params.id);
    if (!group) return res.status(404).json({ msg: 'Class group not found' });

    const { csv } = req.body;
    if (!csv) return res.status(400).json({ msg: 'CSV data required' });

    // Parse CSV
    let records;
    try {
      records = parse(csv.trim(), {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });
    } catch (parseErr) {
      return res.status(400).json({ msg: 'Invalid CSV format. Columns: rollNumber, name' });
    }

    const results = { added: [], updated: [], errors: [] };

    for (const row of records) {
      const rollNumber = row.rollNumber?.toUpperCase().trim();
      const name       = row.name?.trim() || rollNumber;

      if (!rollNumber) { results.errors.push({ row, reason: 'Missing rollNumber' }); continue; }

      try {
        let student = await User.findOne({ rollNumber });
        if (student) {
          student.classGroup = group.id;
          if (name && name !== rollNumber) student.name = name;
          await student.save();
          results.updated.push(rollNumber);
        } else {
          const salt = await bcrypt.genSalt(10);
          const hashed = await bcrypt.hash(rollNumber, salt);
          student = new User({ name, rollNumber, password: hashed, role: 'student', classGroup: group.id });
          await student.save();
          results.added.push(rollNumber);
        }
      } catch (e) {
        results.errors.push({ rollNumber, reason: e.message });
      }
    }

    res.json({
      msg: `Import complete: ${results.added.length} added, ${results.updated.length} updated, ${results.errors.length} errors`,
      results
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ─────────────────────────────────────────────
// GET /api/classgroups/:id/students
// Private (admin) — list students in a class
// ─────────────────────────────────────────────
router.get('/:id/students', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin')
      return res.status(403).json({ msg: 'Not authorized' });

    const students = await User.find({ classGroup: req.params.id, role: 'student' })
      .select('-password -faceDescriptor')
      .sort({ rollNumber: 1 });

    res.json(students);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
