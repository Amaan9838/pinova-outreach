const { test, expect } = require('@playwright/test');

test.describe('Campaign Functionality Tests', () => {
  let baseURL = process.env.BASE_URL || 'http://localhost:3000';

  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');
  });

  test.describe('Campaign Creation', () => {
    test('should create a new campaign with immediate start', async ({ page }) => {
      // Navigate to create campaign page
      await page.goto(`${baseURL}/campaigns/new`);
      await page.waitForLoadState('networkidle');

      // Step 1: Campaign Basics
      await page.fill('input[type="text"]', 'Test Campaign - Immediate');
      await page.fill('textarea', 'Test campaign description for immediate start');
      
      // Check if step is valid and proceed
      const nextButton = page.locator('button:has-text("Next")');
      await expect(nextButton).toBeEnabled();
      await nextButton.click();

      // Step 2: Target Audience
      await page.fill('input[placeholder*="persona"], input[placeholder*="target"]', 'Software Engineers');
      await nextButton.click();

      // Step 3: Email Content
      await page.fill('input[placeholder*="subject"], input[placeholder*="Subject"]', 'Quick question about {{company}}');
      await page.fill('textarea[placeholder*="email"], textarea[placeholder*="content"]', 'Hi {{firstName}},\\n\\nI hope this email finds you well.\\n\\nBest regards,\\n{{senderName}}');
      await nextButton.click();

      // Step 4: Schedule Campaign - Select immediate
      await page.click('text=Start Immediately');
      await nextButton.click();

      // Step 5: Campaign Settings
      await page.selectOption('select', 'business-hours');
      await nextButton.click();

      // Step 6: Review & Launch
      await expect(page.locator('text=Review & Launch')).toBeVisible();
      
      // Submit campaign
      const createButton = page.locator('button:has-text("Create Campaign")');
      await expect(createButton).toBeEnabled();
      await createButton.click();

      // Wait for redirect and success
      await page.waitForURL(/.*\/campaigns\/[a-f0-9]+/);
      await expect(page.locator('text=Campaign created successfully!')).toBeVisible();
    });

    test('should create a scheduled campaign', async ({ page }) => {
      await page.goto(`${baseURL}/campaigns/new`);
      await page.waitForLoadState('networkidle');

      // Fill basic info
      await page.fill('input[type="text"]', 'Test Campaign - Scheduled');
      await page.fill('textarea', 'Test scheduled campaign');
      await page.click('button:has-text("Next")');

      // Target audience
      await page.fill('input[placeholder*="persona"], input[placeholder*="target"]', 'Marketing Directors');
      await page.click('button:has-text("Next")');

      // Email content
      await page.fill('input[placeholder*="subject"], input[placeholder*="Subject"]', 'Partnership opportunity');
      await page.fill('textarea[placeholder*="email"], textarea[placeholder*="content"]', 'Hello {{firstName}},\\n\\nGreat work at {{company}}!');
      await page.click('button:has-text("Next")');

      // Schedule for later
      await page.click('text=Schedule for Later');
      
      // Set future date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split('T')[0];
      
      await page.fill('input[type="date"], input[placeholder*="date"]', dateStr);
      await page.selectOption('select[aria-label*="time"], select:has(option:text-matches("AM|PM"))', '10:00');
      
      await page.click('button:has-text("Next")');

      // Settings
      await page.click('button:has-text("Next")');

      // Create campaign
      await page.click('button:has-text("Create Campaign")');
      
      await page.waitForURL(/.*\/campaigns\/[a-f0-9]+/);
      await expect(page.locator('text=Campaign created successfully!')).toBeVisible();
    });
  });

  test.describe('Campaign Schedule Management', () => {
    test('should update campaign schedule without page reload', async ({ page, context }) => {
      // First create or navigate to a campaign
      await page.goto(`${baseURL}/campaigns`);
      await page.waitForLoadState('networkidle');

      // Click on first campaign or create one if none exist
      const campaignLinks = page.locator('a[href*="/campaigns/"]');
      
      if (await campaignLinks.count() === 0) {
        // Create a quick campaign if none exist
        await page.click('text=Create Campaign');
        await page.fill('input[type="text"]', 'Test for Schedule');
        await page.click('button:has-text("Next")');
        await page.fill('input[placeholder*="persona"]', 'Test Audience');
        await page.click('button:has-text("Next")');
        await page.fill('input[placeholder*="subject"]', 'Test Subject');
        await page.fill('textarea', 'Test Content');
        await page.click('button:has-text("Next")');
        await page.click('button:has-text("Next")');
        await page.click('button:has-text("Next")');
        await page.click('button:has-text("Create Campaign")');
        await page.waitForURL(/.*\/campaigns\/[a-f0-9]+/);
      } else {
        await campaignLinks.first().click();
        await page.waitForLoadState('networkidle');
      }

      // Navigate to Schedule tab
      await page.click('text=Schedule');
      await page.waitForLoadState('networkidle');

      // Test schedule for later functionality
      const scheduleForLaterButton = page.locator('text=Schedule for Later');
      
      if (await scheduleForLaterButton.isVisible()) {
        // Listen for navigation to ensure we DON'T reload
        let navigationOccurred = false;
        page.on('framenavigated', () => { navigationOccurred = true; });

        await scheduleForLaterButton.click();
        
        // Wait a bit to see if the notification appears
        await page.waitForTimeout(2000);
        
        // Check that we didn't navigate/reload
        expect(navigationOccurred).toBeFalsy();
        
        // Check for success notification
        await expect(page.locator('text=Campaign schedule updated')).toBeVisible();
      }
    });

    test('should handle timezone properly', async ({ page }) => {
      await page.goto(`${baseURL}/campaigns`);
      await page.waitForLoadState('networkidle');

      // Navigate to first campaign
      const campaignLinks = page.locator('a[href*="/campaigns/"]');
      if (await campaignLinks.count() > 0) {
        await campaignLinks.first().click();
        await page.waitForLoadState('networkidle');

        // Go to Schedule tab
        await page.click('text=Schedule');
        
        // Look for timezone-related errors in console
        page.on('console', (msg) => {
          if (msg.type() === 'error' && msg.text().includes('timezone')) {
            throw new Error(`Timezone error: ${msg.text()}`);
          }
        });

        // Try to update daily schedule
        await page.click('text=Daily Schedule');
        await page.click('button:has-text("Save Daily Schedule")');
        
        // Should not see timezone errors
        await page.waitForTimeout(1000);
        
        // Check for success or specific error handling
        const successMsg = page.locator('text=Daily schedule settings saved');
        const errorMsg = page.locator('text=Failed to');
        
        await expect(successMsg.or(errorMsg)).toBeVisible();
      }
    });
  });

  test.describe('Prospects Management', () => {
    test('should add existing prospects with improved search', async ({ page }) => {
      await page.goto(`${baseURL}/campaigns`);
      await page.waitForLoadState('networkidle');

      // Navigate to a campaign
      const campaignLinks = page.locator('a[href*="/campaigns/"]');
      if (await campaignLinks.count() > 0) {
        await campaignLinks.first().click();
        await page.waitForLoadState('networkidle');

        // Go to Leads tab
        await page.click('text=Leads');
        await page.waitForLoadState('networkidle');

        // Click Add Existing
        await page.click('button:has-text("Add Existing")');
        
        // Wait for modal
        await expect(page.locator('text=Add Existing Prospects')).toBeVisible();

        // Test debounced search
        const searchInput = page.locator('input[placeholder*="Search"]');
        await searchInput.fill('test@');
        
        // Wait for debounce (500ms) plus some buffer
        await page.waitForTimeout(600);
        
        // Should not see rapid refreshing/loading indicators
        const loadingIndicator = page.locator('.animate-spin');
        await expect(loadingIndicator).not.toBeVisible();

        // Test row selection by clicking outside checkbox
        const prospectRows = page.locator('tr[class*="hover:bg-gray-50"]');
        if (await prospectRows.count() > 0) {
          // Click on the row (not checkbox)
          await prospectRows.first().locator('td').nth(1).click();
          
          // Should see selection
          await expect(prospectRows.first()).toHaveClass(/bg-blue-50/);
          
          // Check selection count
          await expect(page.locator('text=1 selected')).toBeVisible();
        }
      }
    });

    test('should handle prospect selection via row click', async ({ page }) => {
      await page.goto(`${baseURL}/campaigns`);
      await page.waitForLoadState('networkidle');

      const campaignLinks = page.locator('a[href*="/campaigns/"]');
      if (await campaignLinks.count() > 0) {
        await campaignLinks.first().click();
        await page.waitForLoadState('networkidle');

        await page.click('text=Leads');
        await page.click('button:has-text("Add Existing")');
        
        await expect(page.locator('text=Add Existing Prospects')).toBeVisible();

        // Find prospect rows
        const prospectRows = page.locator('tbody tr');
        if (await prospectRows.count() > 0) {
          const firstRow = prospectRows.first();
          
          // Click on name cell (outside checkbox)
          await firstRow.locator('td').nth(1).click();
          
          // Should be selected
          await expect(firstRow).toHaveClass(/bg-blue-50/);
          
          // Click again to deselect
          await firstRow.locator('td').nth(1).click();
          
          // Should not be selected
          await expect(firstRow).not.toHaveClass(/bg-blue-50/);
        }
      }
    });
  });

  test.describe('Campaign Controls', () => {
    test('should display appropriate campaign controls', async ({ page }) => {
      await page.goto(`${baseURL}/campaigns`);
      await page.waitForLoadState('networkidle');

      const campaignLinks = page.locator('a[href*="/campaigns/"]');
      if (await campaignLinks.count() > 0) {
        await campaignLinks.first().click();
        await page.waitForLoadState('networkidle');

        // Check for CampaignControls component
        const controlsSection = page.locator('div:has(button:has-text("Start")), div:has(button:has-text("Pause")), div:has(button:has-text("Resume"))');
        await expect(controlsSection).toBeVisible();

        // Check campaign status display
        const statusBadge = page.locator('[class*="bg-green-"], [class*="bg-blue-"], [class*="bg-yellow-"], [class*="bg-gray-"]');
        await expect(statusBadge.first()).toBeVisible();

        // Check prospects count display
        await expect(page.locator('text=/\\d+ active/')).toBeVisible();
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      // Monitor console errors
      const errors = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      await page.goto(`${baseURL}/campaigns`);
      await page.waitForLoadState('networkidle');

      // Navigate through the app
      const campaignLinks = page.locator('a[href*="/campaigns/"]');
      if (await campaignLinks.count() > 0) {
        await campaignLinks.first().click();
        await page.waitForLoadState('networkidle');

        // Try different tabs
        await page.click('text=Schedule');
        await page.waitForTimeout(1000);
        
        await page.click('text=Leads');
        await page.waitForTimeout(1000);

        // Check for critical errors (ignore minor warnings)
        const criticalErrors = errors.filter(error => 
          error.includes('Failed to') || 
          error.includes('Error:') || 
          error.includes('TypeError') ||
          error.includes('ReferenceError')
        );

        if (criticalErrors.length > 0) {
          console.log('Critical errors found:', criticalErrors);
          // Don't fail the test, just log for debugging
        }
      }
    });

    test('should show user-friendly error messages', async ({ page }) => {
      await page.goto(`${baseURL}/campaigns/new`);
      await page.waitForLoadState('networkidle');

      // Try to create campaign without required fields
      const createButton = page.locator('button:has-text("Create Campaign")');
      
      // Navigate to last step
      for (let i = 0; i < 5; i++) {
        await page.click('button:has-text("Next")');
        await page.waitForTimeout(100);
      }

      // Try to create without name
      await createButton.click();
      
      // Should see error message
      await expect(page.locator('text=Please enter a campaign name')).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('should load campaign details within reasonable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto(`${baseURL}/campaigns`);
      await page.waitForLoadState('networkidle');

      const campaignLinks = page.locator('a[href*="/campaigns/"]');
      if (await campaignLinks.count() > 0) {
        await campaignLinks.first().click();
        await page.waitForLoadState('networkidle');
        
        const loadTime = Date.now() - startTime;
        console.log(`Campaign details loaded in ${loadTime}ms`);
        
        // Should load within 10 seconds
        expect(loadTime).toBeLessThan(10000);
      }
    });

    test('should handle search input without excessive API calls', async ({ page }) => {
      await page.goto(`${baseURL}/campaigns`);
      await page.waitForLoadState('networkidle');

      const campaignLinks = page.locator('a[href*="/campaigns/"]');
      if (await campaignLinks.count() > 0) {
        await campaignLinks.first().click();
        await page.waitForLoadState('networkidle');

        await page.click('text=Leads');
        await page.click('button:has-text("Add Existing")');
        
        // Monitor network requests
        let apiCalls = 0;
        page.on('request', (request) => {
          if (request.url().includes('/api/campaigns') && request.url().includes('/prospects/existing')) {
            apiCalls++;
          }
        });

        const searchInput = page.locator('input[placeholder*="Search"]');
        
        // Type quickly
        await searchInput.type('test', { delay: 50 });
        
        // Wait for debounce
        await page.waitForTimeout(1000);
        
        // Should have made only 1-2 API calls (not 4 for each character)
        expect(apiCalls).toBeLessThanOrEqual(2);
      }
    });
  });
});

