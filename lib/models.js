// Centralized model registration. Importing this file ensures all Mongoose models
// are registered exactly once on the default connection before any populate calls.
// Do not export model constructors from here unless needed; simply importing is enough
// because each model file uses mongoose.models[...] || mongoose.model(...)

import '../models/Campaign.js';
import '../models/Prospect.js';
import '../models/Message.js';
import '../models/MailboxFixed.js';

// Optionally export nothing; the side-effects are what we need.
export {};
