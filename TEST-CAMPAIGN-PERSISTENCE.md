# Campaign Data Persistence Test Guide

## Quick Test Instructions

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Open browser and navigate to**: `http://localhost:3000`

3. **Create or open a campaign**

4. **Test Follow-up Tab**:
   - Enable follow-ups toggle
   - Add a template with subject and content
   - Click "Save Follow-up Settings"
   - **Reload the page** - settings should persist

5. **Test Options Tab**:
   - Change tracking settings
   - Set daily limit
   - Add notes
   - Click "Save Settings"
   - **Reload the page** - settings should persist

6. **Test Schedule Tab**:
   - Change schedule name
   - Modify timing (from/to times)
   - Change timezone
   - Toggle days of week
   - Click "Save Schedule"
   - **Reload the page** - settings should persist

## Debug Console Logs

All tabs now have detailed console logging. Open browser DevTools (F12) to see:
- API request/response details
- Data loading status
- Save operation results
- Error messages

## What Was Fixed

### Follow-up Tab Issues:
- ✅ Added proper data loading on component mount
- ✅ Fixed API endpoint integration
- ✅ Added comprehensive error handling
- ✅ State synchronization with backend

### Options Tab Issues:
- ✅ Created dedicated `/options` API endpoint
- ✅ Added proper data loading on component mount
- ✅ Fixed save operation to use correct endpoint
- ✅ State synchronization with backend

### Schedule Tab Issues:
- ✅ Added proper data loading on component mount
- ✅ Fixed API endpoint integration
- ✅ Added comprehensive error handling
- ✅ State synchronization with backend

### Backend Infrastructure:
- ✅ Updated Campaign schema with all required fields
- ✅ All API endpoints properly handle GET/PUT operations
- ✅ Database persistence working correctly
- ✅ Campaign execution integration ready

## Expected Behavior

After making changes in any tab and saving:
1. Success toast notification appears
2. Page reload should show saved settings
3. Console logs show successful API calls
4. Database contains persisted data

## If Issues Persist

Check browser console for error messages and verify:
1. MongoDB connection is working
2. Campaign ID is valid
3. API endpoints are accessible
4. No JavaScript errors in console
