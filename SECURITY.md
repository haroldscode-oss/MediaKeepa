# PRODUCTION SECURITY FEATURES

This document describes the security hardening implemented for public deployment.

## ✅ Implemented Security Features

### 1. **Rate Limiting** 
**Protection Against:** Spam, abuse, bandwidth theft, DDoS attacks

- **Global Limits:** 200 requests/day, 50 requests/hour per IP
- **Download Endpoint:** 10 downloads/minute per IP
- **Video Info Endpoint:** 30 info requests/minute per IP
- **Technology:** Flask-Limiter with in-memory storage

**Why it matters:** Prevents malicious users from overwhelming your server with requests or using it as a free unlimited download service.

### 2. **URL Validation**
**Protection Against:** Malicious URLs, command injection, SSRF attacks

- **Approach:** Minimal security checks with maximum compatibility
- **Supports:** ALL yt-dlp platforms (1000+ sites!)
- **Blocks:**
  - Dangerous protocols: `file://`, `ftp://`, `ssh://`, `telnet://`, `data://`, `javascript:`
  - Local addresses: `localhost`, `127.0.0.1`, `::1`
  - Private networks: `192.168.x.x`, `10.x.x.x`, `172.16-31.x.x`
  - Non-HTTP(S) URLs
- **Allows:** Any public HTTP/HTTPS URL that yt-dlp supports

**Why it matters:** Prevents SSRF (Server-Side Request Forgery) attacks where attackers try to access your internal network or execute malicious code, while still supporting the full power of yt-dlp's 1000+ site extractors.

### 3. **CORS Configuration**
**Protection Against:** Bandwidth theft, backend hijacking, cross-origin attacks

- **Previous (INSECURE):** `origins="*"` - Anyone could use your server from any website
- **Current (SECURE):** Configurable whitelist via environment variable
- **Default:** localhost only (for development)
- **Production:** Must be set to your actual domain

**Why it matters:** With open CORS (`origins="*"`), any website could embed your backend and steal your bandwidth. Users would visit their site but consume YOUR resources. This is CRITICAL for monetization via ads - you need REAL visitors to YOUR site to make money.

**Configuration:**
```bash
# Development (default)
ALLOWED_ORIGINS=http://localhost:5000,http://127.0.0.1:5000

# Production (CHANGE THIS!)
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### 4. **Progress Polling Race Condition Fix**
**Protection Against:** Memory leaks, UI bugs, multiple simultaneous downloads

- **Previous Issue:** Multiple intervals could run simultaneously if user clicked download multiple times
- **Fix:** Store interval reference in React useRef, clear previous interval before starting new one

**Why it matters:** Prevents memory leaks and ensures clean download state management for better UX.

---

## 🚀 Deployment Checklist

Before deploying to production:

### [ ] 1. Set Your Domain in CORS
```bash
# Create .env file
cp .env.example .env

# Edit .env and add your domain
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### [ ] 2. Verify Rate Limits
Check if default limits work for your use case in `server.py`:
- Global: 200/day, 50/hour
- Downloads: 10/minute
- Video info: 30/minute

Adjust if needed based on expected traffic.

### [ ] 3. Test Security
```bash
# Test rate limiting
# Make 11 rapid download requests - 11th should fail

# Test URL validation
# Try downloading from amazon.com - should be rejected

# Test CORS
# Access from different domain - should be blocked
```

### [ ] 4. Use Production WSGI Server
**DO NOT USE FLASK'S DEVELOPMENT SERVER IN PRODUCTION!**

Install a production server:
```bash
pip install gunicorn  # Linux/Mac
pip install waitress  # Windows

# Run with gunicorn (Linux/Mac)
gunicorn -w 4 -b 0.0.0.0:5000 server:app

# Run with waitress (Windows)
waitress-serve --host 0.0.0.0 --port 5000 server:app
```

