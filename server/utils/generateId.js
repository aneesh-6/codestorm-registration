const crypto = require('crypto');

/**
 * Generate a unique registration ID: CODESTORM-2026-XXXX
 */
function generateRegistrationId(seq = null) {
  if (seq) {
    return `CODESTORM-2026-${String(seq).padStart(4, '0')}`;
  }
  const num = Math.floor(1000 + Math.random() * 9000);
  return `CODESTORM-2026-${num}`;
}

/**
 * Generate a registration ID that is not already in the database.
 * @param {Model} Registration - Mongoose model
 */
async function generateUniqueRegistrationId(Registration) {
  const count = await Registration.countDocuments();
  let candidate = generateRegistrationId(count + 1);
  let exists = await Registration.exists({ registrationId: candidate });
  let attempts = 0;
  while (exists && attempts < 20) {
    candidate = generateRegistrationId();
    exists = await Registration.exists({ registrationId: candidate });
    attempts++;
  }
  if (exists) {
    throw new Error('Could not generate a unique registration ID. Please try again.');
  }
  return candidate;
}

module.exports = {
  generateRegistrationId,
  generateUniqueRegistrationId,
};

