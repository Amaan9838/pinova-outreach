#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

class ErrorReporter {
  constructor() {
    this.logsDir = path.join(process.cwd(), 'logs');
    this.report = {
      summary: {},
      criticalErrors: [],
      trends: {},
      recommendations: []
    };
  }

  async generateReport(days = 7) {
    console.log(`📊 Generating Error Report (Last ${days} days)...\n`);
    
    try {
      await this.analyzeLogs(days);
      await this.identifyTrends();
      this.generateRecommendations();
      this.printReport();
    } catch (error) {
      console.error('❌ Failed to generate error report:', error);
    }
  }

  async analyzeLogs(days) {
    const files = await fs.readdir(this.logsDir).catch(() => []);
    const errorFiles = files.filter(f => f.startsWith('error-'));
    
    let totalErrors = 0;
    const errorsByType = {};
    const errorsByDay = {};
    const criticalErrors = [];
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    for (const file of errorFiles) {
      const filePath = path.join(this.logsDir, file);
      const content = await fs.readFile(filePath, 'utf-8').catch(() => '');
      const lines = content.split('\n').filter(l => l.trim());
      
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          const errorDate = new Date(entry.timestamp);
          
          if (errorDate < cutoffDate) continue;
          
          totalErrors++;
          
          // Categorize errors
          const category = this.categorizeError(entry.message);
          errorsByType[category] = (errorsByType[category] || 0) + 1;
          
          // Group by day
          const day = errorDate.toISOString().split('T')[0];
          errorsByDay[day] = (errorsByDay[day] || 0) + 1;
          
          // Identify critical errors
          if (this.isCriticalError(entry)) {
            criticalErrors.push({
              timestamp: entry.timestamp,
              message: entry.message,
              context: entry.context
            });
          }
          
        } catch (parseError) {
          // Skip malformed entries
        }
      }
    }
    
    this.report.summary = {
      totalErrors,
      errorsByType,
      errorsByDay,
      averagePerDay: Math.round(totalErrors / days)
    };
    
    this.report.criticalErrors = criticalErrors.slice(0, 10); // Top 10 critical
  }

  categorizeError(message) {
    const categories = {
      'Database': /database|mongodb|connection|cast.*failed|validation.*failed/i,
      'API': /api|endpoint|request|response/i,
      'Email': /email|smtp|nodemailer/i,
      'Authentication': /auth|login|token|permission/i,
      'Validation': /validation|required|invalid/i,
      'Performance': /timeout|slow|memory|performance/i,
      'Network': /network|fetch|axios|connection/i
    };
    
    for (const [category, pattern] of Object.entries(categories)) {
      if (pattern.test(message)) return category;
    }
    
    return 'Other';
  }

  isCriticalError(entry) {
    const criticalPatterns = [
      /database.*connection.*failed/i,
      /mongodb.*timeout/i,
      /out of memory/i,
      /server.*crash/i,
      /critical.*error/i,
      /fatal/i
    ];
    
    return criticalPatterns.some(pattern => 
      pattern.test(entry.message) || pattern.test(entry.stack || '')
    );
  }

  async identifyTrends() {
    const { errorsByDay, errorsByType } = this.report.summary;
    
    // Calculate daily trend
    const days = Object.keys(errorsByDay).sort();
    if (days.length >= 3) {
      const recent = days.slice(-3).reduce((sum, day) => sum + errorsByDay[day], 0) / 3;
      const older = days.slice(0, -3).reduce((sum, day) => sum + errorsByDay[day], 0) / Math.max(1, days.length - 3);
      
      this.report.trends.daily = {
        direction: recent > older * 1.2 ? 'INCREASING' : recent < older * 0.8 ? 'DECREASING' : 'STABLE',
        recentAverage: Math.round(recent),
        olderAverage: Math.round(older)
      };
    }
    
    // Identify most problematic error type
    const topErrorType = Object.entries(errorsByType)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (topErrorType) {
      this.report.trends.topErrorType = {
        type: topErrorType[0],
        count: topErrorType[1],
        percentage: Math.round((topErrorType[1] / this.report.summary.totalErrors) * 100)
      };
    }
  }

  generateRecommendations() {
    const { summary, trends, criticalErrors } = this.report;
    
    // High error rate
    if (summary.averagePerDay > 20) {
      this.report.recommendations.push({
        priority: 'HIGH',
        issue: `High error rate: ${summary.averagePerDay} errors/day`,
        action: 'Implement better input validation and error handling',
        impact: 'Reduces user-facing errors and improves reliability'
      });
    }
    
    // Increasing trend
    if (trends.daily?.direction === 'INCREASING') {
      this.report.recommendations.push({
        priority: 'HIGH',
        issue: 'Error rate is increasing',
        action: 'Investigate recent code changes and monitor system resources',
        impact: 'Prevents system degradation'
      });
    }
    
    // Database errors
    if (summary.errorsByType.Database > summary.totalErrors * 0.3) {
      this.report.recommendations.push({
        priority: 'HIGH',
        issue: 'High database error rate',
        action: 'Review database schema validation and connection handling',
        impact: 'Improves data integrity and system stability'
      });
    }
    
    // Critical errors
    if (criticalErrors.length > 0) {
      this.report.recommendations.push({
        priority: 'CRITICAL',
        issue: `${criticalErrors.length} critical errors detected`,
        action: 'Immediate investigation required - check system resources and dependencies',
        impact: 'Prevents system failures and data loss'
      });
    }
    
    // API errors
    if (summary.errorsByType.API > 10) {
      this.report.recommendations.push({
        priority: 'MEDIUM',
        issue: 'Multiple API errors detected',
        action: 'Implement API monitoring and better error responses',
        impact: 'Improves user experience and debugging'
      });
    }
    
    // General recommendations
    if (this.report.recommendations.length === 0) {
      this.report.recommendations.push({
        priority: 'LOW',
        issue: 'Error rate is acceptable',
        action: 'Continue monitoring and maintain current error handling practices',
        impact: 'Maintains system reliability'
      });
    }
  }

  printReport() {
    console.log('🚨 ERROR ANALYSIS REPORT');
    console.log('='.repeat(50));
    
    const { summary, trends, criticalErrors, recommendations } = this.report;
    
    console.log('\n📊 Summary:');
    console.log(`  Total Errors: ${summary.totalErrors}`);
    console.log(`  Average per Day: ${summary.averagePerDay}`);
    console.log(`  Error Categories:`);
    
    Object.entries(summary.errorsByType)
      .sort(([,a], [,b]) => b - a)
      .forEach(([type, count]) => {
        const percentage = Math.round((count / summary.totalErrors) * 100);
        console.log(`    ${type}: ${count} (${percentage}%)`);
      });
    
    if (trends.daily) {
      console.log('\n📈 Trends:');
      const trendIcon = trends.daily.direction === 'INCREASING' ? '📈' : 
                       trends.daily.direction === 'DECREASING' ? '📉' : '➡️';
      console.log(`  Daily Trend: ${trendIcon} ${trends.daily.direction}`);
      console.log(`  Recent Average: ${trends.daily.recentAverage}/day`);
      console.log(`  Previous Average: ${trends.daily.olderAverage}/day`);
    }
    
    if (trends.topErrorType) {
      console.log(`  Most Common: ${trends.topErrorType.type} (${trends.topErrorType.percentage}%)`);
    }
    
    if (criticalErrors.length > 0) {
      console.log('\n🚨 Critical Errors:');
      criticalErrors.slice(0, 5).forEach((error, index) => {
        console.log(`  ${index + 1}. ${new Date(error.timestamp).toLocaleString()}`);
        console.log(`     ${error.message.substring(0, 100)}...`);
      });
    }
    
    console.log('\n💡 Recommendations:');
    recommendations.forEach((rec, index) => {
      const priorityIcon = rec.priority === 'CRITICAL' ? '🔴' : 
                          rec.priority === 'HIGH' ? '🟠' : 
                          rec.priority === 'MEDIUM' ? '🟡' : '🟢';
      console.log(`  ${priorityIcon} ${rec.priority}: ${rec.issue}`);
      console.log(`     Action: ${rec.action}`);
      console.log(`     Impact: ${rec.impact}\n`);
    });
    
    // Health score
    let score = 100;
    if (summary.averagePerDay > 50) score -= 30;
    else if (summary.averagePerDay > 20) score -= 15;
    
    if (trends.daily?.direction === 'INCREASING') score -= 20;
    if (criticalErrors.length > 0) score -= 25;
    if (summary.errorsByType.Database > summary.totalErrors * 0.4) score -= 15;
    
    score = Math.max(0, score);
    
    console.log(`🏥 System Health Score: ${score}%`);
    
    if (score >= 90) {
      console.log('🎉 Excellent system health!');
    } else if (score >= 70) {
      console.log('👍 Good system health with minor issues');
    } else if (score >= 50) {
      console.log('⚠️  System health needs attention');
    } else {
      console.log('🚨 Critical system health issues detected');
    }
  }
}

// CLI usage
const days = process.argv[2] ? parseInt(process.argv[2]) : 7;
const reporter = new ErrorReporter();
reporter.generateReport(days);
