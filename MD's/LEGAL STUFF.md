# LEGAL FRAMEWORK FOR MEDIAKEEPA

**Last Updated:** January 2025  
**Version:** 1.0

---

## 🎯 PRIMARY GOAL

**Support MAXIMUM platforms while maintaining 100% LEGAL compliance.**

This document establishes the legal boundaries for MediaKeepa development to maximize platform support without engaging in illegal activities.

---

## ⚖️ LEGAL PRINCIPLES

### 1. **NO DRM CIRCUMVENTION** (CRITICAL - FEDERAL CRIME)

**Law:** Digital Millennium Copyright Act (DMCA) §1201  
**Penalties:** Up to **$500,000 fine** + **5 years in federal prison** (per violation)

**What This Means:**
- **NEVER bypass, crack, or circumvent DRM (Digital Rights Management) technology**
- DRM platforms use encryption (Widevine, FairPlay, PlayReady) to protect content
- Even if you find code online to decrypt DRM, using it is a **federal crime**
- LLC protection **DOES NOT** cover criminal charges

**DRM Platforms to AVOID Direct Support:**
- **Music:** Spotify, Apple Music, Tidal, Deezer, Amazon Music, YouTube Music (premium)
- **Video:** Netflix, Hulu, Disney+, HBO Max, Amazon Prime Video, Peacock
- **Live TV:** Cable streaming services, sports streaming with DRM

**Legal Alternative:** YouTube Search Fallback (see Technical Implementation)

---

### 2. **NO FALSE ADVERTISING**

**Law:** Federal Trade Commission Act (FTC Act) §5  
**Penalties:** Civil fines, injunctions, business closure

**What This Means:**
- **NEVER claim** "Download from Spotify" if you're actually getting it from YouTube
- **BE TRANSPARENT:** "We search YouTube for this song" not "Downloading from Spotify"
- **ACCURATE DISCLOSURES:** Footer disclaimers, "How It Works" page
- **NO DECEPTIVE PRACTICES:** Don't hide YouTube fallback method

**UI Requirements:**
- ✅ Show "🔍 Searching YouTube for this song..." when using fallback
- ✅ Add footer: "ℹ️ DRM-protected services use YouTube search fallback. [Learn More]"
- ✅ "How It Works" page explains the fallback method clearly
- ❌ Don't show Spotify logo when downloading from YouTube
- ❌ Don't claim direct Spotify support

---

### 3. **RESPECT INTELLECTUAL PROPERTY**

**What This Means:**
- **NEVER** host pirated content on MediaKeepa servers
- **NEVER** pre-download copyrighted content for users
- **USER RESPONSIBILITY:** Users are responsible for legal use of downloads
- **DMCA COMPLIANCE:** Respond to takedown requests within 24-48 hours

**Safe Practices:**
- ✅ Act as a tool (like a web browser)
- ✅ No caching of downloaded media
- ✅ Register DMCA agent with US Copyright Office ($6 fee)
- ✅ Clear Terms of Service: "User responsible for legal use"
- ❌ Don't encourage piracy in marketing
- ❌ Don't pre-download trending songs/videos

---

### 4. **HONEST TERMS OF SERVICE**

**What This Means:**
- Clear explanation of what MediaKeepa does
- User assumes responsibility for legal use
- Right to refuse service for illegal requests
- Privacy policy for any data collected

---

## 🛠️ TECHNICAL IMPLEMENTATION RULES

### **DRM Platform Detection**

When user submits a URL, check against DRM platform list:

```python
DRM_MUSIC_PLATFORMS = [
    'spotify.com',
    'music.apple.com',
    'tidal.com',
    'deezer.com',
    'music.amazon.com',
    'music.youtube.com'  # Premium only
]

DRM_VIDEO_PLATFORMS = [
    'netflix.com',
    'hulu.com',
    'disneyplus.com',
    'hbomax.com',
    'primevideo.com',
    'peacocktv.com'
]
```

### **YouTube Search Fallback Method** (LEGAL)

For DRM music platforms ONLY (not video - no legal alternative):

1. **Extract Metadata:**
   - Song title, artist name, album (if available)
   - Use platform's embed API or URL parsing (no DRM bypass)

2. **Search YouTube:**
   ```python
   search_query = f"{artist} - {song_title}"
   yt_url = f"ytsearch:{search_query}"  # yt-dlp feature
   ```

3. **Download from YouTube:**
   - Use standard yt-dlp extraction (no DRM involved)
   - YouTube's Terms allow personal use downloads

4. **Transparent Disclosure:**
   - UI shows: "🔍 Searching YouTube for '{artist} - {song_title}'..."
   - Downloaded file metadata: Source = YouTube, not Spotify
   - "How It Works" page explains this process

