// Validation utilities for CODESTORM registration form
// Strictly matches the required 5 fields + payment screenshot:
// Name | Roll Number | Email | Mobile Number | Year & Branch | Payment Screenshot

export const validators = {
  name: (value) => {
    if (!value || !value.trim()) return 'Full Name is required.';
    if (value.trim().length < 3) return 'Name must be at least 3 characters.';
    if (!/^[a-zA-Z\s.'-]+$/.test(value.trim())) return 'Name can only contain letters and spaces.';
    return null;
  },

  rollNumber: (value) => {
    if (!value || !value.trim()) return 'Roll Number / Student ID is required.';
    if (value.trim().length < 3) return 'Please enter a valid roll number.';
    return null;
  },

  email: (value) => {
    if (!value || !value.trim()) return 'Email address is required.';
    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(value.trim())) return 'Please enter a valid email address.';
    return null;
  },

  mobile: (value) => {
    if (!value || !value.trim()) return 'Mobile number is required.';
    const cleaned = value.replace(/\s/g, '');
    if (!/^[6-9]\d{9}$/.test(cleaned)) return 'Enter a valid 10-digit Indian mobile number.';
    return null;
  },

  yearAndBranch: (value) => {
    if (!value || value === '') return 'Please select your Year & Branch.';
    return null;
  },

  paymentScreenshot: (file) => {
    if (!file) return 'Payment screenshot is required.';
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) return 'Only JPG, PNG, or WebP images are accepted.';
    if (file.size > 5 * 1024 * 1024) return 'Image must be under 5MB.';
    return null;
  },
};

export const validateAll = (formData) => {
  const errors = {};
  Object.keys(validators).forEach((field) => {
    const error = validators[field](formData[field]);
    if (error) errors[field] = error;
  });
  return errors;
};

export const generateRegistrationId = () => {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `CODESTORM-2026-${num}`;
};
