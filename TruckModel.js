const mongoose = require('mongoose');

const truckSchema = new mongoose.Schema({
    truck_no: {
        type: String,
        required: true,
        unique: true,
    },
    status: {
        type: Number, // Use 1 for active, 0 for inactive, etc.
        default: 1,
    },
    plate_no: {
        type: String,
        required: true,
    },
    model: {
        type: String,
        required: true,
    },
    manufacturer: {
        type: String,
        required: true,
    },
    color: {
        type: String,
        required: true,
    },
    latitude: {
        type: String,
        required: true,
    },
    longitude: {
        type: String,
        required: true,
    },
    created_at: {
        type: Date,
        default: Date.now,
    },
    updated_at: {
        type: Date,
        default: Date.now,
    },
});

// Middleware to update the `updated_at` field on save
truckSchema.pre('save', function (next) {
    this.updated_at = Date.now();
    next();
});

const Truck = mongoose.model('Truck', truckSchema, 'truck');

module.exports = Truck;
