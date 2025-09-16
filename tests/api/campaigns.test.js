import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';

// Import models for direct DB testing
import Campaign from '../../models/Campaign.js';
import Prospect from '../../models/Prospect.js';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3001; // Test port

let app;
let server;
let testCampaignId;

beforeAll(async () => {
  // Setup Next.js app for testing
  const nextApp = next({ dev, hostname, port });
  const handle = nextApp.getRequestHandler();
  
  await nextApp.prepare();
  
  server = createServer(async (req, res) => {
    const parsedUrl = parse(req.url, true);
    await handle(req, res, parsedUrl);
  });
  
  app = server;
  
  // Connect to test database
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI_TEST || process.env.MONGODB_URI);
  }
});

afterAll(async () => {
  await mongoose.connection.close();
  server?.close();
});

beforeEach(async () => {
  // Clean up test data
  await Campaign.deleteMany({ name: /^Test Campaign/ });
  await Prospect.deleteMany({ email: /test.*@example\.com/ });
});

describe('Campaign API Integration Tests', () => {
  
  describe('POST /api/campaigns', () => {
    test('should create campaign with valid data', async () => {
      const campaignData = {
        name: 'Test Campaign 1',
        description: 'Test description',
        persona: 'Sales Rep',
        goal: 'Generate leads'
      };

      const response = await request(app)
        .post('/api/campaigns')
        .send(campaignData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.campaign.name).toBe(campaignData.name);
      expect(response.body.campaign.status).toBe('draft');
      
      testCampaignId = response.body.campaign._id;
    });

    test('should reject campaign with missing required fields', async () => {
      const invalidData = {
        name: 'Test Campaign 2'
        // Missing persona and goal
      };

      const response = await request(app)
        .post('/api/campaigns')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });
  });

  describe('PUT /api/campaigns/[id]/schedule', () => {
    beforeEach(async () => {
      // Create test campaign
      const campaign = new Campaign({
        name: 'Test Campaign Schedule',
        persona: 'Sales Rep',
        goal: 'Test scheduling'
      });
      const saved = await campaign.save();
      testCampaignId = saved._id.toString();
    });

    test('should handle removed schedule functionality', async () => {
      // Schedule functionality has been removed
      const response = await request(app)
        .put(`/api/campaigns/${testCampaignId}/schedule`)
        .send({})
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    test('should reject scheduler format (removed)', async () => {
      const schedulerData = {
        type: 'scheduled',
        scheduledAt: new Date('2025-09-05T09:00:00Z').toISOString()
      };

      const response = await request(app)
        .put(`/api/campaigns/${testCampaignId}/schedule`)
        .send(schedulerData)
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    test('should reject email delay validation (removed)', async () => {
      const invalidData = {
        emailDelay: 100, // Invalid: > 60
        timing: { from: '9:00 AM', to: '5:00 PM' },
        days: { monday: true }
      };

      // Schedule API has been removed
      const response = await request(app)
        .put(`/api/campaigns/${testCampaignId}/schedule`)
        .send(invalidData)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/campaigns/[id]/followup', () => {
    beforeEach(async () => {
      const campaign = new Campaign({
        name: 'Test Campaign Followup',
        persona: 'Sales Rep',
        goal: 'Test followup'
      });
      const saved = await campaign.save();
      testCampaignId = saved._id.toString();
    });

    test('should save followup settings', async () => {
      const followupData = {
        enabled: true,
        maxFollowUps: 3,
        followUpDelay: 2,
        conditions: {
          noReply: true,
          noOpen: false,
          bounced: false
        },
        stopOnReply: true
      };

      const response = await request(app)
        .put(`/api/campaigns/${testCampaignId}/followup`)
        .send(followupData)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Verify in database
      const campaign = await Campaign.findById(testCampaignId);
      expect(campaign.followUpSettings.enabled).toBe(true);
      expect(campaign.followUpSettings.maxFollowUps).toBe(3);
    });
  });

  describe('Schema Validation Tests', () => {
    test('should save campaign without schedule settings', async () => {
      const campaign = new Campaign({
        name: 'Schema Test Campaign',
        persona: 'Sales Rep',
        goal: 'Schema validation'
      });

      // Schedule settings have been removed
      await expect(campaign.save()).resolves.toBeTruthy();

      // Verify no schedule settings exist
      const saved = await Campaign.findById(campaign._id);
      expect(saved.schedule).toBeUndefined();
    });

    test('should handle missing nested fields gracefully', async () => {
      const campaign = new Campaign({
        name: 'Nested Fields Test',
        persona: 'Sales Rep',
        goal: 'Test nested validation'
      });

      // Test with minimal schedule data
      campaign.schedule = {
        settings: {} // Empty settings should use defaults
      };

      await expect(campaign.save()).resolves.toBeTruthy();
      
      // Verify defaults are applied
      const saved = await Campaign.findById(campaign._id);
      expect(saved.schedule.settings.delayBetweenEmails).toBe(5);
    });
  });

  describe('Error Handling Tests', () => {
    test('should return proper error for invalid campaign ID', async () => {
      const invalidId = '507f1f77bcf86cd799439011';
      
      const response = await request(app)
        .put(`/api/campaigns/${invalidId}/schedule`)
        .send({ emailDelay: 5 })
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    test('should handle malformed request data', async () => {
      const campaign = new Campaign({
        name: 'Error Test Campaign',
        persona: 'Sales Rep',
        goal: 'Error handling'
      });
      const saved = await campaign.save();

      const response = await request(app)
        .put(`/api/campaigns/${saved._id}/schedule`)
        .send('invalid json')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});

describe('Prospects API Integration Tests', () => {
  describe('POST /api/prospects', () => {
    test('should create prospect with valid data', async () => {
      const prospectData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'test.john@example.com',
        company: 'Test Corp'
      };

      const response = await request(app)
        .post('/api/prospects')
        .send(prospectData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.prospect.email).toBe(prospectData.email);
    });

    test('should reject duplicate email addresses', async () => {
      const prospectData = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'test.duplicate@example.com',
        company: 'Test Corp'
      };

      // Create first prospect
      await request(app)
        .post('/api/prospects')
        .send(prospectData)
        .expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/prospects')
        .send(prospectData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });
  });
});
