const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    participantId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    registrationId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['participant', 'coordinator', 'admin'],
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

module.exports = mongoose.model('User', userSchema);
