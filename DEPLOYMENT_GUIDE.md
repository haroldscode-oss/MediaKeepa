# 🚀 MediaKeepa Production Deployment Guide

**Your Setup:**
- 💰 Monetization: Monetag (pop-under ads)
- 🆓 Hosting: Free tier (Railway recommended)
- 🌐 Domain: $5 domain from Namecheap/Porkbun
- 🔒 SSL/CDN: Cloudflare (free plan)
- 🎯 Goal: Public video downloader with ads

---

## 📋 **COMPLETE DEPLOYMENT CHECKLIST**

### **Phase 1: Pre-Deployment Setup (Do This First)**

#### ✅ **1. Fix Missing Dependencies**

Your `requirements.txt` is missing Flask-Limiter. Fix it now:

```bash
# Activate virtual environment
cd c:\Users\32ver\OneDrive\Desktop\Dropvalley
.\.venv\Scripts\activate

# Install missing package
pip install Flask-Limiter

# Update requirements.txt
pip freeze > requirements.txt

# Verify it's there
type requirements.txt
```

**You should see:**
```
Flask==3.1.2
Flask-Cors==6.0.1
Flask-Limiter==3.x.x  ← This should be there now!
requests==2.32.5
```

#### ✅ **2. Build Frontend**

```bash
cd spark-template
npm run build
```

This creates `spark-template/dist/` folder with optimized production files.

#### ✅ **3. Create Production Server File**

Create `Procfile` in root directory:

```
web: gunicorn -w 4 -b 0.0.0.0:$PORT server:app --timeout 120
```

#### ✅ **4. Add Production Dependencies**

```bash
# Back to root
cd ..

# Install production server
pip install gunicorn

# Update requirements again
pip freeze > requirements.txt
```

#### ✅ **5. Create .env File**

```bash
copy .env.example .env
```

Edit `.env` - you'll update this with your domain later:
```
ALLOWED_ORIGINS=http://localhost:5000
```

#### ✅ **6. Commit Everything**

```bash
git add .
git commit -m "Add production dependencies and build configuration"
git push origin main
```

---

### **Phase 2: Buy Domain & Setup Cloudflare**

#### 🌐 **Step 1: Buy Domain ($5)**

**Best Registrars:**
1. **Namecheap** - Easy, cheap, good UI
2. **Porkbun** - Cheapest, includes free WHOIS privacy
3. **Cloudflare Registrar** - At-cost pricing (best for renewals)

**Domain Ideas for MediaKeepa:**
- `mediakeepa.com`
- `keepamedia.com`
- `savemediahub.com`
- `videokeepa.net`

💡 Use `.com` for trust, or `.net`/`.co` if cheaper.

#### 🔒 **Step 2: Setup Cloudflare (Free SSL + CDN)**

**Why Cloudflare?**
- ✅ Free SSL certificate (HTTPS lock icon)
- ✅ Free CDN (faster loading worldwide)
- ✅ DDoS protection
- ✅ Caching (reduces your server load)
- ✅ Analytics

**Setup Steps:**

1. **Sign up at Cloudflare.com** (free account)

2. **Add Your Site**
   - Click "Add Site"
   - Enter your domain: `yourdomain.com`
   - Select "Free Plan"

3. **Change Nameservers**
   - Cloudflare will show you 2 nameservers like:
     ```
     ns1.cloudflare.com
     ns2.cloudflare.com
     ```
   - Go to your domain registrar (Namecheap/Porkbun)
   - Find "Nameservers" or "DNS Settings"
   - Change from default to Cloudflare's nameservers
   - **Wait 1-24 hours for DNS propagation** (usually 30 min)

4. **Configure SSL in Cloudflare**
   - Go to SSL/TLS tab
   - Set to **"Full (Strict)"** mode
   - Enable "Always Use HTTPS"
   - Enable "Automatic HTTPS Rewrites"

5. **Speed Optimizations**
   - Go to Speed tab
   - Enable "Auto Minify" (CSS, JS, HTML)
   - Enable "Brotli" compression
   - Enable "Rocket Loader" (optional - test if it works with your ads)

6. **Security Settings**
   - Go to Security tab
   - Enable "Browser Integrity Check"
   - Set Security Level to "Medium"
   - Enable "Bot Fight Mode" (free tier)

---

### **Phase 3: Deploy to Railway (Free Hosting)**

**Why Railway?**
- ✅ $5/month free credit (500 hours)
- ✅ Easy GitHub deployment
- ✅ Automatic HTTPS
- ✅ Environment variables
- ✅ Good for Flask + yt-dlp

#### 🚂 **Railway Setup:**

1. **Sign Up**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub (connect your account)

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose `MediaKeepa` repository
   - Railway will auto-detect it's a Python project

