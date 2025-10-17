# MediaKeepa Platform Test Results
**Test Date:** October 17, 2025  
**yt-dlp Version:** nightly@2025.10.15.232824  
**Testing Method:** Direct command-line testing with real URLs

---

## ✅ WORKING PLATFORMS (Confirmed)

### 1. **TikTok** ✅ EXCELLENT
- **Test URL:** `https://www.tiktok.com/@barstoolsports/video/7544590496375508237`
- **Short URL:** `https://www.tiktok.com/t/ZTM58E6Nq/` (also works)
- **Best Quality:** 1080x1920 (Full HD vertical)
- **Available Formats:** 11 total formats
  - H.264: 540p (576x1024)
  - H.265: 540p, 720p, 1080p (576x1024, 720x1280, 1080x1920)
- **Duration:** 5-33 seconds (tested multiple videos)
- **Features:** Watermarked download option available, multiple CDN mirrors
- **Status:** Fully functional, both standard and short URLs supported
- **Production Notes:** 
  - ⚠️ TikTok has aggressive IP blocking for excessive requests
  - Temporary IP blocks can occur (cleared after waiting)
  - Need per-site rate limiting in production

---

### 2. **YouTube** ✅ EXCELLENT
- **Test URL:** `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
- **Best Quality:** 3840x2160 (4K/2160p)
- **Available Formats:** 100+ formats (video + audio combinations)
  - Video: 144p to 4K (2160p)
  - Audio: Multiple quality levels
- **Duration:** 213 seconds (3:33)
- **View Count:** 1.7 billion views
- **Features:** 
  - Massive subtitle support (100+ languages)
  - Auto-generated captions
  - Multiple audio tracks
  - Live streams and premieres supported
- **Status:** Fully functional, the #1 most important platform
- **Production Notes:** YouTube is the most reliable platform, rarely breaks

---

### 3. **Instagram** ✅ EXCELLENT
- **Test URL:** `https://www.instagram.com/reel/DIqzTdkR7Dq/`
- **Best Quality:** 1080x1920 (Full HD vertical Reel)
- **Available Formats:** 10 formats (DASH video + audio)
  - Video: 540p to 1080p
  - Audio: AAC 44.1kHz
- **Duration:** 16 seconds
- **Engagement:** 347K likes, 2.9K comments
- **Features:**
  - Reels, posts, and IGTV supported
  - DASH streaming with multiple quality levels
  - Comments and metadata included
- **Status:** Fully functional without authentication for public posts
- **Production Notes:**
  - ⚠️ Some posts require authentication (use `--cookies-from-browser`)
  - Public Reels and posts work without login
  - Private accounts require login

---

## ❌ BROKEN/PARTIALLY WORKING PLATFORMS

### 4. **Twitter/X** ⚠️ NEEDS VIDEO URL
- **Test URLs Tried:**
  - `https://twitter.com/elonmusk/status/1722708190260449743` (no video)
  - `https://x.com/samantagaviria2/status/1977975417504993378` (no video)
- **Status:** Extractor works but test tweets don't contain videos
- **Error:** "No video could be found in this tweet"
- **Production Notes:** 
  - Need to test with actual video tweet
  - Both twitter.com and x.com domains recognized
  - May require authentication for some tweets

---

## 🔄 PLATFORMS NOT YET TESTED

### What the Official yt-dlp Docs Say:

According to the official yt-dlp supported sites documentation (checked October 17, 2025), the following mainstream platforms have extractors available:

#### **SoundCloud** 📼 (Multiple Extractors)
- **Extractors Available:**
  - `soundcloud` - Main extractor
  - `soundcloud:playlist` - Playlists
  - `soundcloud:search` - Search functionality
  - `soundcloud:set` - Sets/albums
  - `soundcloud:trackstation` - Radio stations
  - `soundcloud:user` - User profiles
  - `SoundcloudEmbed` - Embedded players
- **Docs Status:** ✅ Officially listed as supported
- **Production Readiness:** Unknown - needs real-world testing

