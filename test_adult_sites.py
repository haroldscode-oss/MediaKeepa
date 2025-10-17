"""
Comprehensive Adult Sites Testing Script for MediaKeepa
Tests all adult site extractors supported by yt-dlp
"""

import subprocess
import json
import time
from datetime import datetime

# Test URLs for each adult site
TEST_URLS = {
    # Major Adult Sites (High Priority)
    "XVideos": "https://www.xvideos.com/video70348311/hot_video",
    "XNXX": "https://www.xnxx.com/video-i3dzn5c/hot_video",
    "PornHub": "https://www.pornhub.com/view_video.php?viewkey=ph5f5c3a5d5e5f5",
    "RedTube": "https://www.redtube.com/38305991",
    "YouPorn": "https://www.youporn.com/watch/16619532/hot-video/",
    "SpankBang": "https://spankbang.com/5ezgi/video/hot",
    "XHamster": "https://xhamster.com/videos/xhGbiXb",
    "Beeg": "https://beeg.com/14280585",
    "Tube8": "https://www.tube8.com/teen/hot-video/59654521/",
    "DrTuber": "https://www.drtuber.com/video/8556871/hot-video",
    
    # Secondary Adult Sites
    "TNAFlix": "https://www.tnaflix.com/amateur-porn/Hot-Video/video4552441",
    "Eporner": "https://www.eporner.com/video-LGxPzDXdEzF/hot-video/",
    "HellPorno": "https://www.hellporno.com/videos/hot-video/",
    "SunPorno": "https://www.sunporno.com/videos/123456/hot-video",
    "Txxx": "https://www.txxx.com/videos/15674585/hot-video/",
    "Pornotube": "https://www.pornotube.com/videos/hot-video_123456",
    "PornTube": "https://www.porntube.com/videos/hot-video_123456",
    "ZenPorn": "https://zenporn.com/video/123456",
    
    # Premium/Network Sites
    "4tube": "https://www.4tube.com/videos/123456/hot-video",
    "PornerBros": "https://pornerbros.com/videos/123456/hot-video",
    "PornFlip": "https://www.pornflip.com/v/aBcDeF12",
    "AlphaPorno": "https://www.alphaporno.com/videos/hot-video/",
    "LoveHomePorn": "https://lovehomeporn.com/video/123456",
    "NubilesPorn": "https://nubiles-porn.com/video/123456",
    "Pornbox": "https://pornbox.com/videos/123456",
    "PornTop": "https://porntop.com/video/123456",
    
    # Live Cam Sites
    "Stripchat": "https://stripchat.com/username",
    "Chaturbate": "https://chaturbate.com/username/",
    "BongaCams": "https://bongacams.com/username",
    "CAM4": "https://www.cam4.com/username",
}

# Sites marked as CURRENTLY BROKEN by yt-dlp
KNOWN_BROKEN = [
    "JeuxVideo",
    "PornoVoisines", 
    "PornoXO",
    "Tube8"
]

def test_site(site_name, url, ytdlp_path="yt-dlp.exe"):
    """
    Test a single site URL with yt-dlp
    Returns: (status, message, details)
    """
    print(f"\n{'='*60}")
    print(f"Testing: {site_name}")
    print(f"URL: {url}")
    print(f"{'='*60}")
    
    try:
        # Run yt-dlp with --dump-json to test extraction
        cmd = [
            ytdlp_path,
            "--dump-json",
            "--no-playlist",
            "--skip-download",
            url
        ]
        
        start_time = time.time()
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=30
        )
        elapsed = time.time() - start_time
        
        if result.returncode == 0:
            # Successfully extracted info
            try:
                info = json.loads(result.stdout)
                title = info.get('title', 'Unknown')
                duration = info.get('duration', 0)
                formats = len(info.get('formats', []))
                
                print(f"✅ SUCCESS - {site_name}")
                print(f"   Title: {title}")
                print(f"   Duration: {duration}s")
                print(f"   Formats: {formats}")
                print(f"   Time: {elapsed:.2f}s")
                
                return ("✅ WORKING", f"Title: {title}, Formats: {formats}", {
                    'title': title,
                    'duration': duration,
                    'formats': formats,
                    'time': elapsed
                })
            except json.JSONDecodeError:
                print(f"✅ SUCCESS - {site_name} (but couldn't parse JSON)")
                return ("✅ WORKING", "Extraction succeeded", {'time': elapsed})
        
        else:
            # Failed to extract
            error = result.stderr.strip()
            
            # Check for common error patterns
            if "Unsupported URL" in error or "No video formats found" in error:
                print(f"❌ BROKEN - {site_name}")
                print(f"   Error: {error[:200]}")
                return ("❌ BROKEN", error[:200], {'time': elapsed})
            
            elif "This video has been removed" in error or "Video not found" in error:
                print(f"⚠️ TEST URL INVALID - {site_name}")
                print(f"   Note: Extractor might work with valid URL")
                return ("⚠️ URL ISSUE", "Test video removed/invalid", {'time': elapsed})
            
            elif "Private video" in error or "members-only" in error:
                print(f"⚠️ ACCESS RESTRICTED - {site_name}")
                return ("⚠️ RESTRICTED", "Requires account/premium", {'time': elapsed})
            
            else:
                print(f"❌ ERROR - {site_name}")
                print(f"   Error: {error[:200]}")
                return ("❌ ERROR", error[:200], {'time': elapsed})
    
    except subprocess.TimeoutExpired:
        print(f"⏱️ TIMEOUT - {site_name} (took >30s)")
        return ("⏱️ TIMEOUT", "Request timed out", {})
    
    except Exception as e:
        print(f"❌ EXCEPTION - {site_name}: {str(e)}")
        return ("❌ EXCEPTION", str(e), {})


