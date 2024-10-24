// asciiHelper.js

const admin = require('firebase-admin');

function incrementAscii(ascii) {
  const nextAscii = parseInt(ascii, 36) + 1;
  return nextAscii.toString(36).toUpperCase();
}

async function generateAscii() {
  try {
    const asciiRef = admin.database().ref('/ascii');
    const snapshot = await asciiRef.once('value');
    let currentAscii = snapshot.val() || 'AA';
    await asciiRef.set(currentAscii);
    currentAscii = incrementAscii(currentAscii);
    return { ascii: currentAscii };
  } catch (error) {
    console.error('Error generating ASCII:', error.message);
    throw new Error('Internal Server Error');
  }
}

module.exports = {
  generateAscii,
};
