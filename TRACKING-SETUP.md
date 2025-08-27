# Email Tracking Setup Guide

## The Problem

Email open tracking doesn't work on localhost because:
- Tracking pixel URL: `http://localhost:3001/api/track/open/{trackingId}`
- Email clients (Gmail, Outlook) can't access localhost URLs
- They need publicly accessible URLs

## Solutions

### Option 1: ngrok (Quickest for Testing)

1. **Install ngrok**: Download from ngrok.com
2. **Expose localhost**:
   ```bash
   ngrok http 3001
   ```
3. **Update .env.local**:
   ```env
   NEXT_PUBLIC_APP_URL=https://abc123.ngrok-free.app
   ```
4. **Restart your app** - tracking will now work!

### Option 2: Deploy to Free Hosting

**Vercel (Recommended)**:
1. Push code to GitHub
2. Connect Vercel to repository
3. Deploy automatically
4. Update `NEXT_PUBLIC_APP_URL` to your vercel domain

**Netlify**:
1. Similar to Vercel
2. Free tier available

### Option 3: Cloudflare Tunnel (Free)

1. **Install cloudflared**
2. **Create tunnel**:
   ```bash
   cloudflared tunnel --url localhost:3001
   ```
3. **Update env** with provided URL

### Option 4: Test with Real Recipients

**For now, test tracking by:**
1. Send email to your Gmail/Outlook
2. Use ngrok or deploy to test properly
3. Check server logs to confirm tracking pixel hits

## Current Status

✅ **Tracking code is correct**
❌ **localhost limitation prevents tracking**

## Quick Fix for Testing

Use ngrok:
```bash
# Terminal 1
npm run dev

# Terminal 2  
ngrok http 3001

# Update NEXT_PUBLIC_APP_URL with ngrok URL
# Send test email - tracking will work!
```

## Production Setup

For production:
1. Deploy to Vercel/Netlify
2. Set proper domain in `NEXT_PUBLIC_APP_URL`
3. All tracking features will work perfectly

The tracking system is built correctly - it just needs a public URL!
