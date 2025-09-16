#!/usr/bin/env node

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Campaign = require('../models/Campaign.js');
const Prospect = require('../models/Prospect.js');
const ScheduledEmail = require('../models/ScheduledEmail.js');

dotenv.config({ path: '.env.local' });

const VALIDATION_TESTS = [
  {
    name: 'Campaign Schema Validation',
    model: Campaign,
    validData: {
      name: 'Test Campaign',
      persona: 'Sales Rep',
      goal: 'Generate leads'
    },
    invalidData: [
      { name: 'Missing persona and goal' },
      { persona: 'Sales Rep', goal: 'Missing name' },
      { name: 'Test', persona: 'Sales Rep', goal: 'Test', status: 'invalid_status' }
    ]
  },
  {
    name: 'Prospect Schema Validation',
    model: Prospect,
    validData: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      company: 'Test Corp'
    },
    invalidData: [
      { firstName: 'John', lastName: 'Doe', email: 'invalid-email', company: 'Test Corp' },
      { firstName: 'John', lastName: 'Doe', company: 'Missing email' }
    ]
  }
];

async function validateSchemas() {
  console.log('🔍 Starting Schema Validation...\n');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
    
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    
    for (const test of VALIDATION_TESTS) {
      console.log(`📋 Testing ${test.name}:`);
      
      // Test valid data
      totalTests++;
      try {
        const validDoc = new test.model(test.validData);
        await validDoc.validate();
        console.log('  ✅ Valid data passes validation');
        passedTests++;
      } catch (error) {
        console.log('  ❌ Valid data failed validation:', error.message);
        failedTests++;
      }
      
      // Test invalid data
      for (const invalidData of test.invalidData) {
        totalTests++;
        try {
          const invalidDoc = new test.model(invalidData);
          await invalidDoc.validate();
          console.log('  ❌ Invalid data passed validation (should have failed)');
          failedTests++;
        } catch (error) {
          console.log('  ✅ Invalid data correctly rejected:', error.message.split(':')[0]);
          passedTests++;
        }
      }
      
      console.log('');
    }
    
    // Test specific schema issues that caused problems
    console.log('🔧 Testing Known Issue Fixes:');
    
    // Test schedule.settings structure
    totalTests++;
    try {
      const campaign = new Campaign({
        name: 'Schedule Test',
        persona: 'Sales Rep',
        goal: 'Test schedule validation'
      });
      
      campaign.schedule = {
        settings: {
          delayBetweenEmails: 10,
          respectHolidays: false
        }
      };
      
      await campaign.validate();
      console.log('  ✅ Schedule.settings structure validates correctly');
      passedTests++;
    } catch (error) {
      console.log('  ❌ Schedule.settings validation failed:', error.message);
      failedTests++;
    }
    
    // Summary
    console.log('\n📊 Validation Summary:');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
    
    if (failedTests === 0) {
      console.log('\n🎉 All schema validations passed!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some validations failed. Please review schema definitions.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Schema validation failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

validateSchemas();
