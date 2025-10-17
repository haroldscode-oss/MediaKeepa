# LEGAL COMPLIANCE IMPLEMENTATION CHECKLIST

**Created:** January 17, 2025  
**Purpose:** Step-by-step guide to make MediaKeepa 100% legally compliant before launch

---

## ✅ COMPLETED (Already Done)

- [x] **Legal page templates created** (4 pages in `/legal-pages/`)
  - DMCA-POLICY.md
  - TERMS-OF-SERVICE.md
  - PRIVACY-POLICY.md
  - HOW-IT-WORKS.md
  
- [x] **Rate limiting implemented** (production security commit)
- [x] **Platform testing documented** (PLATFORM_TEST_RESULTS.md)
- [x] **Comprehensive legal research** (LEGAL STUFF.md)

---

## 📋 TO-DO BEFORE LAUNCH (Priority Order)

### **PHASE 1: CRITICAL (Must Complete - 3 hours)**

#### ⏱️ **Step 1: Register DMCA Agent (15 minutes + $6)**

1. Go to: https://www.copyright.gov/dmca-directory/
2. Click "Register" (create account if needed)
3. Fill out form:
   - **Service Name:** MediaKeepa
   - **Contact Name:** [Your Name or Business Name]
   - **Email:** dmca@mediakeepa.com (set up first - see Step 2)
   - **Address:** [Your Address or P.O. Box]
   - **Phone:** [Your Phone Number]
4. Pay $6 fee (credit card or PayPal)
5. Save confirmation email
6. **Update DMCA-POLICY.md** with registration details

**Why Critical:** Without this, you have NO legal protection against copyright claims. You could be personally liable.

**Status:** ⬜ Not started

---

#### ⏱️ **Step 2: Set Up DMCA Email (5 minutes - FREE)**

**Option A: Buy Domain (Recommended - $15/year)**
1. Buy domain: mediakeepa.com (Namecheap, Google Domains, Cloudflare)
2. Set up email forwarding:
   - `dmca@mediakeepa.com` → your personal email
   - `support@mediakeepa.com` → your personal email
   - `privacy@mediakeepa.com` → your personal email
3. Test by sending email to each address

**Option B: Gmail Alias (Free, Temporary)**
1. Use format: `youremail+dmca@gmail.com`
2. Example: `harold+dmca@gmail.com`
3. Gmail will deliver to your inbox
4. **Limitation:** Less professional, harder to prove in court

**Recommended:** Use Option A (domain) - looks professional, required for DMCA registration.

**Status:** ⬜ Not started

---

#### ⏱️ **Step 3: Convert Legal Pages to HTML (30 minutes)**

**Create these routes in your Flask backend:**

File: `server.py`

```python
# Add to imports
from markdown import markdown

# Add after existing routes
@app.route('/dmca')
def dmca_policy():
    with open('legal-pages/DMCA-POLICY.md', 'r') as f:
        content = markdown(f.read())
    return render_template('legal.html', title='DMCA Policy', content=content)

@app.route('/terms')
def terms_of_service():
    with open('legal-pages/TERMS-OF-SERVICE.md', 'r') as f:
        content = markdown(f.read())
    return render_template('legal.html', title='Terms of Service', content=content)

@app.route('/privacy')
def privacy_policy():
    with open('legal-pages/PRIVACY-POLICY.md', 'r') as f:
        content = markdown(f.read())
    return render_template('legal.html', title='Privacy Policy', content=content)

@app.route('/how-it-works')
def how_it_works():
    with open('legal-pages/HOW-IT-WORKS.md', 'r') as f:
        content = markdown(f.read())
    return render_template('legal.html', title='How It Works', content=content)

@app.route('/platforms')
def platform_status():
    with open('PLATFORM_TEST_RESULTS.md', 'r') as f:
        content = markdown(f.read())
    return render_template('legal.html', title='Platform Status', content=content)
```

**Create template:**

