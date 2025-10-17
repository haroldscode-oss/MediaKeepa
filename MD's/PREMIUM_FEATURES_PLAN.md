# Premium Features Implementation Plan

## Overview
Plan to add **subtitles feature** + **premium subscription** with Stripe + Google OAuth to MediaKeepa.

---

## 🎯 Feature Requests

### 1. Subtitles Feature (4th Homepage Section)
- **What**: Download subtitles for videos (SRT, VTT, TTML formats)
- **Platform Support**: YouTube ONLY (100+ languages)
- **Why**: Makes MediaKeepa complete (Video/Audio/Image/Subtitles)

### 2. Premium Subscription
- **Pricing**: $4.99/month or $49.99/year
- **Payment**: Stripe integration
- **Auth**: Google OAuth (social login)
- **Benefits**: 
  - Ad-free experience
  - Higher rate limits (50/hour vs 10/hour)
  - Batch downloads (multiple videos at once)
  - Download history tracking
  - 4K quality priority

---

## 📋 Implementation Phases

### **Phase 1: Security (Week 1) - DO THIS FIRST** 🔴
**Status**: CRITICAL - Must complete before ANY features

**Why First?**: Without legal protection, site gets shut down in 3-6 months (wastes all feature work)

**Tasks** (2-3 hours total):
1. ✅ Add DRM platform blocker (blocks Netflix, Spotify, etc.)
2. ✅ Add legal page routes (/dmca, /terms, /privacy)
3. ✅ Fix path traversal vulnerabilities
4. ✅ Register DMCA agent ($6 cost)
5. ✅ Set up DMCA takedown email
6. ✅ Update file cleanup time (10min → 1 hour)

