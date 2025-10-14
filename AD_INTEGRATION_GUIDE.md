# Media Keepa - Ad Integration Guide 🚀

## ✅ Phase 1 Complete: Code Preparation + Monetag Setup Started!

All ad placement containers and code triggers have been added to your website with clearly marked placeholders. The Monetag service worker (sw.js) has been integrated and is ready to serve ads!

---

## 🎉 What's Been Set Up:

### ✅ Monetag Service Worker
- **File:** `sw.js` is now in your project root
- **Registered:** Automatic service worker registration in index.html
- **Server Route:** Flask now serves `/sw.js` with correct MIME type
- **Purpose:** Handles push notifications and pop-under ads

---

## 📍 What Was Added to Your Website

### 1. **Head Section** (Lines ~9-31)
- PropellerAds site initialization script placeholder (can replace with Monetag)
- Adsterra site initialization script placeholder
- **Action needed:** Paste site-wide scripts from dashboards

### 2. **Service Worker Registration** (Bottom of page)
- ✅ **DONE!** Monetag sw.js automatically registered
- Handles pop-unders and push notifications
- Console logs success/failure for debugging

### 3. **Top Banner Ad** (Lines ~1563-1576)
- 728x90 banner above URL input box
- **Placeholder:** `<!-- PROPELLER_BANNER_CODE_HERE -->`
- **Action needed:** Paste PropellerAds banner ad code

### 3. **Native Ad** (Lines ~1716-1722)
- 750x100 native ad below video preview
- **Placeholder:** `<!-- ADSTERRA_NATIVE_AD_CODE_HERE -->`
- **Action needed:** Paste Adsterra native banner code

### 4. **Interstitial Ad** (Lines ~2478-2497)
- Full-screen forced ad on "Watch Ad" button click
- **Placeholder:** Code comments with integration instructions
- **Action needed:** Replace setTimeout with PropellerAds interstitial trigger

### 5. **Pop-Under Ad** (Lines ~2441-2456)
- Background ad triggered when clicking "Download Now"
- **Placeholder:** Code comments with integration instructions
- **Action needed:** Add PropellerAds pop-under trigger code

### 6. **Social Bar** (Lines ~2568-2573)
- Sticky footer ad at bottom of page
- **Placeholder:** `<!-- ADSTERRA_SOCIAL_BAR_CODE_HERE -->`
- **Action needed:** Paste Adsterra social bar code

---

## 🎯 Phase 2: Account Setup (YOUR TURN!)

### Step 1: Sign Up for PropellerAds
1. Go to: **https://propellerads.com**
2. Click "Sign Up" → Select "Publisher"
3. Fill in your details:
   - Website: `http://yourdomain.com` (or use localhost for testing)
   - Category: Media & Video
   - Traffic: 1000+ daily visitors (estimate)
4. Verify email → Account approved instantly!

### Step 2: Create PropellerAds Ad Zones
Once logged into PropellerAds dashboard:

#### A. Interstitial Ad Zone
1. Go to "Ad Zones" → "Create New Zone"
2. Select: **Interstitial**
3. Settings:
   - Name: "Drop Valley Interstitial"
   - Frequency: Once per session
   - Device: All devices
4. Copy the ad code provided

#### B. Pop-Under Ad Zone
1. Go to "Ad Zones" → "Create New Zone"
2. Select: **Pop-Under**
3. Settings:
   - Name: "Drop Valley Pop-Under"
   - Frequency: 1 per 24 hours
   - Device: All devices
4. Copy the ad code provided

#### C. Banner Ad Zone
1. Go to "Ad Zones" → "Create New Zone"
2. Select: **Banner**
3. Settings:
   - Name: "Drop Valley Top Banner"
   - Size: 728x90 (Leaderboard)
   - Device: Desktop
4. Copy the ad code provided

### Step 3: Sign Up for Adsterra
1. Go to: **https://adsterra.com**
2. Click "Sign Up" → Select "Publisher"
3. Fill in your details:
   - Website: `http://yourdomain.com`
   - Category: Downloads/Media
   - Traffic: 1000+ daily
4. Verify email → Approval within 24 hours (usually same day)

### Step 4: Create Adsterra Ad Zones
Once logged into Adsterra dashboard:

#### A. Native Ad Zone
1. Go to "Ad Formats" → "Create Ad"
2. Select: **Native Banner**
3. Settings:
   - Name: "Drop Valley Native Ad"
   - Size: 750x100
   - Position: Below video preview
4. Copy the ad code provided

#### B. Social Bar Zone
1. Go to "Ad Formats" → "Create Ad"
2. Select: **Social Bar**
3. Settings:
   - Name: "Drop Valley Footer Bar"
   - Position: Bottom (sticky)
   - Device: All devices
4. Copy the ad code provided

---

## 🔧 Phase 3: Paste Ad Codes (YOUR TURN!)

### Step 1: Open `index.html` in a Text Editor
Use VS Code, Notepad++, or any code editor

### Step 2: Find Each Placeholder and Paste Code

#### 1. PropellerAds Site Script (Head Section)
**Find:** `<!-- PROPELLER_SITE_SCRIPT_HERE -->`
**Paste:** The site-wide initialization script from PropellerAds dashboard