File: `templates/legal.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ title }} - MediaKeepa</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 900px;
            margin: 0 auto;
            padding: 40px 20px;
            line-height: 1.6;
            color: #333;
        }
        h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
        h2 { color: #1e40af; margin-top: 40px; }
        h3 { color: #1e3a8a; }
        a { color: #2563eb; text-decoration: none; }
        a:hover { text-decoration: underline; }
        code { background: #f3f4f6; padding: 2px 6px; border-radius: 3px; }
        pre { background: #f3f4f6; padding: 15px; border-radius: 5px; overflow-x: auto; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background: #f3f4f6; font-weight: 600; }
        .back-link { margin-bottom: 20px; }
        @media (prefers-color-scheme: dark) {
            body { background: #1f2937; color: #e5e7eb; }
            h1 { color: #60a5fa; border-color: #60a5fa; }
            h2 { color: #93c5fd; }
            h3 { color: #bfdbfe; }
            code, pre { background: #374151; }
            th { background: #374151; }
        }
    </style>
</head>
<body>
    <div class="back-link">
        <a href="/">← Back to MediaKeepa</a>
    </div>
    
    <h1>{{ title }}</h1>
    
    <div class="legal-content">
        {{ content|safe }}
    </div>
    
    <hr style="margin: 40px 0; border: none; border-top: 1px solid #ddd;">
    
    <div style="text-align: center; color: #6b7280; font-size: 14px;">
        <p>© 2025 MediaKeepa. All rights reserved.</p>
        <p>
            <a href="/terms">Terms of Service</a> |
            <a href="/privacy">Privacy Policy</a> |
            <a href="/dmca">DMCA Policy</a> |
            <a href="/how-it-works">How It Works</a> |
            <a href="/platforms">Platform Status</a>
        </p>
    </div>
</body>
</html>
```

**Install markdown library:**
```bash
pip install markdown
```

**Add to requirements.txt:**
```
markdown
```

**Status:** ⬜ Not started

---

#### ⏱️ **Step 4: Add Footer Links to Homepage (10 minutes)**

File: `spark-template/src/App.tsx`

Add this footer before the closing `</div>` tag:

```tsx
{/* Legal Footer */}
<footer className="mt-16 border-t border-gray-200 dark:border-gray-800 pt-8 pb-4">
  <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600 dark:text-gray-400 mb-4">
    <a href="/terms" className="hover:text-primary transition-colors">
      Terms of Service
    </a>
    <a href="/privacy" className="hover:text-primary transition-colors">
      Privacy Policy
    </a>
    <a href="/dmca" className="hover:text-primary transition-colors">
      DMCA Policy
    </a>
    <a href="/how-it-works" className="hover:text-primary transition-colors">
      How It Works
    </a>
    <a href="/platforms" className="hover:text-primary transition-colors">
      Platform Status
    </a>
  </div>
  
  <p className="text-center text-xs text-gray-500 dark:text-gray-400">
    © 2025 MediaKeepa. Users are responsible for legal use of downloads.
  </p>
  
  <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-2">
    Built on yt-dlp • Supports 1,800+ platforms • 
    <a href="/how-it-works" className="underline ml-1">Learn how it works</a>
  </p>
</footer>
```

**Rebuild frontend:**
```bash
cd spark-template
npm run build
```

**Status:** ⬜ Not started

---

#### ⏱️ **Step 5: Implement DRM Platform Blocker (20 minutes)**

File: `server.py`

Add at the top with other constants:

```python
# DRM-protected platforms (DMCA § 1201 - federal crime to bypass)
DRM_PLATFORMS = {
    'netflix.com', 'hulu.com', 'disneyplus.com', 'hbomax.com', 'max.com',
    'primevideo.com', 'amazon.com/gp/video', 'peacocktv.com', 'paramount.com',
    'spotify.com', 'music.apple.com', 'tidal.com', 'deezer.com',
    'music.amazon.com', 'pandora.com'
}

def is_drm_protected(url):
    """Check if URL is from a DRM-protected platform"""
    from urllib.parse import urlparse
    domain = urlparse(url).netloc.lower()
    
    # Check against DRM platform list
    for drm_platform in DRM_PLATFORMS:
        if drm_platform in domain:
            return True
    return False
```

Update `/api/extract` endpoint:

```python
@app.route('/api/extract', methods=['POST'])
def extract_media():
    data = request.json
    url = data.get('url')
    
    if not url:
        return jsonify({'error': 'URL is required'}), 400
    
    # Block DRM platforms
    if is_drm_protected(url):
        return jsonify({
            'error': 'DRM_PROTECTED',
            'message': 'This platform uses DRM encryption and cannot be supported legally.',
            'platform': urlparse(url).netloc,
            'learn_more': '/how-it-works#drm-explanation'
        }), 403
    
    # Continue with existing extraction logic...
```