**Result**: 95-98% legally protected (same as yt-dlp's 15-year track record)

**Guide**: See `IMPLEMENTATION_STARTER.md` for step-by-step code

---

### **Phase 2: Subtitles Feature (Week 2-3)**
**Status**: Planned - Implement after security

**Backend** (`server.py`):
```python
@app.route('/api/list-subtitles', methods=['POST'])
@limiter.limit("10 per minute")
def list_subtitles():
    """List available subtitle languages for a video"""
    # Returns: [{"lang": "en", "name": "English"}, {"lang": "es", "name": "Spanish"}]
    
@app.route('/api/download-subtitle', methods=['POST'])
@limiter.limit("10 per minute")  
def download_subtitle():
    """Download subtitle in specified format (SRT/VTT/TTML)"""
    # Parameters: url, language, format
```

**Frontend** (React):
- Add 4th section to homepage (Video/Audio/Image/**Subtitles**)
- Language dropdown (auto-detect available languages)
- Format selector (SRT/VTT/TTML radio buttons)
- Same URL input + download flow

**Platform Limitation**:
- ✅ YouTube: 100+ languages (auto-generated + manual)
- ❌ TikTok: No subtitles API
- ❌ Instagram: No subtitles
- ❌ Twitter: No subtitles

**Time**: 5-8 hours

---

### **Phase 3: Monetization with Ads (Week 3-4)**
**Status**: Planned - Start making money BEFORE premium

**Why Before Premium?**: You need revenue NOW (you're 18 and broke)

**Ad Networks**:
1. **Google AdSense** ($50-200/month)
   - 3-5 banner ads on homepage
   - Apply at google.com/adsense
   - Approval: 1-2 weeks

2. **PropellerAds Pop-unders** ($200-500/month)
   - 1 pop-under per download
   - Less intrusive than pop-ups
   - Instant approval

**Revenue Projection** (10,000 monthly visitors):
- AdSense: $50-200/month (0.5-2% CTR)
- Pop-unders: $200-500/month ($2-5 CPM)
- **Total**: $300-600/month

**Time**: 2-3 hours (just add ad code)

---

### **Phase 4: Premium Subscription (Month 2-3)** 💰
**Status**: Future - Only AFTER making $500/month from ads

**Why Last?**: 
- Complex (20-30 hours work)
- Need 1,000+ daily visitors first
- Requires database + auth system
- Ads give you money NOW

#### **Tech Stack**:
- **Auth**: Google OAuth (firebase or Auth0)
- **Payments**: Stripe Checkout
- **Database**: PostgreSQL (user management)
- **Backend**: Flask-Login + JWT tokens

#### **Implementation Steps**:

**1. Google OAuth Setup** (3-4 hours):
```python
# Install: pip install google-auth google-auth-oauthlib
from google.oauth2 import id_token
from google.auth.transport import requests

@app.route('/auth/google')
def google_login():
    """Redirect to Google OAuth"""
    
@app.route('/auth/callback')  
def google_callback():
    """Handle Google OAuth callback, create user session"""
```

**Frontend**:
- "Sign in with Google" button
- User profile dropdown (top-right)
- Display user email + avatar

---

**2. Database Schema** (2-3 hours):
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    google_id VARCHAR(255),
    subscription_status VARCHAR(50), -- 'free', 'premium'
    subscription_ends TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE downloads (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    url TEXT,
    platform VARCHAR(50),
    format VARCHAR(20),
    downloaded_at TIMESTAMP DEFAULT NOW()
);
```

---

**3. Stripe Integration** (5-6 hours):
```python
# Install: pip install stripe
import stripe
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

@app.route('/api/create-checkout-session', methods=['POST'])
def create_checkout():
    """Create Stripe checkout for $4.99/month"""
    session = stripe.checkout.Session.create(
        payment_method_types=['card'],
        line_items=[{
            'price': 'price_xxx',  # Stripe price ID
            'quantity': 1,
        }],
        mode='subscription',
        success_url='https://mediakeepa.com/success',
        cancel_url='https://mediakeepa.com/cancel',
    )
    return jsonify({'checkout_url': session.url})

@app.route('/webhook/stripe', methods=['POST'])
def stripe_webhook():
    """Handle subscription confirmations"""
    # Update user.subscription_status = 'premium'
```

**Frontend**:
- "Upgrade to Premium" button (homepage + navbar)
- Pricing page (/pricing)
- Stripe checkout modal

---

**4. Premium Features** (8-10 hours):

**Rate Limiting** (premium users get higher limits):
```python
def get_user_limit():
    if current_user.is_premium:
        return "50 per hour"  # Premium
    else:
        return "10 per hour"  # Free
        
@app.route('/api/download', methods=['POST'])
@limiter.limit(get_user_limit)
def download():
    # Existing download logic
```

**Ad Removal**:
```javascript
// Frontend: Show ads only for free users
{!user.isPremium && <AdSenseAd />}
{!user.isPremium && <PopUnderScript />}
```

**Download History**:
```python
@app.route('/api/history', methods=['GET'])
@login_required
def get_history():
    """Return user's last 100 downloads"""
    downloads = Download.query.filter_by(user_id=current_user.id).limit(100)
    return jsonify([d.to_dict() for d in downloads])
```

**Batch Downloads**:
```python
@app.route('/api/batch-download', methods=['POST'])
@login_required
@premium_required
def batch_download():
    """Download multiple URLs at once (premium only)"""
    urls = request.json.get('urls', [])  # Max 10 URLs
    # Process each URL, return zip file
```

---

## 💰 Revenue Projections

### Month 1-3 (Ads Only)
- Visitors: 5,000-10,000/month
- Revenue: **$150-300/month**
- Cost: $0 (AdSense + PropellerAds are free)

### Month 4-6 (Ads + Premium)
- Visitors: 15,000-25,000/month
- Premium users: 50-100 (0.5% conversion)
- Revenue: 
  - Ads: $400-600
  - Premium: $249-499 (50-100 × $4.99)
  - **Total: $649-949/month**

### Month 7-12 (Mature)
- Visitors: 30,000-50,000/month  
- Premium users: 200-300
- Revenue:
  - Ads: $450-650
  - Premium: $999-1,299 (200-300 × $4.99)
  - **Total: $1,449-1,949/month**

---

## ⚠️ Critical Order

**DO THIS ORDER** (or you waste time):

1. **Security FIRST** (Week 1)
   - Without DMCA protection → site gets shut down
   - All feature work = wasted

2. **Subtitles SECOND** (Week 2-3)
   - Makes site complete (4 features)
   - Attracts more users

3. **Ads THIRD** (Week 3-4)
   - Start making money ASAP
   - You're broke, need income NOW

4. **Premium LAST** (Month 2-3)
   - Complex, takes 20-30 hours
   - Need user base first (1,000+ daily)
   - Ads already paying bills by then

---

## 📊 Cost Breakdown

### Minimum Investment
- DMCA agent registration: **$6** (one-time)
- Google OAuth: **$0** (free)
- Stripe: **$0** setup (2.9% + $0.30 per transaction)
- AdSense: **$0** (free)
- PropellerAds: **$0** (free)

**Total startup cost: $6**

### Monthly Costs (Future)
- Hosting: $0-5 (free tier Railway/Render)
- Database: $0-5 (free tier PostgreSQL)
- Stripe fees: ~15% of premium revenue ($0.30 + 2.9% per transaction)

**Total monthly: $0-10** (until you scale)

---

## 🎯 Next Steps

### Right Now (Today)
1. Open `IMPLEMENTATION_STARTER.md`
2. Implement **Step 1: DRM Blocker** (30 minutes)
3. Test with Netflix URL (should get blocked)
4. Continue with Steps 2-6 (security)

### This Week
- Complete Phase 1 (Security) - 2-3 hours total
- Register DMCA agent ($6)
- Test all security fixes

### Week 2-3
- Build subtitles feature (Phase 2)
- Test with YouTube videos

### Week 3-4  
- Apply for AdSense
- Add PropellerAds code
- Start making money 🤑

### Month 2+
- Build premium features (Phase 4)
- Only if making $500+/month from ads
- Only if getting 1,000+ daily visitors

---

## 📄 Related Documents

- `IMPLEMENTATION_STARTER.md` - Security implementation (DO FIRST)
- `SECURITY_AUDIT.md` - Why security is critical
- `SUBTITLE_SUPPORT_ANALYSIS.md` - Platform subtitle capabilities
- `FUTURE_FEATURES.md` - Long-term roadmap
- `IMPLEMENTATION_SUMMARY.md` - Safety percentages + cost analysis

---

**Remember**: Security FIRST, or nothing else matters! 🔒