### [ ] 5. Set Up HTTPS
Use a reverse proxy (nginx/Apache) with SSL certificate (Let's Encrypt).

### [ ] 6. Monitor Logs
Watch for:
- `❌ REJECTED: Unsupported platform URL` - blocked malicious requests
- `429 Too Many Requests` - rate limiting in action
- Unusual traffic patterns

---

## 🔥 Why These Fixes Are Critical

### The CORS Problem (Most Critical!)
**Before Fix:** With `origins="*"`, anyone could:
1. Create website `evil-site.com`
2. Embed your backend API calls
3. Users visit `evil-site.com`
4. Downloads go through YOUR server (your bandwidth, your resources)
5. They get free downloads, you get the bill
6. **You get ZERO ad revenue** (users never visit YOUR site)

**After Fix:** CORS whitelist ensures:
- Only YOUR domain can use YOUR backend
- Users MUST visit YOUR site
- Ad pop-unders work properly
- You get revenue from REAL visitors

### Rate Limiting
Without rate limiting:
- Bots can spam thousands of requests
- Competitors can abuse your service
- Malicious actors can DOS your server
- Bandwidth costs skyrocket

With rate limiting:
- Normal users unaffected
- Abuse automatically blocked
- Server stays stable
- Costs predictable

### URL Validation
Without validation:
- Attacker could try SQL injection via URL
- Could attempt command injection
- Could download from internal IPs (SSRF attack)
- Could abuse yt-dlp bugs

With validation:
- Only known-safe platforms allowed
- Regex pattern matching ensures URL structure
- Subprocess execution remains safe

---

## 📝 Configuration Reference

### Environment Variables
| Variable | Default | Production |
|----------|---------|------------|
| `ALLOWED_ORIGINS` | `http://localhost:5000` | `https://yourdomain.com` |

### Rate Limit Rules
| Endpoint | Limit | Purpose |
|----------|-------|---------|
| Global | 200/day, 50/hour | Overall protection |
| `/download` | 10/minute | Download throttling |
| `/video-info` | 30/minute | Info request throttling |

---

## 🐛 Testing Security

### Test Rate Limiting
```python
import requests
import time

# Should succeed 10 times, fail on 11th
for i in range(11):
    r = requests.post('http://localhost:5000/download', 
                     json={'url': 'https://youtube.com/watch?v=test', 'format': 'mp4', 'quality': '1080p'})
    print(f"Request {i+1}: {r.status_code}")
    time.sleep(1)
```

### Test URL Validation
```bash
# Should be rejected (dangerous protocol)
curl -X POST http://localhost:5000/download \
  -H "Content-Type: application/json" \
  -d '{"url": "file:///etc/passwd", "format": "mp4", "quality": "1080p"}'

# Should be rejected (local address)
curl -X POST http://localhost:5000/download \
  -H "Content-Type: application/json" \
  -d '{"url": "http://localhost:8080/file", "format": "mp4", "quality": "1080p"}'

# Should be accepted (any public HTTP/HTTPS URL)
curl -X POST http://localhost:5000/download \
  -H "Content-Type: application/json" \
  -d '{"url": "https://youtube.com/watch?v=test", "format": "mp4", "quality": "1080p"}'

# Should be accepted (any yt-dlp supported site)
curl -X POST http://localhost:5000/download \
  -H "Content-Type: application/json" \
  -d '{"url": "https://vimeo.com/123456", "format": "mp4", "quality": "1080p"}'
```

### Test CORS (from browser console on different domain)
```javascript
fetch('http://yourserver.com/video-info', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({url: 'https://youtube.com/watch?v=test'})
})
.then(r => console.log('CORS TEST:', r.status))
.catch(e => console.log('CORS BLOCKED:', e))
```

---

## 🎯 Summary

**Before:** Vulnerable to abuse, bandwidth theft, no production readiness
**After:** Production-hardened with rate limiting, URL validation, CORS protection, and race condition fixes

**Most Important:** Change `ALLOWED_ORIGINS` to your domain before deploying!

**Questions?** Review this document and test each security feature locally before going live.