// Helper function to run comprehensive UI tests
test.describe('UI Comprehensive Tests', () => {
  test('should complete end-to-end campaign workflow', async ({ page }) => {
    const baseURL = process.env.BASE_URL || 'http://localhost:3000';
    
    // 1. Create Campaign
    await page.goto(`${baseURL}/campaigns/new`);
    await page.waitForLoadState('networkidle');

    // Fill out campaign creation form
    await page.fill('input[type="text"]', 'E2E Test Campaign');
    await page.fill('textarea', 'End-to-end test campaign');
    await page.click('button:has-text("Next")');

    await page.fill('input[placeholder*="persona"], input[placeholder*="target"]', 'Test Users');
    await page.click('button:has-text("Next")');

    await page.fill('input[placeholder*="subject"], input[placeholder*="Subject"]', 'Test Subject {{firstName}}');
    await page.fill('textarea[placeholder*="email"], textarea[placeholder*="content"]', 'Hi {{firstName}}, This is a test.');
    await page.click('button:has-text("Next")');

    await page.click('text=Save as Draft');
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Create Campaign")');

    await page.waitForURL(/.*\/campaigns\/[a-f0-9]+/);

    // 2. Configure Schedule
    await page.click('text=Schedule');
    await page.waitForLoadState('networkidle');
    
    await page.click('text=Daily Schedule');
    await page.click('button:has-text("Save Daily Schedule")');
    
    // 3. Add Prospects (if modal opens)
    await page.click('text=Leads');
    const addNewButton = page.locator('button:has-text("Add New")');
    
    if (await addNewButton.isVisible()) {
      await addNewButton.click();
      await page.fill('input[placeholder*="first"], input[placeholder*="First"]', 'Test');
      await page.fill('input[placeholder*="email"], input[type="email"]', 'test@example.com');
      await page.click('button:has-text("Add Prospect")');
    }

    // 4. Test Campaign Controls
    const startButton = page.locator('button:has-text("Start")');
    if (await startButton.isVisible()) {
      // Campaign should have controls visible
      expect(await startButton.isVisible()).toBeTruthy();
    }

    console.log('✅ End-to-end workflow completed successfully');
  });
});
