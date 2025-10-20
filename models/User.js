// models/User.js
const mongoose = require('mongoose');

const ROLES = ['member', 'manager', 'admin'];

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    age: { type: Number, min: 0, max: 130 },

    role: { type: String, enum: ROLES, default: 'member', index: true },
    isActive: { type: Boolean, default: true, index: true },

    phoneNumber: { type: String, trim: true },
    address: { type: String, trim: true },
  },
  {
    timestamps: true,
    toJSON: { versionKey: false },
  }
);

module.exports = mongoose.model('User', UserSchema);


