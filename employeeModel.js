const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema({
    Employee_id: { type: String, required: true, unique: true },
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    midle_name: { type: String },
    email: { type: String, required: true, unique: true },
    contact_no: { type: String, required: true },
    password: { type: String, required: true },
    status: { type: Number, default: 0 },
    is_active: { type: Number, default: 1 },
    created_at: { type: Date, default: Date.now },
    images: { type: String },
    gender: String,
    address: String, 
    role: String,
    birthday: Date, 
}, { 
    collection: 'employee',
    versionKey: false 
});

const Employee = mongoose.model("employee", employeeSchema);

module.exports = Employee;
