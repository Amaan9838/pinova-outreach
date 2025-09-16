console.log('🔍 Quick Infrastructure Test');
console.log('Node.js version:', process.version);
console.log('Current directory:', process.cwd());

try {
  console.log('\n📋 Testing basic requires:');
  const fs = require('fs');
  console.log('✅ fs module loaded');
  
  const path = require('path');
  console.log('✅ path module loaded');
  
  console.log('\n📊 Testing file existence:');
  const modelsPath = path.join(__dirname, 'models', 'Campaign.js');
  if (fs.existsSync(modelsPath)) {
    console.log('✅ Campaign.js exists');
  } else {
    console.log('❌ Campaign.js not found at:', modelsPath);
  }
  
  const libPath = path.join(__dirname, 'lib', 'errorMonitor.js');
  if (fs.existsSync(libPath)) {
    console.log('✅ errorMonitor.js exists');
  } else {
    console.log('❌ errorMonitor.js not found at:', libPath);
  }
  
  console.log('\n🎉 Basic test completed successfully!');
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
}