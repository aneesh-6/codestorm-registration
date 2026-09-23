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
      required: [true, 'College name is required'],
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
      enum: ['CSE', 'CSE – Data Science', 'CSE – AI & ML', 'IT', 'ECE', 'EEE', 'Mechanical', 'Civil', 'Other'],
    },
    year: {
      type: String,
      required: [true, 'Year is required'],
      enum: ['1st Year', '2nd Year', '3rd Year', '4th Year'],
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
      match: [/^[6-9]\d{9}$/, 'Invalid 10-digit Indian mobile number'],
    },
    language: {
      type: String,
      required: [true, 'Programming language is required'],
      enum: ['C', 'C++', 'Java', 'Python'],
    },
    transactionId: {
      type: String,
      required: [true, 'Transaction ID is required'],
      trim: true,
      unique: true,
    },
    paymentScreenshotPath: {
      type: String,
      required: [true, 'Payment screenshot is required'],
    },
    declaration: {
      type: Boolean,
      required: true,
      validate: {
        validator: (v) => v === true,
        message: 'Declaration must be confirmed',
      },
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
