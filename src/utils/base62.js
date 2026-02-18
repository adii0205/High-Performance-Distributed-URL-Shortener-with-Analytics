/**
 * Base62 encoding for generating short codes
 * Uses digits (0-9), lowercase letters (a-z), and uppercase letters (A-Z)
 * Total: 62 characters = 62^6 = 56 billion unique combinations
 */

const CHARSET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const BASE = 62;

/**
 * Convert a number to Base62 string
 */
function encodeBase62(num) {
  if (num === 0) return CHARSET[0];

  let encoded = '';
  while (num > 0) {
    encoded = CHARSET[num % BASE] + encoded;
    num = Math.floor(num / BASE);
  }

  return encoded;
}

/**
 * Convert a Base62 string to a number
 */
function decodeBase62(str) {
  let decoded = 0;
  for (const char of str) {
    const index = CHARSET.indexOf(char);
    if (index === -1) {
      throw new Error(`Invalid character in Base62 string: ${char}`);
    }
    decoded = decoded * BASE + index;
  }
  return decoded;
}

/**
 * Generate a random Base62 string of specified length
 */
function generateRandomShortCode(length = 6) {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += CHARSET[Math.floor(Math.random() * BASE)];
  }
  return code;
}

/**
 * Generate a short code with timestamp component for uniqueness
 * Mix timestamp (squashed) with random bytes
 */
function generateTimestampShortCode(length = 6) {
  // Mix current timestamp with random value for better distribution
  const timestamp = Date.now();
  const random = Math.random() * 1000000;
  const combined = Math.floor((timestamp + random) % (Math.pow(BASE, length)));

  let code = encodeBase62(combined);

  // Pad with random characters if needed
  while (code.length < length) {
    code = CHARSET[Math.floor(Math.random() * BASE)] + code;
  }

  return code.substring(0, length);
}

/**
 * Validate if string is valid Base62
 */
function isValidBase62(str) {
  if (typeof str !== 'string' || str.length === 0) {
    return false;
  }
  return /^[0-9a-zA-Z]+$/.test(str);
}

module.exports = {
  encodeBase62,
  decodeBase62,
  generateRandomShortCode,
  generateTimestampShortCode,
  isValidBase62,
};