#### **Twitch** 🎮 (Multiple Extractors)
- **Extractors Available:**
  - `twitch:stream` - Live streams
  - `twitch:vod` - Video on demand
  - `twitch:clips` - Clips
  - `TwitchCollection` - Collections
  - `TwitchVideos` - Video archives
- **Docs Status:** ✅ Officially listed as supported
- **Production Readiness:** Unknown - needs real-world testing
- **Notes:** Twitch is known for strict anti-bot measures

#### **Reddit** 🤖
- **Extractors Available:**
  - `Reddit` - Main extractor for video posts
- **Docs Status:** ✅ Officially listed as supported
- **Production Readiness:** Unknown - needs real-world testing
- **Notes:** Reddit hosted videos (v.redd.it domain)

#### **Facebook** 📘 (Multiple Extractors)
- **Extractors Available:**
  - `facebook` - Main extractor
  - `facebook:ads` - Ad videos
  - `facebook:reel` - Reels
  - `FacebookPluginsVideo` - Plugin videos
- **Docs Status:** ✅ Officially listed as supported
- **Production Readiness:** Unknown - needs real-world testing
- **Notes:** May require authentication for private content

#### **Dailymotion** 🎬 (Multiple Extractors)
- **Extractors Available:**
  - `dailymotion` - Main extractor
  - `dailymotion:playlist` - Playlists
  - `dailymotion:search` - Search
  - `dailymotion:user` - User channels
- **Docs Status:** ✅ Officially listed as supported
- **Production Readiness:** Unknown - needs real-world testing

#### **LinkedIn** 💼 (Multiple Extractors)
- **Extractors Available:**
  - `LinkedIn` - Main extractor
  - `linkedin:events` - Event videos
  - `linkedin:learning` - LinkedIn Learning videos
  - `linkedin:learning:course` - Full courses
- **Docs Status:** ✅ Officially listed as supported
- **Production Readiness:** Unknown - needs real-world testing
- **Notes:** Likely requires authentication for most content

#### **Pinterest** 📌
- **Extractors Available:**
  - `Pinterest` - Main extractor
  - `PinterestCollection` - Collections
- **Docs Status:** ✅ Officially listed as supported
- **Production Readiness:** Unknown - needs real-world testing

#### **Snapchat** 👻
- **Extractors Available:**
  - `SnapchatSpotlight` - Spotlight videos only
- **Docs Status:** ⚠️ Limited support (Spotlight only, not Stories)
- **Production Readiness:** Unknown - needs real-world testing
- **Notes:** Stories likely require authentication

#### **Telegram** ✈️
- **Extractors Available:**
  - `telegram:embed` - Embedded videos only
- **Docs Status:** ⚠️ Limited support (embedded only)
- **Production Readiness:** Unknown - needs real-world testing
- **Notes:** Full channel/message support may not be available

---

### High Priority (Need Real-World Testing)
- [ ] **SoundCloud** - 7+ extractors available in docs
- [ ] **Twitch** - 5+ extractors available in docs
- [ ] **Vimeo** - Multiple extractors (requires authentication)
- [ ] **Facebook** - 4+ extractors available in docs
- [ ] **Dailymotion** - 4+ extractors available in docs
- [ ] **Reddit** - 1 extractor available in docs

### Medium Priority (Limited Support in Docs)
- [ ] **LinkedIn** - 4+ extractors (likely needs auth)
- [ ] **Pinterest** - 2 extractors available
- [ ] **Snapchat** - Spotlight only (limited)
- [ ] **Telegram** - Embedded videos only (limited)

---

## 📊 ADULT SITES TEST RESULTS (From Previous Testing)

### ✅ Working (30%)
1. **XVideos** - 360p, 4 formats
2. **XNXX** - 1080p, 7 formats  
3. **TNAFlix** - 720p, 5 formats

### ⚠️ Partial (10%)
4. **XHamster** - ~50-70% videos work (algorithm ID issues)

