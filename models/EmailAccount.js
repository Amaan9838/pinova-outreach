// EmailAccount.js - Alias for MailboxFixed.js for migration compatibility

// Since MailboxFixed.js uses ES6 modules, we need to handle the import differently
try {
  // Try ES6 import first
  const MailboxFixed = require('./MailboxFixed');
  module.exports = MailboxFixed.default || MailboxFixed;
} catch (error) {
  // Fallback: Try to access the Mongoose model directly if already registered
  const mongoose = require('mongoose');
  if (mongoose.models.Mailbox) {
    module.exports = mongoose.models.Mailbox;
  } else {
    throw new Error('Mailbox model not found. Make sure MailboxFixed.js is properly loaded.');
  }
}
