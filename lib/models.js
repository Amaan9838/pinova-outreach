// Centralized model registration.
// Importing this file ensures all Mongoose models are registered exactly once
// on the default connection before any populate() or aggregate() calls.
// All models must be listed here — missing entries cause silent undefined in populated fields.

import '../models/Campaign.js';
import '../models/CampaignProspect.js';
import '../models/Prospect.js';
import '../models/Message.js';
import '../models/MailboxFixed.js';
import '../models/EngineLog.js';
import '../models/ReplyCategory.js';
import '../models/Suppression.js';
import '../models/Pipeline.js';
import '../models/User.js';

// Side-effects only — do not export model constructors from here.
export {};
