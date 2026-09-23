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

/**
 * Generate a random temporary password (minimum 8 characters, uppercase, lowercase, numbers, safe special chars)
 */
function generateTemporaryPassword(length = 10) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '@#$%&*';
  const all = upper + lower + digits + special;

  const getRandomChar = (set) => set[crypto.randomInt(0, set.length)];

  const pwdChars = [
    getRandomChar(upper),
    getRandomChar(upper),
    getRandomChar(lower),
    getRandomChar(lower),
    getRandomChar(digits),
    getRandomChar(digits),
    getRandomChar(special),
  ];

  while (pwdChars.length < length) {
    pwdChars.push(getRandomChar(all));
  }

  for (let i = pwdChars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [pwdChars[i], pwdChars[j]] = [pwdChars[j], pwdChars[i]];
  }

  return pwdChars.join('');
}

/**
 * Generate a unique Participant ID with format CS26-0001, CS26-0002...
 */
async function generateUniqueParticipantId(Registration, User = null, registrationId = null) {
  if (registrationId) {
    const match = String(registrationId).match(/\d+$/);
    if (match) {
      const num = parseInt(match[0], 10);
      if (!isNaN(num) && num > 0) {
        const candidate = `CS26-${String(num).padStart(4, '0')}`;
        const inReg = await Registration.exists({ participantId: candidate });
        const inUser = User ? await User.exists({ participantId: candidate }) : false;
        if (!inReg && !inUser) return candidate;
      }
    }
  }

  let seq = 1;
  let candidate = `CS26-${String(seq).padStart(4, '0')}`;
  let exists = true;
  while (exists) {
    candidate = `CS26-${String(seq).padStart(4, '0')}`;
    const inReg = await Registration.exists({ participantId: candidate });
    const inUser = User ? await User.exists({ participantId: candidate }) : false;
    exists = inReg || inUser;
    seq++;
  }
  return candidate;
}

module.exports = {
  generateRegistrationId,
  generateUniqueRegistrationId,
  generateTemporaryPassword,
  generateUniqueParticipantId,
};

