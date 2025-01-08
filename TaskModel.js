const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  task_no: String,
  truck_no: String,
  item: String,
  driver_id: String,
  assistant_id: String,
  driver_name: String,
  assistant_name: String,
  destination: String,
  estimated_time: String,
  company_name: String,
  latitude: { type: String },
  longitude: { type: String },
  proof_image: String, // Ensure this is a String type for the image URI
  status: { type: Number, default: 0 },
  ship_time: { type: Date, default: Date.now },
  completed_time: { type: Date },
  created_at: { type: Date },
  updated_at: { type: Date },
});

const Task = mongoose.model('task', TaskSchema, 'task');

module.exports = Task;