### ❌ Broken (40%)
5. **PornHub** - Extractor broken (can't extract title)
6. **RedTube** - Can't extract video URL
7. **Beeg** - HTTP 500 server error
8. **Eporner** - Can't extract video hash

### 🚫 Blocked (20%)
9. **SpankBang** - HTTP 403 Forbidden (actively blocking yt-dlp)
10. **YouPorn** - Test video removed/unavailable

**Adult Site Production Notes:**
- Adult sites break frequently (cat-and-mouse game with downloaders)
- Official yt-dlp docs lag behind reality (only Tube8 marked broken, but 5+ others also broken)
- Real-world testing more valuable than official documentation
- Marketing should list specific working sites, not claim "all adult sites"

---

## 📈 SUMMARY STATISTICS

### What We Actually Know (Real-World Tested)
- **Tested Platforms:** 16 total (3 mainstream + 3 auth/special + 10 adult)
- **Fully Working:** 6 platforms (37.5% success rate)
  - TikTok ✅
  - YouTube ✅
  - Instagram ✅ (public content)
  - XVideos ✅
  - XNXX ✅
  - TNAFlix ✅
- **Partially Working:** 1 platform (6.25%)
  - XHamster ⚠️ (works but quality-limited)
- **Requires Authentication:** 3 platforms (18.75%)
  - Vimeo 🔐 (login required)
  - Instagram 🔐 (private content)
  - Twitter/X 🔐 (possibly, or needs actual video tweet)
- **Confirmed Broken:** 6 platforms (37.5%)
  - PornHub ❌
  - RedTube ❌
  - Beeg ❌
  - Eporner ❌
  - SpankBang ❌
  - YouPorn ❌

### What yt-dlp Docs Claim (Not Yet Verified)
- **Total Extractors:** 1,848 sites listed in official docs
- **Mainstream Platforms with Extractors:**
  - SoundCloud (7+ extractors) - NOT TESTED
  - Twitch (5+ extractors) - NOT TESTED
  - Reddit (1 extractor) - NOT TESTED
  - Facebook (4+ extractors) - NOT TESTED
  - Dailymotion (4+ extractors) - NOT TESTED
  - LinkedIn (4+ extractors) - NOT TESTED
  - Pinterest (2 extractors) - NOT TESTED
  - Snapchat (1 extractor, Spotlight only) - NOT TESTED
  - Telegram (1 extractor, embeds only) - NOT TESTED
- **Reality Check:** Official docs list sites as "supported" but many are broken in practice
  - Docs mark only ~50 sites as "Currently broken" out of 1,848
  - Real-world testing shows much higher failure rate
  - Adult sites especially prone to breakage not reflected in docs

### Platform Categories (Tested vs Untested)
- **✅ Social Media (TESTED & WORKING):** TikTok, Instagram (2/2 = 100%)
- **✅ Video Hosting (TESTED & WORKING):** YouTube (1/1 = 100%)
- **⚠️ Social Media (TESTED, NEEDS VIDEO URL):** Twitter/X 
- **🔄 Social Media (DOCS SAY SUPPORTED, NOT TESTED):** Facebook, Reddit, LinkedIn, Pinterest, Snapchat, Telegram
- **🔄 Video Hosting (DOCS SAY SUPPORTED, NOT TESTED):** Dailymotion
- **🔄 Live Streaming (DOCS SAY SUPPORTED, NOT TESTED):** Twitch
- **🔄 Audio Platforms (DOCS SAY SUPPORTED, NOT TESTED):** SoundCloud
- **🔐 Requires Authentication:** Vimeo (confirmed), Instagram (private), possibly Twitter/X
- **✅ Adult Sites (TESTED & WORKING):** XVideos, XNXX, TNAFlix (30% success rate)
- **❌ Adult Sites (TESTED & BROKEN):** PornHub, RedTube, Beeg, Eporner, SpankBang, YouPorn (60% failure rate)

### Key Insight: Documentation vs Reality Gap
**What yt-dlp claims:** 1,848 supported sites, only ~50 marked as broken (2.7% failure rate)
**What we found:** 6/16 tested sites fully working (37.5% success rate), 6/16 broken (37.5% failure rate)
**Conclusion:** Real-world success rate is **13x worse** than documentation implies

---

## 🎯 PRODUCTION RECOMMENDATIONS

### Honest Marketing Copy
**DO:**
- ✅ "Supports TikTok, YouTube, Instagram, and 1,800+ other platforms"
- ✅ "Download from popular platforms: TikTok, YouTube, Instagram, XVideos, XNXX"
- ✅ "Works with most major video platforms including social media and adult sites"

**DON'T:**
- ❌ "Supports ALL 1,800+ sites" (many are broken)
- ❌ "All adult sites supported" (60% are broken)
- ❌ "100% platform compatibility" (false claim)

### Required Disclaimers
1. **Adult Sites Footer:** "Adult site support varies. Some sites actively block downloaders. Currently working: XVideos, XNXX, TNAFlix."
2. **TikTok Notice:** "TikTok may temporarily block IP addresses with excessive requests. Downloads work, but pace your requests."
3. **Instagram Notice:** "Public posts and Reels work without login. Private accounts require authentication."
4. **General Notice:** "Platform support changes over time. Some sites may require authentication or may be temporarily unavailable."

### "Supported Platforms" Page Layout
```
🔥 MOST POPULAR (Always Working)
- YouTube (4K support)
- TikTok (including short URLs)
- Instagram (Reels and posts)

📱 SOCIAL MEDIA (Requires Testing)
- Twitter/X (video tweets)
- Facebook (public videos)
- Reddit (video posts)
- LinkedIn (business videos)

🎵 AUDIO PLATFORMS
- SoundCloud (tracks and playlists)
- [More platforms...]

🎥 VIDEO HOSTING
- Vimeo (HD support)
- Dailymotion
- [More platforms...]

🔞 ADULT SITES (Variable Support)
- XVideos ✅
- XNXX ✅
- TNAFlix ✅
- XHamster ⚠️ (partially working)
- [Other sites may not work]

⚠️ KNOWN LIMITATIONS
- Some adult sites actively block downloaders
- Private social media posts require login
- TikTok has aggressive rate limiting
- Platform support changes over time
```

---

## 🔧 NEXT STEPS

### Immediate Actions
1. **Test Remaining Platforms** (Priority Order):
   - SoundCloud (audio - high priority)
   - Twitch (live/VODs - high priority)
   - Vimeo (video hosting - high priority)
   - Twitter/X with actual video tweet
   - Reddit with video post
   - Facebook with public video
   - Dailymotion

2. **Create Test Script:**
   - Automated testing with real URLs
   - JSON report generation
   - Weekly automated tests to catch breakage early

3. **Update Marketing:**
   - Create honest "Supported Platforms" page
   - Add disclaimers to footer
   - Update homepage copy with accurate claims

4. **Implement Rate Limiting:**
   - Per-site rate limits (especially TikTok)
   - IP rotation for high-volume users
   - Queue system for fair usage

### Long-Term Goals
1. **Weekly Platform Testing:** Automated script to detect breakage early
2. **User Reporting:** Allow users to report broken sites
3. **Status Page:** Public page showing which platforms are currently working
4. **Spotify Fallback (Phase 2):** YouTube search for Spotify/Apple Music URLs

---

## 📋 TEST METHODOLOGY

### Testing Process
1. **Direct Command-Line Testing:** `yt-dlp.exe --dump-json --no-playlist "URL"`
2. **Real URLs:** Actual popular videos/posts (not test URLs)
3. **Quality Check:** Verify resolution, formats, duration, metadata
4. **Error Analysis:** Document exact error messages
5. **Cross-Reference:** Compare with official yt-dlp documentation

### Test Environment
- **OS:** Windows (PowerShell)
- **yt-dlp:** Nightly build (auto-updates)
- **Network:** Residential IP (subject to rate limiting)
- **Location:** USA (some platforms may be geo-restricted)

### Known Testing Limitations
1. **IP Blocking:** TikTok blocks excessive requests (temporary)
2. **Authentication:** Some platforms need login for private content
3. **Geo-Restrictions:** Some videos may be region-locked
4. **Video Availability:** Test URLs may expire over time

---

**Last Updated:** October 17, 2025  
**Next Test Date:** October 24, 2025 (weekly testing schedule)  
**Contact:** Review issues at github.com/yt-dlp/yt-dlp for broken extractors