3. **Configure Environment Variables**
   - Click on your deployed service
   - Go to "Variables" tab
   - Add:
     ```
     ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
     PORT=8080
     ```

4. **Set Build Command** (if needed)
   - Go to "Settings" tab
   - Build Command: `cd spark-template && npm install && npm run build`
   - Start Command: `gunicorn -w 4 -b 0.0.0.0:$PORT server:app --timeout 120`

5. **Wait for Deployment**
   - Railway will build and deploy automatically
   - You'll get a Railway URL like: `mediakeepa-production.up.railway.app`

6. **Test Railway URL**
   - Visit the Railway URL in browser
   - Make sure site loads correctly

---

### **Phase 4: Connect Domain to Railway via Cloudflare**

#### 🔗 **DNS Configuration:**

1. **Get Railway IP/CNAME**
   - In Railway, go to "Settings" → "Networking"
   - You'll see something like: `mediakeepa-production.up.railway.app`

2. **Add DNS Records in Cloudflare**
   - Go to Cloudflare Dashboard → DNS tab
   - Add these records:

   **For root domain (yourdomain.com):**
   ```
   Type: CNAME
   Name: @
   Target: mediakeepa-production.up.railway.app
   Proxy: ON (orange cloud)
   ```

   **For www subdomain (www.yourdomain.com):**
   ```
   Type: CNAME
   Name: www
   Target: mediakeepa-production.up.railway.app
   Proxy: ON (orange cloud)
   ```

3. **Update Railway Settings**
   - In Railway, go to "Settings" → "Networking"
   - Add custom domain: `yourdomain.com`
   - Add custom domain: `www.yourdomain.com`

4. **Update .env and Redeploy**
   - Update your `.env` file locally:
     ```
     ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
     ```
   - Commit and push:
     ```bash
     git add .env
     git commit -m "Update CORS for production domain"
     git push origin main
     ```
   - Railway will auto-redeploy

5. **Wait for DNS Propagation (15-30 minutes)**
   - Test: `https://yourdomain.com`
   - Should show your site with 🔒 green padlock!

---

### **Phase 5: Add Monetag Pop-Under Ads**

#### 💰 **Monetag Integration:**

