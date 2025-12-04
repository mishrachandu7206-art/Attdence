const express = require('express');
const router = express.Router();

const Class = require('../models/Class');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Teacher = require('../models/Teacher');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const verifyToken = require('../middleware/auth');

// Create class (teacher only)
router.post('/classes', verifyToken, async (req, res) => {
  try {
    const cls = new Class({ name: req.body.name });
    await cls.save();
    res.json(cls);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// List classes
router.get('/classes', async (req, res) => {
  const classes = await Class.find().sort({ createdAt: -1 });
  res.json(classes);
});

// Add student (teacher only)
router.post('/students', verifyToken, async (req, res) => {
  try {
    const student = new Student({ name: req.body.name, roll: req.body.roll, classId: req.body.classId });
    await student.save();
    res.json(student);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get students by class
router.get('/students', async (req, res) => {
  const { classId } = req.query;
  const query = classId ? { classId } : {};
  const students = await Student.find(query).sort({ roll: 1 });
  res.json(students);
});

// Create or update attendance for a class and date (teacher only)
router.post('/attendance', verifyToken, async (req, res) => {
  try {
    const { classId, date, present } = req.body; // present: array of studentIds
    if (!classId || !date) return res.status(400).json({ error: 'classId and date required' });

    const doc = await Attendance.findOneAndUpdate(
      { classId, date },
      { $set: { present: present || [] } },
      { upsert: true, new: true }
    );
    res.json(doc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Teacher registration
router.post('/teachers/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'name, email and password required' });
    const exists = await Teacher.findOne({ email });
    if (exists) return res.status(400).json({ error: 'Email already registered' });
    const hash = await bcrypt.hash(password, 10);
    const t = new Teacher({ name, email, password: hash });
    await t.save();
    res.json({ id: t._id, name: t.name, email: t.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Teacher login
router.post('/teachers/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    const t = await Teacher.findOne({ email });
    if (!t) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, t.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: t._id, email: t.email }, process.env.JWT_SECRET || 'secret123', { expiresIn: '8h' });
    res.json({ token, teacher: { id: t._id, name: t.name, email: t.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current teacher
router.get('/teachers/me', verifyToken, async (req, res) => {
  try {
    const t = await Teacher.findById(req.user.id).select('-password');
    res.json(t);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get attendance by class & date, or for a specific student
router.get('/attendance', async (req, res) => {
  const { classId, date, studentId } = req.query;
  try {
    // If studentId provided, return attendance records where the student was present.
    if (studentId) {
      const q = { present: studentId };
      if (classId) q.classId = classId;
      if (date) q.date = date;
      const records = await Attendance.find(q).populate('classId');
      return res.json(records);
    }

    const query = {};
    if (classId) query.classId = classId;
    if (date) query.date = date;
    const records = await Attendance.find(query).populate('present').populate('classId');
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
