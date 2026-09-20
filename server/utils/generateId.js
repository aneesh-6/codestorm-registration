/**
 * Generate a unique registration ID: CS-2026-XXXX
 */
function generateRegistrationId() {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `CS-2026-${num}`;
}

/**
 * Generate a registration ID that is not already in the database.
 * @param {Model} Registration - Mongoose model
 */
async function generateUniqueRegistrationId(Registration) {
  let id;
  let exists = true;
  let attempts = 0;
  while (exists && attempts < 20) {
    id = generateRegistrationId();
    exists = await Registration.exists({ registrationId: id });
    attempts++;
  }
  if (exists) {
    throw new Error('Could not generate a unique registration ID. Please try again.');
  }
  return id;
}

module.exports = { generateRegistrationId, generateUniqueRegistrationId };