def main():
    print("="*80)
    print("MediaKeepa - Adult Sites Comprehensive Test")
    print(f"Testing {len(TEST_URLS)} adult sites")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*80)
    
    results = []
    
    for site_name, url in TEST_URLS.items():
        # Check if site is known to be broken
        if any(broken in site_name for broken in KNOWN_BROKEN):
            print(f"\n⚠️ SKIPPING {site_name} - Marked as CURRENTLY BROKEN by yt-dlp")
            results.append({
                'site': site_name,
                'url': url,
                'status': '⚠️ KNOWN BROKEN',
                'message': 'Marked as broken by yt-dlp developers',
                'details': {}
            })
            continue
        
        status, message, details = test_site(site_name, url)
        
        results.append({
            'site': site_name,
            'url': url,
            'status': status,
            'message': message,
            'details': details
        })
        
        # Be respectful - add delay between requests
        time.sleep(2)
    
    # Generate Report
    print("\n\n" + "="*80)
    print("COMPREHENSIVE TEST REPORT")
    print("="*80)
    
    working = [r for r in results if r['status'] == '✅ WORKING']
    broken = [r for r in results if r['status'] == '❌ BROKEN']
    errors = [r for r in results if r['status'] == '❌ ERROR']
    url_issues = [r for r in results if r['status'] == '⚠️ URL ISSUE']
    restricted = [r for r in results if r['status'] == '⚠️ RESTRICTED']
    known_broken = [r for r in results if r['status'] == '⚠️ KNOWN BROKEN']
    timeout = [r for r in results if r['status'] == '⏱️ TIMEOUT']
    
    print(f"\n✅ WORKING: {len(working)}/{len(TEST_URLS)}")
    for r in working:
        print(f"   • {r['site']}: {r['message']}")
    
    print(f"\n❌ BROKEN: {len(broken)}/{len(TEST_URLS)}")
    for r in broken:
        print(f"   • {r['site']}: {r['message'][:100]}")
    
    print(f"\n❌ ERRORS: {len(errors)}/{len(TEST_URLS)}")
    for r in errors:
        print(f"   • {r['site']}: {r['message'][:100]}")
    
    print(f"\n⚠️ TEST URL ISSUES: {len(url_issues)}/{len(TEST_URLS)}")
    for r in url_issues:
        print(f"   • {r['site']}: {r['message']}")
    
    print(f"\n⚠️ RESTRICTED/PREMIUM: {len(restricted)}/{len(TEST_URLS)}")
    for r in restricted:
        print(f"   • {r['site']}: {r['message']}")
    
    print(f"\n⚠️ KNOWN BROKEN (by yt-dlp): {len(known_broken)}/{len(TEST_URLS)}")
    for r in known_broken:
        print(f"   • {r['site']}")
    
    print(f"\n⏱️ TIMEOUT: {len(timeout)}/{len(TEST_URLS)}")
    for r in timeout:
        print(f"   • {r['site']}")
    
    # Summary Stats
    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)
    total = len(TEST_URLS)
    working_pct = (len(working) / total) * 100 if total > 0 else 0
    
    print(f"Total Sites Tested: {total}")
    print(f"Working: {len(working)} ({working_pct:.1f}%)")
    print(f"Broken/Error: {len(broken) + len(errors)} ({((len(broken) + len(errors)) / total) * 100:.1f}%)")
    print(f"URL/Access Issues: {len(url_issues) + len(restricted)} ({((len(url_issues) + len(restricted)) / total) * 100:.1f}%)")
    print(f"Known Broken: {len(known_broken)} ({(len(known_broken) / total) * 100:.1f}%)")
    
    # Save report to file
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    report_file = f"adult_sites_test_report_{timestamp}.json"
    
    with open(report_file, 'w', encoding='utf-8') as f:
        json.dump({
            'timestamp': datetime.now().isoformat(),
            'total_sites': total,
            'results': results,
            'summary': {
                'working': len(working),
                'broken': len(broken),
                'errors': len(errors),
                'url_issues': len(url_issues),
                'restricted': len(restricted),
                'known_broken': len(known_broken),
                'timeout': len(timeout)
            }
        }, f, indent=2)
    
    print(f"\nDetailed report saved to: {report_file}")
    print(f"Completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*80)


if __name__ == "__main__":
    main()
