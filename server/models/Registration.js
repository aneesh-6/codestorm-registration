const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema(
  {
    registrationId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [3, 'Name must be at least 3 characters'],
    },
    college: {
      type: String,
      default: 'Malla Reddy Engineering College and Management Sciences',
      trim: true,
    },
    rollNumber: {
      type: String,
      required: [true, 'Roll number is required'],
      trim: true,
      unique: true,
    },
    branch: {
      type: String,
      required: [true, 'Branch is required'],
    },
    year: {
      type: String,
      required: [true, 'Year is required'],
    },
    section: {
      type: String,
      default: 'A',
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      unique: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'],
    },
    mobile: {
      type: String,
      required: [true, 'Mobile number is required'],
    },
    language: {
      type: String,
      default: 'Python',
    },
    transactionId: {
      type: String,
      trim: true,
    },
    paymentScreenshotPath: {
      type: String,
      default: '',
    },
    declaration: {
      type: Boolean,
      default: true,
    },
    participantId: {
      type: String,
      sparse: true,
      unique: true,
    },
    passwordHash: {
      type: String,
    },
    role: {
      type: String,
      default: 'participant',
    },
    mustChangePassword: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Registration', registrationSchema);
