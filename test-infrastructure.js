const mongoose = require('mongoose');
const path = require('path');

// Simple test to verify infrastructure is working
async function testInfrastructure() {
  console.log('🔍 Testing Development Infrastructure...\n');
  
  try {
    // Test 1: Check if models can be loaded
    console.log('📋 Testing Model Loading:');
    try {
      const Campaign = require('./models/Campaign.js');
      console.log('  ✅ Campaign model loaded successfully');
    } catch (error) {
      console.log('  ❌ Campaign model failed:', error.message);
    }
    
    // Test 2: Check if monitoring libs exist
    console.log('\n🔧 Testing Monitoring Libraries:');
    try {
      const ErrorMonitor = require('./lib/errorMonitor.js');
      const monitor = new ErrorMonitor();
      console.log('  ✅ ErrorMonitor class created successfully');
    } catch (error) {
      console.log('  ❌ ErrorMonitor failed:', error.message);
    }
    
    try {
      const PerformanceMonitor = require('./lib/performanceMonitor.js');
      const perfMonitor = new PerformanceMonitor();
      console.log('  ✅ PerformanceMonitor class created successfully');
    } catch (error) {
      console.log('  ❌ PerformanceMonitor failed:', error.message);
    }
    
    // Test 3: Check API wrapper
    console.log('\n🌐 Testing API Wrapper:');
    try {
      const { withErrorHandling, withDbValidation } = require('./lib/apiWrapper.js');
      console.log('  ✅ API wrapper functions imported successfully');
    } catch (error) {
      console.log('  ❌ API wrapper failed:', error.message);
    }
    
    // Test 4: Test basic schema validation
    console.log('\n📊 Testing Schema Validation:');
    try {
      // Load environment variables
      require('dotenv').config({ path: '.env.local' });
      
      if (process.env.MONGODB_URI) {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('  ✅ MongoDB connection successful');
        
        const Campaign = require('./models/Campaign.js');
        
        // Test valid campaign
        const validCampaign = new Campaign({
          name: 'Test Infrastructure Campaign',
          persona: 'Sales Rep',
          goal: 'Test infrastructure'
        });
        
        const validationResult = await validCampaign.validate();
        console.log('  ✅ Campaign validation passed');
        
        // Test schedule.settings structure (the issue we fixed)
        validCampaign.schedule = {
          settings: {
            delayBetweenEmails: 10,
            respectHolidays: true
          }
        };
        
        await validCampaign.validate();
        console.log('  ✅ Schedule.settings structure validation passed');
        
        await mongoose.connection.close();
        console.log('  ✅ MongoDB connection closed');
        
      } else {
        console.log('  ⚠️  No MongoDB URI found in environment');
      }
    } catch (error) {
      console.log('  ❌ Schema validation failed:', error.message);
    }
    
    console.log('\n🎉 Infrastructure Test Complete!');
    console.log('\n📋 Summary:');
    console.log('  - Fixed schedule settings schema mismatch');
    console.log('  - Created error monitoring system');
    console.log('  - Built performance monitoring');
    console.log('  - Enhanced API wrapper with validation');
    console.log('  - Set up automated testing framework');
    
    console.log('\n💡 Next Steps:');
    console.log('  1. Try saving schedule settings - the error should be fixed');
    console.log('  2. Monitor logs/ directory for automatic error tracking');
    console.log('  3. Use npm run test for automated testing');
    
  } catch (error) {
    console.error('❌ Infrastructure test failed:', error);
  }
}

testInfrastructure();
