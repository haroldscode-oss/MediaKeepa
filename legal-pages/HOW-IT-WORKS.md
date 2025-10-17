# How MediaKeepa Works

**Last Updated:** January 17, 2025

MediaKeepa is a simple, transparent tool that allows you to download publicly accessible media from the internet. This page explains exactly how our service works, what we can and cannot do, and how to use it responsibly.

---

## 🎯 What MediaKeepa Does

MediaKeepa is a **web-based media downloader** that:

1. ✅ Accepts URLs from 1,800+ platforms (YouTube, TikTok, Instagram, etc.)
2. ✅ Extracts available media formats (video, audio, images)
3. ✅ Processes downloads on-demand (no pre-caching)
4. ✅ Provides downloadable files temporarily (deleted after 1 hour)

**Think of MediaKeepa as a specialized web browser** - we access publicly available content using standard internet protocols, just like your browser does.

---

## 🛠️ Technical Architecture

### 1. **yt-dlp: The Engine**

MediaKeepa is built on [yt-dlp](https://github.com/yt-dlp/yt-dlp), a powerful open-source tool used by millions worldwide.

**What is yt-dlp?**
- Open-source software (public GitHub repository with 90,000+ stars)
- Extracts media from 1,800+ platforms
- Actively maintained by global community
- Used by researchers, archivists, and content creators

**Why yt-dlp?**
- ✅ **Reliable:** Continuously updated to adapt to platform changes
- ✅ **Legal:** Uses public APIs and standard web protocols (no hacking)
- ✅ **Transparent:** Open-source code can be audited by anyone
- ✅ **Versatile:** Supports more platforms than any proprietary tool

### 2. **How Downloads Work**

When you submit a URL:

```
[Your Browser] 
    ↓ (1) Submit URL
[MediaKeepa Frontend]
    ↓ (2) Send to backend
[MediaKeepa Backend (Python + Flask)]
    ↓ (3) Pass URL to yt-dlp
[yt-dlp]
    ↓ (4) Extract media info from platform
[Platform Server (YouTube, TikTok, etc.)]
    ↓ (5) Return available formats
[yt-dlp]
    ↓ (6) Download selected format
[MediaKeepa Backend]
    ↓ (7) Store temporarily in temp_downloads/
[MediaKeepa Frontend]
    ↓ (8) Provide download link to you
[Your Browser]
    ↓ (9) Download file to your device
[Your Device] ✅
```

**Key Point:** We don't host content. We extract it on-demand from the original platform, same as if you used browser dev tools or curl.

### 3. **Temporary Storage**

- **Files are stored for 1 hour maximum** in our `temp_downloads/` folder
- **Automatic cleanup:** Every 30 minutes, files older than 1 hour are deleted
- **No long-term hosting:** We do NOT keep your downloads on our servers
- **Privacy-first:** This reduces liability and protects your privacy

---

## ✅ Supported Platforms (1,800+)

MediaKeepa works with platforms that provide **public, non-encrypted media**. Here's how we categorize them:

### **Fully Tested (100% Working)**

These platforms have been thoroughly tested by our team:

| Platform | Status | Download Types | Notes |
|----------|--------|----------------|-------|
| **YouTube** | ✅ Working | Video, Audio | Up to 4K quality, 100+ subtitle languages |
| **TikTok** | ✅ Working | Video | Up to 1080p, watermark included |
| **Instagram** | ✅ Working | Video, Image | Reels, posts, stories (public only) |
| **Twitter/X** | ✅ Working | Video, Image | Public tweets only |
| **SoundCloud** | ✅ Working | Audio | Public tracks (128kbps MP3) |
| **Vimeo** | ⚠️ Partial | Video | Public videos only (login required for private) |

**[View full tested platform list →](/platforms)**

### **Supported by yt-dlp (1,800+ Platforms)**

MediaKeepa supports **all platforms that yt-dlp supports**, including:

**Video Platforms:**
- Dailymotion, Rumble, BitChute, Odysee, PeerTube, Coub, Flickr, Imgur

**Social Media:**
- Facebook, Reddit, LinkedIn, Pinterest, Tumblr, Mastodon

**Adult Content:**
- XVideos, XNXX, RedTube, YouPorn, TNAFlix, XHamster *(see [Platform Test Results](/test-results) for details)*

**Educational:**
- Coursera, Udemy, Khan Academy, TED Talks, MIT OpenCourseWare

**Live Streaming:**
- Twitch (VODs), YouTube Live (recordings), Periscope, Livestream

**Audio:**
- Mixcloud, Bandcamp, Audiomack, Freesound

**News & Media:**
- CNN, BBC, NPR, The Guardian, New York Times (embedded videos)

**Sports:**
- ESPN, NFL, NBA, NHL (highlights and replays)

**Note:** Platform support varies. Some platforms may work intermittently or require specific conditions (public content, geo-availability, etc.).

---

## ❌ What MediaKeepa CANNOT Do

### **1. DRM-Protected Platforms (Legally Blocked)**

We **actively block** platforms that use DRM (Digital Rights Management) encryption. Bypassing DRM is a **federal crime** under DMCA § 1201 (up to $500,000 fine + 5 years in prison).

**Blocked Platforms:**
- ❌ **Streaming Services:** Netflix, Hulu, Disney+, HBO Max, Amazon Prime Video, Peacock, Paramount+
- ❌ **Music Services:** Spotify Premium, Apple Music, Tidal, Deezer, Amazon Music Unlimited
- ❌ **Cable/Live TV:** Cable streaming apps, sports streaming with DRM

**Why are these blocked?**
- They use encryption (Widevine, FairPlay, PlayReady) to protect content
- Decrypting this content requires DRM circumvention (illegal)
- We prioritize legal compliance over platform coverage

**What about free tiers?**
- **YouTube (free):** ✅ Works (no DRM)
- **Spotify (free):** ❌ Blocked (uses DRM even for free tier)
- **SoundCloud (free):** ✅ Works (no DRM)

### **2. Private or Protected Content**

We cannot access:
- ❌ Private Instagram accounts (requires login)
- ❌ Password-protected Vimeo videos (requires authentication)
- ❌ Facebook private groups (requires membership)
- ❌ Patreon exclusive content (requires subscription)

**Why?** We don't have your login credentials, and we don't want them (privacy risk).

### **3. Geo-Restricted Content**

Some platforms block access based on location:
- ⚠️ **Example:** BBC iPlayer (UK only), Hulu (US only)
- ⚠️ **Result:** Downloads may fail if you're in the wrong region

**Solution:** Use a VPN (at your own risk - may violate platform ToS).

### **4. Real-Time Live Streams**

We cannot download:
- ❌ Live streams in progress (YouTube Live, Twitch Live, etc.)
- ✅ Recorded streams/VODs work fine

**Why?** Live streams are continuous; downloads would be infinite.

---

## 📊 Quality and Formats

### **Video Quality**

Available quality depends on the **source platform**, not MediaKeepa:

| Platform | Max Quality | Typical Formats |
|----------|-------------|-----------------|
| YouTube | 4K (2160p) | MP4, WebM, MKV |
| TikTok | 1080p | MP4 |
| Instagram | 1080p (Reels) | MP4 |
| Twitter/X | 1080p | MP4 |
| Vimeo | 4K (2160p) | MP4 |
| Facebook | 720p-1080p | MP4 |

**Why not always 4K?**
- Platforms don't always offer high quality (e.g., TikTok caps at 1080p)
- Original upload quality matters (if uploader posted 480p, that's max available)
- Some platforms compress videos aggressively

### **Audio Quality**

| Platform | Max Bitrate | Format |
|----------|-------------|--------|
| YouTube | 320kbps | MP3, M4A, Opus |
| SoundCloud | 128kbps | MP3 |
| Bandcamp | Lossless (FLAC) | FLAC, MP3 |
| Mixcloud | 128kbps | MP3 |

### **Subtitle Support**

- **YouTube:** ✅ Excellent (100+ languages, auto-generated + manual captions)
- **TikTok:** ❌ No subtitles (text overlays are burned into video)
- **Instagram:** ❌ No subtitles
- **Twitter/X:** ❌ No subtitles

**[View detailed subtitle analysis →](/subtitle-analysis)**

---

## 🔒 Privacy and Security

### **What We Collect**

- ✅ URLs you submit (to process downloads)
- ✅ IP address (for rate limiting and abuse prevention)
- ✅ Download metadata (file size, format, timestamp)

### **What We DON'T Collect**

- ❌ Downloaded file contents (deleted after 1 hour)
- ❌ Your name, email, or personal info (unless you contact us)
- ❌ Browsing history outside MediaKeepa

**[Read full Privacy Policy →](/privacy)**

### **Rate Limiting**

To prevent abuse and ensure fair access:
- **Free users:** 10 requests per minute, 100 requests per hour
- **Exceeded limit:** Temporary cooldown (10-60 minutes)

**Why?** Prevents bots, scrapers, and malicious users from overloading our servers.

---

## ⚖️ Legal and Ethical Use

### **Your Responsibility**

By using MediaKeepa, you agree to:

- ✅ **Download legally:** Only content you own or have permission to use
- ✅ **Respect copyright:** Don't redistribute pirated content commercially
- ✅ **Follow platform ToS:** Comply with YouTube, TikTok, etc. terms
- ✅ **Personal use:** Don't mass-download for resale or commercial piracy

### **MediaKeepa's Role**

We are a **tool**, like a web browser or curl command. We:

- ✅ Provide extraction technology (via yt-dlp)
- ✅ Respond to DMCA takedown requests (within 24-48 hours)
- ✅ Block DRM platforms (to comply with anti-circumvention laws)
- ✅ Reserve the right to ban abusive users

**[Read full Terms of Service →](/terms)**

### **DMCA Compliance**

If you're a copyright holder:
- We respond to valid DMCA takedown requests within 24-48 hours
- We do NOT host content (downloads are temporary)
- Users are responsible for legal use per our Terms of Service

**[File a DMCA request →](/dmca)**

---

## 🤔 Frequently Asked Questions

### **Is MediaKeepa legal?**

**Yes.** MediaKeepa uses the same technology as browser dev tools, wget, or curl. We:
- ✅ Do NOT bypass DRM encryption (illegal)
- ✅ Only access publicly available content
- ✅ Comply with DMCA Safe Harbor provisions
- ✅ Respond to copyright takedown requests

**However:** You are responsible for how you use downloaded content. Piracy is illegal.

### **Why doesn't Spotify/Netflix work?**

These platforms use **DRM encryption** to protect content. Bypassing DRM is a federal crime (DMCA § 1201). We block these platforms to stay legal.

**Legal alternative for music:** Use YouTube to search for songs (many artists upload official tracks).

### **Do you store my downloads?**

**No.** Files are automatically deleted after 1 hour. We do NOT keep permanent copies.

### **Can I download private Instagram posts?**

**No.** We only access publicly available content. Private accounts require login (which we don't have).

### **Why did my download fail?**

Common reasons:
- Platform blocked access (geo-restriction, rate limit)
- Content was deleted or made private
- Platform changed their system (yt-dlp needs update)
- URL format incorrect (try copying from address bar)

**Solution:** Check [Platform Status](/platforms) or contact support@mediakeepa.com

### **Do you have an API?**

**Not yet.** If you're interested in API access, contact us: support@mediakeepa.com

### **Can I use MediaKeepa for commercial purposes?**

**Personal use only** per our [Terms of Service](/terms). For commercial licensing, contact: business@mediakeepa.com

---

## 📞 Contact and Support

### **Get Help**

- **Email:** support@mediakeepa.com
- **Response Time:** 24-48 hours
- **Bug Reports:** support@mediakeepa.com (include URL, error message, browser info)

### **Legal Inquiries**

- **DMCA Requests:** dmca@mediakeepa.com
- **Privacy Requests:** privacy@mediakeepa.com
- **Business Inquiries:** business@mediakeepa.com

### **Stay Updated**

- **Platform Status:** [/platforms](/platforms)
- **Terms of Service:** [/terms](/terms)
- **Privacy Policy:** [/privacy](/privacy)

---

## 🚀 Get Started

Ready to use MediaKeepa? It's simple:

1. **Copy a URL** from any supported platform (YouTube, TikTok, Instagram, etc.)
2. **Paste it** into the MediaKeepa input box
3. **Select format** (video, audio, or image)
4. **Click Download**
5. **Save to your device**

**[Try MediaKeepa now →](https://mediakeepa.com)**

---

**Questions? Email us:** support@mediakeepa.com  
**Report bugs:** support@mediakeepa.com  
**Copyright claims:** dmca@mediakeepa.com

---

**Last Updated:** January 17, 2025  
**Version:** 1.0
