#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Campaign = require('../models/Campaign.js');
const Prospect = require('../models/Prospect.js');

dotenv.config({ path: '.env.local' });

class PerformanceChecker {
  constructor() {
    this.results = {
      dbQueries: [],
      slowOperations: [],
      memoryUsage: [],
      recommendations: []
    };
  }

  async checkDatabasePerformance() {
    console.log('🔍 Checking Database Performance...\n');
    
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Test query performance
    const tests = [
      {
        name: 'Campaign.find() - All campaigns',
        operation: () => Campaign.find().lean()
      },
      {
        name: 'Campaign.findById() - Single campaign',
        operation: async () => {
          const campaigns = await Campaign.find().limit(1);
          if (campaigns.length > 0) {
            return Campaign.findById(campaigns[0]._id);
          }
          return null;
        }
      },
      {
        name: 'Prospect.find() - All prospects',
        operation: () => Prospect.find().lean()
      },
      {
        name: 'Campaign with populated prospects',
        operation: () => Campaign.find().populate('prospects.prospectId').lean()
      }
    ];

    for (const test of tests) {
      const startTime = Date.now();
      const startMemory = process.memoryUsage().heapUsed;
      
      try {
        await test.operation();
        const duration = Date.now() - startTime;
        const memoryDelta = process.memoryUsage().heapUsed - startMemory;
        
        this.results.dbQueries.push({
          name: test.name,
          duration,
          memoryDelta: Math.round(memoryDelta / 1024 / 1024 * 100) / 100, // MB
          status: duration > 2000 ? 'SLOW' : 'OK'
        });
        
        if (duration > 2000) {
          this.results.slowOperations.push({
            operation: test.name,
            duration,
            recommendation: 'Consider adding database indexes or optimizing query'
          });
        }
        
      } catch (error) {
        this.results.dbQueries.push({
          name: test.name,
          error: error.message,
          status: 'ERROR'
        });
      }
    }
    
    await mongoose.connection.close();
  }

  async checkLogFiles() {
    console.log('📊 Analyzing Log Files...\n');
    
    const logsDir = path.join(process.cwd(), 'logs');
    
    try {
      const files = await fs.readdir(logsDir);
      const errorFiles = files.filter(f => f.startsWith('error-'));
      
      let totalErrors = 0;
      const errorPatterns = {};
      
      for (const file of errorFiles.slice(-7)) { // Last 7 days
        const content = await fs.readFile(path.join(logsDir, file), 'utf-8');
        const lines = content.split('\n').filter(l => l.trim());
        
        for (const line of lines) {
          try {
            const entry = JSON.parse(line);
            totalErrors++;
            
            // Categorize errors
            const errorType = this.categorizeError(entry.message);
            errorPatterns[errorType] = (errorPatterns[errorType] || 0) + 1;
            
          } catch (parseError) {
            // Skip malformed entries
          }
        }
      }
      
      this.results.errorAnalysis = {
        totalErrors,
        errorPatterns,
        recommendation: totalErrors > 100 ? 'High error rate detected - investigate common patterns' : 'Error rate is acceptable'
      };
      
    } catch (error) {
      console.log('⚠️  Could not analyze logs:', error.message);
    }
  }

  categorizeError(message) {
    if (/database|mongodb|connection/i.test(message)) return 'Database';
    if (/validation|cast.*failed/i.test(message)) return 'Validation';
    if (/timeout/i.test(message)) return 'Timeout';
    if (/authentication|authorization/i.test(message)) return 'Auth';
    if (/email|smtp/i.test(message)) return 'Email';
    return 'Other';
  }

  generateRecommendations() {
    console.log('💡 Generating Performance Recommendations...\n');
    
    // Database recommendations
    const slowQueries = this.results.dbQueries.filter(q => q.status === 'SLOW');
    if (slowQueries.length > 0) {
      this.results.recommendations.push({
        category: 'Database',
        priority: 'HIGH',
        issue: `${slowQueries.length} slow database queries detected`,
        solution: 'Add indexes for frequently queried fields (campaign status, prospect email, etc.)'
      });
    }
    
    // Memory recommendations
    const highMemoryOps = this.results.dbQueries.filter(q => q.memoryDelta > 50);
    if (highMemoryOps.length > 0) {
      this.results.recommendations.push({
        category: 'Memory',
        priority: 'MEDIUM',
        issue: 'High memory usage in database operations',
        solution: 'Use .lean() for read-only queries and implement pagination'
      });
    }
    
    // Error rate recommendations
    if (this.results.errorAnalysis?.totalErrors > 50) {
      this.results.recommendations.push({
        category: 'Reliability',
        priority: 'HIGH',
        issue: 'High error rate detected',
        solution: 'Implement better error handling and input validation'
      });
    }
    
    // General recommendations
    this.results.recommendations.push({
      category: 'Monitoring',
      priority: 'MEDIUM',
      issue: 'Performance monitoring setup',
      solution: 'Implement automated performance alerts and regular health checks'
    });
  }

  printReport() {
    console.log('📈 PERFORMANCE REPORT');
    console.log('='.repeat(50));
    
    console.log('\n🗄️  Database Query Performance:');
    this.results.dbQueries.forEach(query => {
      const status = query.status === 'OK' ? '✅' : query.status === 'SLOW' ? '⚠️' : '❌';
      console.log(`  ${status} ${query.name}`);
      if (query.duration) {
        console.log(`     Duration: ${query.duration}ms | Memory: ${query.memoryDelta}MB`);
      }
      if (query.error) {
        console.log(`     Error: ${query.error}`);
      }
    });
    
    if (this.results.errorAnalysis) {
      console.log('\n🚨 Error Analysis (Last 7 Days):');
      console.log(`  Total Errors: ${this.results.errorAnalysis.totalErrors}`);
      console.log('  Error Categories:');
      Object.entries(this.results.errorAnalysis.errorPatterns).forEach(([type, count]) => {
        console.log(`    ${type}: ${count}`);
      });
    }
    
    console.log('\n💡 Recommendations:');
    this.results.recommendations.forEach((rec, index) => {
      const priority = rec.priority === 'HIGH' ? '🔴' : rec.priority === 'MEDIUM' ? '🟡' : '🟢';
      console.log(`  ${priority} ${rec.category}: ${rec.issue}`);
      console.log(`     Solution: ${rec.solution}\n`);
    });
    
    // Overall score
    const slowQueries = this.results.dbQueries.filter(q => q.status === 'SLOW').length;
    const totalQueries = this.results.dbQueries.length;
    const score = Math.round(((totalQueries - slowQueries) / totalQueries) * 100);
    
    console.log(`📊 Overall Performance Score: ${score}%`);
    
    if (score >= 90) {
      console.log('🎉 Excellent performance!');
    } else if (score >= 70) {
      console.log('👍 Good performance with room for improvement');
    } else {
      console.log('⚠️  Performance needs attention');
    }
  }
}

async function runPerformanceCheck() {
  const checker = new PerformanceChecker();
  
  try {
    await checker.checkDatabasePerformance();
    await checker.checkLogFiles();
    checker.generateRecommendations();
    checker.printReport();
    
  } catch (error) {
    console.error('❌ Performance check failed:', error);
    process.exit(1);
  }
}

runPerformanceCheck();