**Why This Is Legal:**
- ✅ No DRM circumvention (not accessing encrypted Spotify streams)
- ✅ Only using public metadata (song title/artist)
- ✅ Downloading from YouTube (non-DRM platform)
- ✅ Transparent to users (no deception)

---

## 📊 PLATFORM SUPPORT MATRIX

### **DIRECT SUPPORT (1800+ Sites)**

These platforms have **NO DRM** - yt-dlp extracts directly:

**Video Platforms:**
- YouTube (non-premium), Vimeo, Dailymotion, TikTok, Twitter, Facebook
- Instagram, Reddit, Twitch (VODs), Rumble, BitChute

**Adult Platforms:**
- XVideos, XNXX, RedTube, YouPorn, SpankBang, XHamster, Beeg, TNAFlix

**Social Media:**
- TikTok, Twitter, Instagram, Facebook, LinkedIn, Pinterest

**Audio Platforms:**
- SoundCloud, Bandcamp, Mixcloud, Audiomack

**Educational:**
- Coursera, Udemy, Khan Academy, TED Talks

**Implementation:** Standard yt-dlp extraction, no special handling

---

### **FALLBACK SUPPORT (Music Only)**

These platforms use DRM - legal **YouTube search fallback**:

- ✅ Spotify → YouTube search
- ✅ Apple Music → YouTube search
- ✅ Tidal → YouTube search
- ✅ Deezer → YouTube search
- ✅ Amazon Music → YouTube search

**Implementation:** 
1. Detect DRM music platform
2. Extract metadata (song/artist)
3. Search YouTube with `ytsearch:` prefix
4. Download from YouTube
5. Show transparent UI messaging

---

### **NOT SUPPORTED (No Legal Alternative)**

These platforms use DRM with **NO legal workaround**:

- ❌ Netflix (video DRM - no YouTube equivalent)
- ❌ Hulu (video DRM)
- ❌ Disney+ (video DRM)
- ❌ HBO Max (video DRM)
- ❌ Amazon Prime Video (video DRM)
- ❌ Cable/Live TV streams (encryption + DRM)

**Implementation:** Return error: "This platform uses DRM protection and cannot be supported legally. [Learn More]"

---

## 📜 DMCA SAFE HARBOR COMPLIANCE

To avoid liability for user-uploaded content, follow DMCA safe harbor:

### **Requirements:**

1. **Register DMCA Agent:**
   - File with US Copyright Office ($6 fee)
   - Update every 3 years
   - Provide contact email/address

2. **Designated Contact:**
   - Email: dmca@mediakeepa.com (or equivalent)
   - Physical address (can be LLC registered agent)

3. **Takedown Process:**
   - Respond within 24-48 hours
   - Remove/disable access to infringing material
   - Notify user of takedown
   - Allow counter-notice (10-14 business days)

4. **Repeat Infringer Policy:**
   - Terminate accounts of repeat offenders
   - IP bans for severe cases

5. **No Actual Knowledge:**
   - Don't manually curate pirated content
   - Don't ignore obvious infringement
   - Respond promptly to complaints

---

## 📄 REQUIRED LEGAL PAGES

### **1. Terms of Service**

Must include:
- Service description (media downloading tool)
- User responsibility for legal use
- DRM platform disclaimer
- Right to refuse service
- DMCA compliance statement
- Dispute resolution (arbitration clause)

**Key Clause:**
> "MediaKeepa is a tool for downloading publicly accessible media. Users are solely responsible for ensuring their use complies with applicable laws and platform Terms of Service. We do not circumvent DRM or encryption. DRM-protected platforms (Spotify, Netflix, etc.) use YouTube search fallback or are not supported."

---

### **2. Privacy Policy**

Must include:
- Data collected (IP addresses, URLs, analytics)
- How data is used (service functionality, analytics)
- Third-party services (Google Analytics, ad networks)
- Data retention (auto-delete temp files after 1 hour)
- User rights (EU GDPR, CA CCPA)
- Cookie policy

---

### **3. How It Works Page**

Explain technical process:
- URL submission → yt-dlp extraction → download
- DRM platform detection → YouTube search fallback
- List of supported platforms (with categories)
- Limitations and unsupported platforms
- Legal use guidelines

---

### **4. DMCA Takedown Page**

Provide:
- DMCA agent contact info
- Takedown request form/email template
- Counter-notice process
- Response timeline (24-48 hours)

---

## 🚩 RED FLAGS TO AVOID

### **Criminal Activity (NEVER DO THIS):**

1. ❌ **Bypass DRM encryption** (Widevine, FairPlay, PlayReady)
2. ❌ **Use cracked software** for DRM removal
3. ❌ **Distribute pirated content** from MediaKeepa servers
4. ❌ **Claim direct Spotify/Netflix support** if using YouTube fallback
5. ❌ **Ignore DMCA takedown requests**