#### 2. Adsterra Site Script (Head Section)
**Find:** `<!-- ADSTERRA_SITE_SCRIPT_HERE -->`
**Paste:** The site-wide initialization script from Adsterra dashboard

#### 3. PropellerAds Top Banner
**Find:** `<!-- PROPELLER_BANNER_CODE_HERE -->`
**Paste:** Your PropellerAds 728x90 banner code

#### 4. Adsterra Native Ad
**Find:** `<!-- ADSTERRA_NATIVE_AD_CODE_HERE -->`
**Paste:** Your Adsterra 750x100 native banner code

#### 5. PropellerAds Interstitial (Advanced)
**Find:** The code block at lines ~2478-2497 with comments
**Replace:** The `setTimeout(async () => { ... }, 2000);` section with:
```javascript
// Trigger PropellerAds interstitial
if (typeof window.propellerads !== 'undefined') {
    window.propellerads.showInterstitial({
        onClose: async function() {
            await proceedWithDownload();
        }
    });
} else {
    // Fallback if ad script not loaded
    await proceedWithDownload();
}
```

#### 6. PropellerAds Pop-Under (Advanced)
**Find:** The code block at lines ~2441-2456 with comments
**Add:** Right after the comments (before `if (!url) {`):
```javascript
// Trigger PropellerAds pop-under
if (typeof window.propellerads !== 'undefined') {
    window.propellerads.triggerPopunder();
}
```

#### 7. Adsterra Social Bar
**Find:** `<!-- ADSTERRA_SOCIAL_BAR_CODE_HERE -->`
**Paste:** Your Adsterra social bar code

### Step 3: Save the File

### Step 4: Test Locally
1. Make sure your Flask server is running: `python server.py`
2. Open http://127.0.0.1:5000 in your browser
3. Try downloading a video
4. Check browser console (F12) for any ad errors
5. Verify all ads appear correctly

---

## 💰 Expected Revenue

### With Your Setup:
- **PropellerAds CPM:** $10-15
- **Adsterra CPM:** $4-8
- **Combined Average:** $18 per 1000 downloads

### Monthly Projections:
| Daily Downloads | Monthly Revenue |
|----------------|-----------------|
| 500/day        | ~$270/month     |
| 1,000/day      | ~$540/month     |
| 2,000/day      | ~$1,080/month   |
| 5,000/day      | ~$2,700/month   |

### Revenue Breakdown Per Download:
- Pop-under on Download button: $0.012
- Interstitial on "Watch Ad" button: $0.010
- Banner ad (top): $0.002
- Native ad: $0.002
- Social bar: $0.002
- **Total per download:** ~$0.028 (2.8 cents)

---

## 🚀 Phase 4: Production Deployment (FUTURE)

When ready to go live:

1. **Get a Domain:** ($10/year)
   - GoDaddy, Namecheap, Google Domains

2. **Get Hosting:** ($5-10/month)
   - Heroku (free tier)
   - PythonAnywhere (free tier)
   - DigitalOcean ($5/month)

3. **SSL Certificate:** (FREE)
   - Let's Encrypt (automatic on most hosts)

4. **Update Ad Networks:**
   - Change website URL in PropellerAds dashboard
   - Change website URL in Adsterra dashboard

---

## ❓ Troubleshooting

### Ads Not Showing?
- Check browser console (F12) for errors
- Verify ad codes pasted correctly (no missing `<script>` tags)
- Make sure site-wide initialization scripts in `<head>` are loaded first
- Try clearing browser cache (Ctrl+F5)

### Pop-Under Not Working?
- Modern browsers may block pop-unders by default
- Users need to allow pop-ups for your site
- This is normal and expected behavior

### Low Earnings?
- Need at least 100-200 downloads/day to see meaningful income
- Revenue increases with more traffic
- Geographic location matters (US/UK traffic pays more)

---

## 📝 Summary Checklist

- [x] Phase 1: Code preparation (COMPLETE - automated by agent)
- [ ] Phase 2: Sign up for PropellerAds
- [ ] Phase 2: Create 3 ad zones on PropellerAds (Interstitial, Pop-Under, Banner)
- [ ] Phase 2: Sign up for Adsterra
- [ ] Phase 2: Create 2 ad zones on Adsterra (Native, Social Bar)
- [ ] Phase 3: Paste all 7 ad codes into placeholders
- [ ] Phase 3: Test locally to verify ads work
- [ ] Phase 4: Deploy to production (future)

---

## 💡 Pro Tips

1. **Start with test mode:** Most ad networks have test/preview modes - use them first!
2. **Monitor analytics:** Check daily stats on PropellerAds and Adsterra dashboards
3. **Optimize placement:** If certain ads perform poorly, try different sizes/positions
4. **Geographic targeting:** Enable higher-paying countries in ad network settings
5. **Mobile optimization:** 60%+ of traffic is mobile - make sure ads are responsive
6. **A/B testing:** Try different ad combinations after a few weeks

---

## 🎉 You're Ready!

Your code is fully prepared. Now just:
1. Sign up for the ad networks (15 minutes)
2. Create your ad zones (10 minutes)
3. Paste the codes (5 minutes)
4. Start earning money! 💸

**Questions?** Check PropellerAds and Adsterra support docs, or test with their demo codes first.

Good luck! 🚀
