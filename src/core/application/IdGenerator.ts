export type IdGenerator = () => string;

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';
const RANDOM_PART_LENGTH = 12;
const TIME_PART_LENGTH = 9;

/**
 * Generates time-sortable, collision-resistant identifiers
 * (base36 timestamp + random suffix). IDs are opaque and stable: once
 * persisted they are never regenerated or derived from user-visible data.
 */
export const generateId: IdGenerator = () => {
  const time = Date.now().toString(36).padStart(TIME_PART_LENGTH, '0');
  let random = '';
  for (let i = 0; i < RANDOM_PART_LENGTH; i++) {
    random += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `${time}${random}`;
};
