const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  date: { type: String, required: true }, // use ISO date string (yyyy-mm-dd)
  present: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }]
});

AttendanceSchema.index({ classId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