**Test with:**
```bash
# Should be blocked
curl -X POST http://localhost:5000/api/extract \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.netflix.com/watch/12345"}'

# Should work
curl -X POST http://localhost:5000/api/extract \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

**Status:** ⬜ Not started

---

#### ⏱️ **Step 6: Add File Cleanup Job (20 minutes)**

File: `server.py`

Add to imports:

```python
import schedule
import threading
import time
from datetime import datetime
```

Add cleanup function:

```python
def cleanup_old_downloads():
    """Delete files older than 1 hour from temp_downloads/"""
    try:
        temp_dir = 'temp_downloads'
        cutoff_time = time.time() - 3600  # 1 hour ago
        deleted_count = 0
        
        if not os.path.exists(temp_dir):
            return
        
        for filename in os.listdir(temp_dir):
            filepath = os.path.join(temp_dir, filename)
            
            if os.path.isfile(filepath):
                file_age = os.path.getmtime(filepath)
                
                if file_age < cutoff_time:
                    try:
                        os.remove(filepath)
                        deleted_count += 1
                    except Exception as e:
                        print(f"Error deleting {filename}: {e}")
        
        if deleted_count > 0:
            print(f"[{datetime.now()}] Cleaned up {deleted_count} old files from temp_downloads/")
    
    except Exception as e:
        print(f"Cleanup error: {e}")

# Schedule cleanup every 30 minutes
schedule.every(30).minutes.do(cleanup_old_downloads)

def run_cleanup_scheduler():
    """Run scheduler in background thread"""
    while True:
        schedule.run_pending()
        time.sleep(60)  # Check every minute

# Start scheduler when app starts
cleanup_thread = threading.Thread(target=run_cleanup_scheduler, daemon=True)
cleanup_thread.start()
print("✅ File cleanup scheduler started (runs every 30 minutes)")
```

**Install schedule library:**
```bash
pip install schedule
```

**Add to requirements.txt:**
```
schedule
```

**Test manually:**
```python
# In Python console
from server import cleanup_old_downloads
cleanup_old_downloads()
```

**Status:** ⬜ Not started

---

#### ⏱️ **Step 7: Add DMCA Takedown Endpoint (30 minutes)**

File: `server.py`

```python
@app.route('/api/dmca-takedown', methods=['POST'])
def handle_dmca_takedown():
    """
    Receive DMCA takedown requests from copyright holders
    
    Required fields:
    - copyright_holder: Name of person/company claiming copyright
    - infringing_url: URL of allegedly infringing content
    - contact_email: Email to respond to
    - original_work: Description of copyrighted work
    - good_faith_statement: Boolean confirming good faith belief
    """
    data = request.json
    
    # Validate required fields
    required_fields = [
        'copyright_holder', 
        'infringing_url', 
        'contact_email', 
        'original_work', 
        'good_faith_statement'
    ]
    
    missing = [field for field in required_fields if field not in data]
    if missing:
        return jsonify({
            'error': 'Missing required fields',
            'missing': missing
        }), 400
    
    # Log to file
    timestamp = datetime.now().isoformat()
    log_entry = {
        'timestamp': timestamp,
        'copyright_holder': data['copyright_holder'],
        'infringing_url': data['infringing_url'],
        'contact_email': data['contact_email'],
        'original_work': data['original_work'],
        'good_faith_statement': data['good_faith_statement'],
        'ip_address': request.remote_addr
    }
    
    # Create logs directory if it doesn't exist
    os.makedirs('logs', exist_ok=True)
    
    # Log to file (one line JSON for easy parsing)
    with open('logs/dmca_requests.log', 'a', encoding='utf-8') as f:
        f.write(json.dumps(log_entry) + '\n')
    
    # TODO: Send email notification (implement later with email service)
    # send_email(to='dmca@mediakeepa.com', subject=f'DMCA: {data["copyright_holder"]}', body=json.dumps(data, indent=2))
    
    print(f"[DMCA REQUEST] {data['copyright_holder']} - {data['infringing_url']}")
    
    return jsonify({
        'status': 'received',
        'message': 'DMCA takedown request received. We will respond within 24-48 hours.',
        'reference_id': timestamp.replace(':', '-')  # Use timestamp as reference ID
    }), 200