### **Civil Liability (AVOID IF POSSIBLE):**

1. ⚠️ **Host user-uploaded pirated files** (auto-delete temp files)
2. ⚠️ **Cache copyrighted content** (no CDN for downloads)
3. ⚠️ **Pre-download trending videos** (on-demand only)
4. ⚠️ **Advertise as "Piracy Tool"** (neutral marketing)
5. ⚠️ **Ignore platform cease & desist** (consult lawyer)

### **FTC Violations (FALSE ADVERTISING):**

1. ❌ **Claim "Download Spotify Premium"** (if using YouTube)
2. ❌ **Show Spotify logo** when downloading from YouTube
3. ❌ **Hide YouTube fallback method** from users
4. ❌ **Fake testimonials** or engagement metrics
5. ❌ **Misleading "100% Legal"** without disclaimers

---

## 🤖 AI ASSISTANT INSTRUCTIONS

### **When User Requests New Features:**

1. **Check Against Legal Framework:**
   - Does it involve DRM circumvention? → Reject or suggest YouTube fallback
   - Does it mislead users? → Reject or require transparency
   - Does it host pirated content? → Reject or require on-demand only

2. **Ask Clarifying Questions:**
   - "Are you asking to bypass DRM or use YouTube fallback?"
   - "Should this be transparent to users or hidden?"
   - "Where would this content be stored?"

3. **Default to Conservative:**
   - If uncertain, assume it's illegal
   - Suggest legal alternatives
   - Cite specific law (DMCA §1201, FTC Act, etc.)

4. **Provide Legal Alternatives:**
   - DRM music → YouTube search fallback
   - DRM video → No legal alternative, reject
   - False advertising → Transparent disclosure

5. **Document Decisions:**
   - Update this file if new legal questions arise
   - Cite laws and reasoning
   - Maintain audit trail

---

## 🏢 BUSINESS STRUCTURE RECOMMENDATIONS

### **1. Form an LLC (Limited Liability Company)**

**Why:**
- Protects personal assets from civil lawsuits
- Separates business and personal finances
- Professional credibility

**Important:** LLC does **NOT** protect against:
- Criminal charges (DRM circumvention)
- Personal guarantees on loans
- Fraud or intentional illegal acts

**Cost:** $50-$500 (varies by state)

---

### **2. Register DMCA Agent**

**Why:**
- Required for safe harbor protection
- Shields from user infringement liability
- Professional appearance

**Cost:** $6 (US Copyright Office)  
**Renewal:** Every 3 years

---

### **3. Get Business Insurance (Optional)**

**Types:**
- General Liability: Protects against injury/property damage
- Cyber Liability: Protects against data breaches
- Errors & Omissions: Protects against negligence claims

**Cost:** $300-$1000/year

---

## 📞 WHEN TO CONSULT A LAWYER

### **Immediate (Before Taking Action):**

1. Receive cease & desist letter from major platform (Netflix, Spotify, etc.)
2. DMCA takedown dispute becomes complex
3. User threatens lawsuit
4. Planning to raise funding or sell company
5. Uncertain if new feature violates DMCA §1201

### **Annual Review:**

1. Review Terms of Service updates
2. Ensure DMCA agent registration current
3. Audit for compliance with new laws (EU, CA, etc.)

### **Finding a Lawyer:**

- **Type:** Intellectual property or internet law specialist
- **Cost:** $200-$500/hour (consultation), $2000-$5000 (retainer)
- **Platforms:** Upwork (legal), Avvo, local bar association referrals

---

## 📝 CHANGELOG

### Version 1.0 (January 2025)
- Initial legal framework
- DMCA §1201 DRM circumvention rules
- FTC false advertising guidelines
- YouTube search fallback for music DRM
- Platform support matrix
- DMCA safe harbor requirements
- AI assistant instructions

---

## ✅ QUICK REFERENCE CHECKLIST

Before implementing ANY new feature:

- [ ] Does it bypass DRM? → ❌ REJECT
- [ ] Does it use YouTube fallback for music? → ✅ OK (with transparency)
- [ ] Does it mislead users? → ❌ REJECT (add disclosure)
- [ ] Does it host pirated content? → ❌ REJECT (on-demand only)
- [ ] Is it transparent to users? → ✅ REQUIRED
- [ ] Does it comply with DMCA safe harbor? → ✅ REQUIRED
- [ ] Is there a legal alternative? → ✅ SUGGEST IT

---

**Remember:** The goal is to support MAXIMUM platforms while staying 100% LEGAL. When in doubt, choose transparency and legal alternatives over deceptive shortcuts.

**Questions?** Re-read this document or ask AI assistant to check against legal framework before proceeding.