1. **Sign Up at Monetag**
   - Go to [monetag.com](https://monetag.com)
   - Sign up as Publisher
   - Verify your account

2. **Add Your Website**
   - In Monetag dashboard, add your domain: `yourdomain.com`
   - Choose ad formats:
     - ✅ **Pop-under ads** (main revenue)
     - ✅ **Banner ads** (optional - top/bottom)
     - ✅ **Interstitial ads** (optional - between downloads)

3. **Get Ad Code**
   - Monetag will give you JavaScript code like:
   ```html
   <script src="https://monetag.com/js/xxxxx.js"></script>
   ```

4. **Add Code to Your Site**
   
   Open `spark-template/index.html`:

   ```html
   <!DOCTYPE html>
   <html lang="en">
     <head>
       <meta charset="UTF-8" />
       <link rel="icon" type="image/x-icon" href="/favicon.ico" />
       <meta name="viewport" content="width=device-width, initial-scale=1.0" />
       <title>MediaKeepa - Video Downloader</title>
       
       <!-- Monetag Pop-Under Ad Script -->
       <script async src="https://monetag.com/js/xxxxx.js"></script>
     </head>
     <body>
       <div id="root"></div>
       <script type="module" src="/src/main.tsx"></script>
     </body>
   </html>
   ```

5. **Rebuild and Deploy**
   ```bash
   cd spark-template
   npm run build
   cd ..
   git add .
   git commit -m "Add Monetag ads"
   git push origin main
   ```

6. **Wait for Approval**
   - Monetag will review your site (1-3 days)
   - Once approved, ads start showing
   - Track earnings in Monetag dashboard

---

### **Phase 6: Optimization & Monitoring**

#### 📊 **Analytics (Free)**

**Cloudflare Analytics:**
- Already built-in, no setup needed
- Shows traffic, bandwidth, cache stats
- Go to Cloudflare Dashboard → Analytics

**Google Analytics (Optional):**
1. Sign up at [analytics.google.com](https://analytics.google.com)
2. Create property for your domain
3. Get tracking ID: `G-XXXXXXXXXX`
4. Add to `spark-template/index.html`:
   ```html
   <!-- Google Analytics -->
   <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
   <script>
     window.dataLayer = window.dataLayer || [];
     function gtag(){dataLayer.push(arguments);}
     gtag('js', new Date());
     gtag('config', 'G-XXXXXXXXXX');
   </script>
   ```

#### 🔍 **SEO Optimization**

Update `spark-template/index.html` with better meta tags:

```html
<head>
  <meta charset="UTF-8" />
  <link rel="icon" type="image/x-icon" href="/favicon.ico" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  
  <!-- SEO Meta Tags -->
  <title>MediaKeepa - Free Video Downloader | Download Videos Online</title>
  <meta name="description" content="Download videos from YouTube, TikTok, Instagram, Twitter, and 1000+ sites. Fast, free, and easy video downloader with multiple formats and quality options." />
  <meta name="keywords" content="video downloader, youtube downloader, tiktok downloader, instagram downloader, free video download" />
  
  <!-- Open Graph for Social Media -->
  <meta property="og:title" content="MediaKeepa - Free Video Downloader" />
  <meta property="og:description" content="Download videos from 1000+ websites in seconds" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://yourdomain.com" />
  
  <!-- Monetag Ads -->
  <script async src="https://monetag.com/js/xxxxx.js"></script>
</head>
```

#### ⚡ **Performance Tips**

**Cloudflare Settings:**
- Enable Page Rules for caching static assets
- Cache Level: Standard
- Browser Cache TTL: 4 hours

**Railway Scaling (if needed later):**
- Monitor usage in Railway dashboard
- If you hit limits, upgrade plan ($5-20/month)
- Or migrate to DigitalOcean ($4/month)

---

## 🎯 **FINAL CHECKLIST BEFORE GOING LIVE**

- [ ] Flask-Limiter added to requirements.txt
- [ ] Frontend built (`npm run build`)
- [ ] Procfile created
- [ ] Domain purchased ($5)
- [ ] Cloudflare account created
- [ ] Nameservers pointed to Cloudflare
- [ ] SSL set to "Full (Strict)" in Cloudflare
- [ ] Railway project deployed
- [ ] Environment variables set in Railway (`ALLOWED_ORIGINS`)
- [ ] Custom domain added to Railway
- [ ] DNS records added in Cloudflare (CNAME @ and www)
- [ ] Site accessible at `https://yourdomain.com` with 🔒
- [ ] Monetag account created
- [ ] Ad code added to index.html
- [ ] Monetag site submitted for approval
- [ ] Test download functionality on live site
- [ ] Test rate limiting (try 51 downloads in 1 minute - should block)
- [ ] Analytics setup (Cloudflare + optional Google Analytics)

---

## 💰 **ESTIMATED COSTS**

| Item | Cost | Frequency |
|------|------|-----------|
| Domain | $5-15 | Per year |
| Cloudflare | $0 | Free forever |
| Railway | $0 | Free tier (500 hrs/month) |
| **Total** | **$5-15** | **First year** |

**After Railway Free Tier Runs Out (if it does):**
- Railway paid: $5-20/month
- OR migrate to DigitalOcean: $4/month
- OR Render.com free tier: $0

---

## 🚨 **COMMON ISSUES & FIXES**

### **Issue 1: Site Shows "Too Many Redirects"**
**Fix:** In Cloudflare, set SSL to "Full (Strict)", not "Flexible"

### **Issue 2: CORS Errors in Production**
**Fix:** Make sure `ALLOWED_ORIGINS` environment variable is set in Railway with your actual domain

### **Issue 3: Downloads Failing in Production**
**Fix:** Railway might need more memory. Check logs in Railway dashboard.

### **Issue 4: Ads Not Showing**
**Fix:** 
- Wait for Monetag approval (1-3 days)
- Check browser console for errors
- Make sure ad script is in `<head>` tag
- Try different browser (some have ad blockers built-in)

### **Issue 5: Rate Limit Errors**
**Fix:** Verify Flask-Limiter is installed: `pip list | grep -i limiter`

---

## 📞 **SUPPORT RESOURCES**

- **Railway Discord:** [railway.app/discord](https://railway.app/discord)
- **Cloudflare Community:** [community.cloudflare.com](https://community.cloudflare.com)
- **Monetag Support:** In your Monetag dashboard
- **Your GitHub Repo:** [github.com/haroldscode-oss/MediaKeepa](https://github.com/haroldscode-oss/MediaKeepa)

---

## 🎉 **NEXT STEPS AFTER DEPLOYMENT**

1. **Share on Social Media**
   - Twitter, Reddit (r/webdev, r/software), Facebook groups
   - TikTok/YouTube showing how it works

2. **Submit to Directories**
   - ProductHunt
   - AlternativeTo
   - Free online tools directories

3. **SEO Content**
   - Add blog posts about how to download videos
   - Tutorial videos linking to your site

4. **Monitor & Optimize**
   - Check Cloudflare analytics weekly
   - Track Monetag earnings
   - Adjust rate limits based on real traffic
   - Add more features based on user feedback

---

**🚀 YOU'RE READY TO LAUNCH!**

Follow this guide step-by-step and you'll have a professional, monetized video downloader live on the internet for just $5! 🎊