@app.route('/api/dmca-status/<reference_id>', methods=['GET'])
def dmca_status(reference_id):
    """Check status of DMCA request (optional - for transparency)"""
    # TODO: Implement status tracking
    return jsonify({
        'reference_id': reference_id,
        'status': 'under_review',
        'message': 'Your DMCA request is being reviewed. You will receive a response via email within 24-48 hours.'
    })
```

**Create DMCA submission form (optional):**

File: `templates/dmca-form.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>File DMCA Takedown - MediaKeepa</title>
    <style>
        body { font-family: sans-serif; max-width: 700px; margin: 40px auto; padding: 20px; }
        input, textarea { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 5px; }
        button { background: #2563eb; color: white; padding: 12px 30px; border: none; border-radius: 5px; cursor: pointer; }
        button:hover { background: #1d4ed8; }
        .required { color: red; }
    </style>
</head>
<body>
    <h1>File DMCA Takedown Request</h1>
    <p><strong>For copyright holders only.</strong> False claims may result in legal liability.</p>
    
    <form id="dmcaForm">
        <label>Copyright Holder Name <span class="required">*</span></label>
        <input type="text" name="copyright_holder" required>
        
        <label>Contact Email <span class="required">*</span></label>
        <input type="email" name="contact_email" required>
        
        <label>Infringing URL <span class="required">*</span></label>
        <input type="url" name="infringing_url" placeholder="https://..." required>
        
        <label>Description of Original Work <span class="required">*</span></label>
        <textarea name="original_work" rows="4" required></textarea>
        
        <label>
            <input type="checkbox" name="good_faith_statement" required>
            I have a good faith belief that use of the material is not authorized by the copyright owner, its agent, or the law.
        </label>
        
        <br><br>
        <button type="submit">Submit DMCA Request</button>
    </form>
    
    <div id="result"></div>
    
    <script>
        document.getElementById('dmcaForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData);
            data.good_faith_statement = true;
            
            const response = await fetch('/api/dmca-takedown', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            document.getElementById('result').innerHTML = `
                <p style="color: green; padding: 15px; background: #f0fdf4; border: 1px solid #86efac; border-radius: 5px;">
                    ${result.message}<br>
                    Reference ID: ${result.reference_id}
                </p>
            `;
            e.target.reset();
        });
    </script>
</body>
</html>
```

Add route:

```python
@app.route('/dmca-form')
def dmca_form():
    return render_template('dmca-form.html')
```

**Status:** ⬜ Not started

---

#### ⏱️ **Step 8: Update Requirements and Dependencies (5 minutes)**

File: `requirements.txt`

Make sure it includes:

```
flask
flask-cors
yt-dlp
markdown
schedule
```

**Update:**
```bash
pip install -r requirements.txt
```

**Status:** ⬜ Not started

---

### **PHASE 2: IMPORTANT (Should Complete - 1 hour)**

#### ⏱️ **Step 9: Test Everything (30 minutes)**

**Test DRM Blocker:**
```bash
# Should return 403 error
curl -X POST http://localhost:5000/api/extract \
  -H "Content-Type: application/json" \
  -d '{"url":"https://www.netflix.com/watch/12345"}'
```

**Test Legal Pages:**
- Visit: http://localhost:5000/dmca
- Visit: http://localhost:5000/terms
- Visit: http://localhost:5000/privacy
- Visit: http://localhost:5000/how-it-works
- Visit: http://localhost:5000/platforms

**Test File Cleanup:**
```python
from server import cleanup_old_downloads
cleanup_old_downloads()
```

**Test DMCA Endpoint:**
```bash
curl -X POST http://localhost:5000/api/dmca-takedown \
  -H "Content-Type: application/json" \
  -d '{
    "copyright_holder": "Test Company",
    "infringing_url": "https://example.com/video",
    "contact_email": "test@example.com",
    "original_work": "Test video",
    "good_faith_statement": true
  }'
```

**Check Log:**
```bash
cat logs/dmca_requests.log
```

**Status:** ⬜ Not started

---

#### ⏱️ **Step 10: Add Platform Support Disclosure to Homepage (10 minutes)**

File: `spark-template/src/App.tsx`

Add above the URL input form:

```tsx
<div className="mb-6 text-center">
  <p className="text-sm text-gray-600 dark:text-gray-400">
    Supports 1,800+ platforms including <strong>TikTok</strong>, <strong>YouTube</strong>, <strong>Instagram</strong>, and more.
  </p>
  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
    <a href="/platforms" className="text-primary underline hover:no-underline">
      View tested platforms and compatibility →
    </a>
  </p>
</div>
```

**Rebuild:**
```bash
cd spark-template
npm run build
```

**Status:** ⬜ Not started

---

#### ⏱️ **Step 11: Add DRM Error Handling to Frontend (20 minutes)**

File: `spark-template/src/App.tsx`

Update error handling in your download function:

```tsx
// In your fetch/download function
if (response.error === 'DRM_PROTECTED') {
  setError({
    title: 'Platform Not Supported',
    message: 'This platform uses DRM encryption and cannot be supported legally.',
    learnMore: '/how-it-works#drm-explanation',
    platform: response.platform
  });
  return;
}
```

Add error display component:

```tsx
{error && error.code === 'DRM_PROTECTED' && (
  <Alert variant="destructive" className="mb-4">
    <AlertTitle>❌ {error.title}</AlertTitle>
    <AlertDescription>
      {error.message}
      <br />
      <strong>Platform:</strong> {error.platform}
      <br />
      <a href={error.learnMore} className="underline font-medium mt-2 inline-block">
        Learn why this platform is blocked →
      </a>
    </AlertDescription>
  </Alert>
)}
```

**Rebuild:**
```bash
cd spark-template
npm run build
```

**Status:** ⬜ Not started

---

### **PHASE 3: OPTIONAL (Nice to Have - 30 minutes)**

#### ⏱️ **Step 12: Add Contact Page (15 minutes)**

Create `legal-pages/CONTACT.md`:

```markdown
# Contact MediaKeepa

## General Support
- **Email:** support@mediakeepa.com
- **Response Time:** 24-48 hours

## Legal Inquiries
- **DMCA Requests:** dmca@mediakeepa.com
- **Privacy Requests:** privacy@mediakeepa.com

## Bug Reports
Please include:
- URL that failed
- Error message (screenshot)
- Browser and device info

## Feature Requests
We're always improving! Email: support@mediakeepa.com
```

Add route in `server.py`:

```python
@app.route('/contact')
def contact():
    with open('legal-pages/CONTACT.md', 'r') as f:
        content = markdown(f.read())
    return render_template('legal.html', title='Contact Us', content=content)
```

**Status:** ⬜ Not started

---

#### ⏱️ **Step 13: Create FAQ Page (15 minutes)**

Create `legal-pages/FAQ.md` - use content from HOW-IT-WORKS.md FAQ section.

**Status:** ⬜ Not started

---

## 📊 PROGRESS TRACKER

**Overall Completion:** 0% (0/13 steps)

**Critical Steps (Must Do):**
- [ ] Register DMCA agent ($6, 15 min)
- [ ] Set up DMCA email (5 min)
- [ ] Convert legal pages to HTML (30 min)
- [ ] Add footer links (10 min)
- [ ] DRM platform blocker (20 min)
- [ ] File cleanup job (20 min)
- [ ] DMCA takedown endpoint (30 min)
- [ ] Update requirements (5 min)

**Total Critical Time:** ~2.5 hours + $6

**Important Steps (Should Do):**
- [ ] Test everything (30 min)
- [ ] Platform disclosure (10 min)
- [ ] DRM error handling (20 min)

**Total Important Time:** ~1 hour

**Optional Steps (Nice to Have):**
- [ ] Contact page (15 min)
- [ ] FAQ page (15 min)

**Total Optional Time:** ~30 minutes

---

## 🚀 READY TO LAUNCH WHEN...

✅ All 8 critical steps completed  
✅ DMCA agent registered with Copyright Office  
✅ Legal pages accessible at `/dmca`, `/terms`, `/privacy`, `/how-it-works`  
✅ DRM platforms blocked (tested with Netflix URL)  
✅ File cleanup running (check after 1 hour)  
✅ Footer links visible on homepage  

---

## 📞 NEED HELP?

If you get stuck on any step, let me know and I can:
- Provide more detailed instructions
- Debug code issues
- Review your implementation
- Suggest alternatives

---

**Next Action:** Start with Step 1 (Register DMCA agent) - this is the foundation of your legal protection!
