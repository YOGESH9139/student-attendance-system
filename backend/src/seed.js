/**
 * SEED SCRIPT — run once with: npm run seed
 * Creates: 1 admin + CSE IDP class + 68 students (24011P0501 to 24011P0568)
 * Default student password = their roll number (tell them to change on first login)
 */
require('dotenv').config();
const mongoose   = require('mongoose');
const bcrypt     = require('bcrypt');
const User       = require('./models/User');
const ClassGroup = require('./models/ClassGroup');

const ADMIN = {
  name:       'System Admin',
  rollNumber: 'ADMIN001',
  password:   'Admin@2024',
  role:       'admin'
};

const CLASS = {
  name:       'CSE IDP',
  department: 'CSE',
  year:       2,
  section:    'IDP'
};

// Generate roll numbers: 24011P0501 → 24011P0568
const BASE = '24011P05';
const rollNumbers = Array.from({ length: 68 }, (_, i) => {
  const num = String(i + 1).padStart(2, '0');
  return `${BASE}${num}`;
});

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // ── Admin ──────────────────────────────────────
    let admin = await User.findOne({ rollNumber: ADMIN.rollNumber });
    if (admin) {
      console.log('ℹ️  Admin already exists, skipping.');
    } else {
      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash(ADMIN.password, salt);
      admin = await User.create({ ...ADMIN, password: hashed });
      console.log(`✅ Admin created: ${ADMIN.rollNumber} / ${ADMIN.password}`);
    }

    // ── ClassGroup ─────────────────────────────────
    let group = await ClassGroup.findOne({ name: CLASS.name });
    if (group) {
      console.log('ℹ️  ClassGroup "CSE IDP" already exists, skipping creation.');
    } else {
      group = await ClassGroup.create({ ...CLASS, createdBy: admin._id });
      console.log(`✅ ClassGroup created: ${CLASS.name}`);
    }

    // ── Students ───────────────────────────────────
    let created = 0, skipped = 0;
    for (const roll of rollNumbers) {
      const exists = await User.findOne({ rollNumber: roll });
      if (exists) { skipped++; continue; }

      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash(roll, salt);
      await User.create({
        name:       roll,       // Name will be updated by student after first login (or admin can set)
        rollNumber: roll,
        password:   hashed,
        role:       'student',
        classGroup: group._id
      });
      created++;
    }

    console.log(`✅ Students: ${created} created, ${skipped} already existed`);

    // ── Subjects ───────────────────────────────────
    const Subject = require('./models/Subject');
    const subjectsList = ['DM', 'BEFA', 'OS', 'DBMS', 'SE', 'OSL', 'DBMSL', 'SDL'];
    let subjCreated = 0, subjSkipped = 0;
    
    for (const subjCode of subjectsList) {
      const exists = await Subject.findOne({ code: subjCode });
      if (exists) {
        subjSkipped++;
      } else {
        await Subject.create({
          name: subjCode, // using code as name as well
          code: subjCode,
          classGroup: group._id,
          instructor: admin._id
        });
        subjCreated++;
      }
    }
    console.log(`✅ Subjects: ${subjCreated} created, ${subjSkipped} already existed`);

    console.log('\n─────────────────────────────────────────');
    console.log('Seed complete!');
    console.log('Admin login:   ADMIN001 / Admin@2024');
    console.log('Student login: <roll number> / <roll number>');
    console.log('Example:       24011P0501 / 24011P0501');
    console.log('─────────────────────────────────────────\n');

  } catch (err) {
    console.error('❌ Seed error:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

seed();
