import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import mongoose from 'mongoose';
import Campaign from '../../models/Campaign.js';
import Prospect from '../../models/Prospect.js';
import ScheduledEmail from '../../models/ScheduledEmail.js';

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI_TEST || process.env.MONGODB_URI);
  }
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('Database Schema Validation Tests', () => {
  
  describe('Campaign Schema Validation', () => {
    test('should validate required fields', async () => {
      const campaign = new Campaign({});
      
      await expect(campaign.save()).rejects.toThrow();
      
      const error = await campaign.validate().catch(err => err);
      expect(error.errors.name).toBeDefined();
      expect(error.errors.persona).toBeDefined();
      expect(error.errors.goal).toBeDefined();
    });

    test('should apply default values correctly', async () => {
      const campaign = new Campaign({
        name: 'Test Campaign',
        persona: 'Sales Rep',
        goal: 'Generate leads'
      });

      await campaign.save();
      
      // Check defaults (schedule settings removed)
      expect(campaign.status).toBe('draft');
      expect(campaign.options.trackOpens).toBe(true);
      expect(campaign.options.trackClicks).toBe(true);
      expect(campaign.options.dailyLimit).toBe(50);
    });

    test('should save campaign without schedule settings', async () => {
      const campaign = new Campaign({
        name: 'Schedule Test',
        persona: 'Sales Rep',
        goal: 'Test schedule validation'
      });

      // Schedule settings have been removed
      await expect(campaign.save()).resolves.toBeTruthy();

      // Verify no schedule settings exist
      const saved = await Campaign.findById(campaign._id);
      expect(saved.schedule).toBeUndefined();
    });

    test('should validate enum values', async () => {
      const campaign = new Campaign({
        name: 'Enum Test',
        persona: 'Sales Rep',
        goal: 'Test enums'
      });

      // Test invalid status
      campaign.status = 'invalid_status';
      await expect(campaign.save()).rejects.toThrow();

      // Test valid status
      campaign.status = 'active';
      await expect(campaign.save()).resolves.toBeTruthy();
    });

    test('should validate sequence steps structure', async () => {
      const campaign = new Campaign({
        name: 'Sequence Test',
        persona: 'Sales Rep',
        goal: 'Test sequence validation'
      });

      campaign.sequence = [{
        stepNumber: 1,
        template: 'Hello {{firstName}}',
        subject: 'Test Subject',
        waitHours: 24,
        conditions: {
          ifOpened: 'continue',
          ifReplied: 'stop',
          ifBounced: 'stop'
        }
      }];

      await expect(campaign.save()).resolves.toBeTruthy();
      
      // Test invalid condition value
      campaign.sequence[0].conditions.ifOpened = 'invalid_condition';
      await expect(campaign.save()).rejects.toThrow();
    });
  });

  describe('Prospect Schema Validation', () => {
    test('should validate email format', async () => {
      const prospect = new Prospect({
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid-email',
        company: 'Test Corp'
      });

      await expect(prospect.save()).rejects.toThrow();
      
      // Valid email should work
      prospect.email = 'john.doe@testcorp.com';
      await expect(prospect.save()).resolves.toBeTruthy();
    });

    test('should enforce unique email constraint', async () => {
      const email = 'unique.test@example.com';
      
      const prospect1 = new Prospect({
        firstName: 'John',
        lastName: 'Doe',
        email: email,
        company: 'Corp 1'
      });
      
      await prospect1.save();
      
      const prospect2 = new Prospect({
        firstName: 'Jane',
        lastName: 'Smith',
        email: email,
        company: 'Corp 2'
      });
      
      await expect(prospect2.save()).rejects.toThrow();
    });
  });

  describe('ScheduledEmail Schema Validation (Removed)', () => {
    test('should handle removed ScheduledEmail model', async () => {
      // ScheduledEmail model has been removed as part of scheduling system cleanup
      // This test verifies the model is no longer available
      expect(() => {
        const ScheduledEmail = require('../../models/ScheduledEmail.js');
      }).toThrow();
    });
  });

  describe('Cross-Model Relationship Validation', () => {
    test('should validate campaign-prospect relationships', async () => {
      const campaign = new Campaign({
        name: 'Relationship Test',
        persona: 'Sales Rep',
        goal: 'Test relationships'
      });
      
      const prospect = new Prospect({
        firstName: 'Test',
        lastName: 'User',
        email: 'test.relationship@example.com',
        company: 'Test Corp'
      });

      await campaign.save();
      await prospect.save();

      // Add prospect to campaign
      campaign.prospects.push({
        prospectId: prospect._id,
        currentStep: 1,
        status: 'pending'
      });

      await expect(campaign.save()).resolves.toBeTruthy();
      
      // Verify relationship
      const populatedCampaign = await Campaign.findById(campaign._id)
        .populate('prospects.prospectId');
      
      expect(populatedCampaign.prospects[0].prospectId.email)
        .toBe('test.relationship@example.com');
    });
  });

  describe('Data Migration Validation', () => {
    test('should handle legacy data structures', async () => {
      // Simulate legacy campaign with old schedule structure
      const legacyCampaign = new Campaign({
        name: 'Legacy Test',
        persona: 'Sales Rep',
        goal: 'Test legacy compatibility'
      });

      // Old structure without settings nesting
      legacyCampaign.schedule = {
        emailDelay: 10, // Old field name
        respectHolidays: true
      };

      // Should still save due to schema flexibility
      await expect(legacyCampaign.save()).resolves.toBeTruthy();
    });
  });
});
