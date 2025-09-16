/**
 * Campaign Scheduling System Tests
 * 
 * Tests the comprehensive campaign scheduling functionality including:
 * - Campaign validation
 * - Scheduling operations
 * - Status transitions
 * - Timezone handling
 * - Error handling and edge cases
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import dbConnect from '../lib/mongodb.js';
import Campaign from '../models/Campaign.js';
import CampaignProspect from '../models/CampaignProspect.js';
import Prospect from '../models/Prospect.js';
import Mailbox from '../models/MailboxFixed.js';
import { CampaignValidationService } from '../lib/campaignValidation.js';
import { CampaignSchedulingService } from '../lib/campaignScheduling.js';

describe('Campaign Scheduling System', () => {
  let testCampaign;
  let testProspect;
  let testMailbox;
  
  beforeEach(async () => {
    await dbConnect();
    
    // Create test mailbox
    testMailbox = new Mailbox({
      fromName: 'Test Sender',
      fromEmail: 'test@example.com',
      domain: 'example.com',
      status: 'active',
      dailyCap: 100,
      dailySent: 0,
      smtpConfiguration: {
        host: 'smtp.example.com',
        port: 587,
        user: 'test@example.com',
        password: 'password'
      }
    });
    await testMailbox.save();
    
    // Create test prospect
    testProspect = new Prospect({
      email: 'prospect@example.com',
      firstName: 'John',
      lastName: 'Doe',
      company: 'Test Company'
    });
    await testProspect.save();
    
    // Create test campaign
    testCampaign = new Campaign({
      name: 'Test Campaign',
      description: 'Test campaign for scheduling',
      persona: 'test',
      goal: 'testing',
      status: 'draft',
      sequence: [
        {
          stepNumber: 1,
          subject: 'Hello {{firstName}}',
          template: 'Hi {{firstName}}, this is a test email.'
        },
        {
          stepNumber: 2,
          subject: 'Follow-up',
          template: 'Following up on my previous email.',
          waitHours: 24,
          waitMinutes: 0
        }
      ],
      options: {
        selectedMailbox: testMailbox._id,
        timezone: 'UTC'
      }
    });
    await testCampaign.save();
    
    // Create campaign prospect
    const campaignProspect = new CampaignProspect({
      campaign: testCampaign._id,
      prospect: testProspect._id,
      sequenceStep: 1,
      status: 'pending'
    });
    await campaignProspect.save();
  });
  
  afterEach(async () => {
    // Clean up test data
    await Campaign.deleteMany({ name: /Test Campaign/ });
    await CampaignProspect.deleteMany({});
    await Prospect.deleteMany({ email: /test|prospect/ });
    await Mailbox.deleteMany({ fromEmail: /test/ });
  });
  
  describe('Campaign Validation', () => {
    it('should validate a properly configured campaign', async () => {
      const validation = await CampaignValidationService.validateCampaign(testCampaign._id);
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
    
    it('should fail validation when mailbox is missing', async () => {
      testCampaign.options.selectedMailbox = null;
      await testCampaign.save();
      
      const validation = await CampaignValidationService.validateCampaign(testCampaign._id);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.objectContaining({
          code: 'NO_MAILBOX_SELECTED'
        })
      );
    });
    
    it('should fail validation when no prospects exist', async () => {
      await CampaignProspect.deleteMany({ campaign: testCampaign._id });
      
      const validation = await CampaignValidationService.validateCampaign(testCampaign._id);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.objectContaining({
          code: 'NO_PROSPECTS'
        })
      );
    });
    
    it('should fail validation when sequence is empty', async () => {
      testCampaign.sequence = [];
      await testCampaign.save();
      
      const validation = await CampaignValidationService.validateCampaign(testCampaign._id);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContainEqual(
        expect.objectContaining({
          code: 'NO_SEQUENCE_STEPS'
        })
      );
    });
  });
  
  describe('Campaign Scheduling', () => {
    it('should schedule a valid campaign successfully', async () => {
      const startDateTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      
      const result = await CampaignSchedulingService.scheduleCampaign(
        testCampaign._id,
        startDateTime,
        { timezone: 'UTC' }
      );
      
      expect(result.success).toBe(true);
      expect(result.status).toBe('scheduled');
      expect(result.campaign.status).toBe('scheduled');
      expect(result.campaign.scheduling.startDateTime).toEqual(startDateTime);
    });
    
    it('should mark campaign as pending_scheduled when validation fails', async () => {
      // Remove mailbox to cause validation failure
      testCampaign.options.selectedMailbox = null;
      await testCampaign.save();
      
      const startDateTime = new Date(Date.now() + 60 * 60 * 1000);
      
      const result = await CampaignSchedulingService.scheduleCampaign(
        testCampaign._id,
        startDateTime,
        { timezone: 'UTC' }
      );
      
      expect(result.success).toBe(true);
      expect(result.status).toBe('pending_scheduled');
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
    });
    
    it('should reject scheduling for past dates', async () => {
      const pastDateTime = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      
      const result = await CampaignSchedulingService.scheduleCampaign(
        testCampaign._id,
        pastDateTime,
        { timezone: 'UTC' }
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('future');
    });
    
    it('should reschedule a campaign', async () => {
      // First schedule the campaign
      const originalDateTime = new Date(Date.now() + 60 * 60 * 1000);
      await CampaignSchedulingService.scheduleCampaign(
        testCampaign._id,
        originalDateTime,
        { timezone: 'UTC' }
      );
      
      // Then reschedule it
      const newDateTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
      const result = await CampaignSchedulingService.rescheduleCampaign(
        testCampaign._id,
        newDateTime
      );
      
      expect(result.success).toBe(true);
      expect(result.newStartDateTime).toEqual(newDateTime);
    });
  });
  
  describe('Status Transitions', () => {
    it('should transition from draft to scheduled', async () => {
      expect(testCampaign.status).toBe('draft');
      expect(testCampaign.canBeScheduled()).toBe(true);
      
      const startDateTime = new Date(Date.now() + 60 * 60 * 1000);
      await testCampaign.markAsScheduled(startDateTime, 'UTC');
      
      expect(testCampaign.status).toBe('scheduled');
      expect(testCampaign.isScheduled()).toBe(true);
    });
    
    it('should identify when campaign is ready to start', async () => {
      const startDateTime = new Date(Date.now() - 1000); // 1 second ago
      await testCampaign.markAsScheduled(startDateTime, 'UTC');
      
      expect(testCampaign.isReadyToStart()).toBe(true);
    });
    
    it('should not be ready to start if scheduled for future', async () => {
      const startDateTime = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      await testCampaign.markAsScheduled(startDateTime, 'UTC');
      
      expect(testCampaign.isReadyToStart()).toBe(false);
    });
  });
  
  describe('CampaignProspect Scheduling', () => {
    it('should schedule first send for prospect', async () => {
      const campaignProspect = await CampaignProspect.findOne({ 
        campaign: testCampaign._id,
        prospect: testProspect._id 
      });
      
      const startTime = new Date();
      await campaignProspect.scheduleFirstSend(startTime, 5); // 5 minute stagger
      
      expect(campaignProspect.firstSendTime).toBeDefined();
      expect(campaignProspect.nextSendAt).toBeDefined();
      expect(campaignProspect.nextSendAt.getTime()).toBeGreaterThan(startTime.getTime());
    });
    
    it('should schedule next step with delay', async () => {
      const campaignProspect = await CampaignProspect.findOne({ 
        campaign: testCampaign._id,
        prospect: testProspect._id 
      });
      
      // Simulate first email sent
      campaignProspect.lastSentAt = new Date();
      await campaignProspect.save();
      
      // Schedule next step with 1 hour delay
      await campaignProspect.scheduleNextStep(0, 1, 0); // 0 minutes, 1 hour, 0 days
      
      expect(campaignProspect.nextSendAt).toBeDefined();
      const expectedTime = new Date(campaignProspect.lastSentAt.getTime() + 60 * 60 * 1000);
      expect(campaignProspect.nextSendAt.getTime()).toBeCloseTo(expectedTime.getTime(), -3);
    });
    
    it('should identify prospects ready to send', async () => {
      const campaignProspect = await CampaignProspect.findOne({ 
        campaign: testCampaign._id,
        prospect: testProspect._id 
      });
      
      // Set as active and ready to send
      campaignProspect.status = 'active';
      campaignProspect.nextSendAt = new Date(Date.now() - 1000); // 1 second ago
      await campaignProspect.save();
      
      expect(campaignProspect.isReadyToSend()).toBe(true);
      
      const readyProspects = await CampaignProspect.findReadyToSend();
      expect(readyProspects.length).toBeGreaterThan(0);
      expect(readyProspects[0]._id.toString()).toBe(campaignProspect._id.toString());
    });
  });
  
  describe('Error Handling', () => {
    it('should handle non-existent campaign gracefully', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      
      const validation = await CampaignValidationService.validateCampaign(fakeId);
      expect(validation.valid).toBe(false);
      expect(validation.errors[0].code).toBe('CAMPAIGN_NOT_FOUND');
      
      const scheduling = await CampaignSchedulingService.scheduleCampaign(
        fakeId,
        new Date(Date.now() + 60 * 60 * 1000)
      );
      expect(scheduling.success).toBe(false);
    });
    
    it('should handle invalid timezone gracefully', async () => {
      const startDateTime = new Date(Date.now() + 60 * 60 * 1000);
      
      const result = await CampaignSchedulingService.scheduleCampaign(
        testCampaign._id,
        startDateTime,
        { timezone: 'Invalid/Timezone' }
      );
      
      // Should still succeed but use default timezone
      expect(result.success).toBe(true);
    });
  });
});
