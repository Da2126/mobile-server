const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employee_id: { type: String, required: true },  // Store the employee's unique ID here
  sessions: [
    {
      time_in: { type: Date, required: true },
      time_out: { type: Date, required: false },
      created_at: { type: Date },
    },
  ],
});

const Attendance = mongoose.model('Attendance', attendanceSchema, 'attendance');
module.exports = Attendance;
