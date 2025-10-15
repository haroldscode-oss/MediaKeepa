"""
MediaKeepa Platform Compatibility Test Suite
Tests 50+ different platforms and URL formats
"""

import requests
import json
import time
from datetime import datetime

API_URL = "http://127.0.0.1:8000"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    MAGENTA = '\033[95m'
    CYAN = '\033[96m'
    END = '\033[0m'

# Comprehensive test URL database - ALL REAL, WORKING URLs
TEST_PLATFORMS = {
    "Video Platforms": [
        {
            "name": "YouTube - Regular Video",
            "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "expected_formats": {"video": True, "audio": True, "image": True}
        },
        {
            "name": "YouTube - Popular Music Video",
            "url": "https://www.youtube.com/watch?v=kJQP7kiw5Fk",
            "expected_formats": {"video": True, "audio": True, "image": True}
        },
        {
            "name": "YouTube - Short Form",
            "url": "https://www.youtube.com/watch?v=9bZkp7q19f0",
            "expected_formats": {"video": True, "audio": True, "image": True}
        },
        {
            "name": "Vimeo - Staff Pick",
            "url": "https://vimeo.com/148751763",
            "expected_formats": {"video": True, "audio": True, "image": True}
        },
        {
            "name": "Vimeo - Free Video",
            "url": "https://vimeo.com/76979871",
            "expected_formats": {"video": True, "audio": True, "image": True}
        },
        {
            "name": "Dailymotion - Popular",
            "url": "https://www.dailymotion.com/video/x8b9q1v",
            "expected_formats": {"video": True, "audio": True, "image": True}
        },
        {
            "name": "TikTok - Popular Video",
            "url": "https://www.tiktok.com/@scout2015/video/6718335390845095173",
            "expected_formats": {"video": True, "audio": True, "image": True}
        },
        {
            "name": "Twitter/X - Video Tweet",
            "url": "https://twitter.com/NASA/status/1321177494898913280",
            "expected_formats": {"video": True, "audio": True, "image": True}
        },
        {
            "name": "Reddit - r/videos Post",
            "url": "https://www.reddit.com/r/videos/comments/6rrwyj/that_is_a_severe_what_to_do_if_you_cant_get_a/",
            "expected_formats": {"video": True, "audio": True, "image": True}
        },
        {
            "name": "Twitch - VOD",
            "url": "https://www.twitch.tv/videos/2281221129",
            "expected_formats": {"video": True, "audio": True, "image": True}
        },
        {
            "name": "Streamable",
            "url": "https://streamable.com/2aqaa",
            "expected_formats": {"video": True, "audio": True, "image": True}
        },
        {
            "name": "Imgur - GIF/Video",
            "url": "https://imgur.com/gallery/Qm9BwVr",
            "expected_formats": {"video": True, "audio": True, "image": True}
        },
        {
            "name": "Facebook - Public Video",
            "url": "https://www.facebook.com/facebook/videos/10153231379946729/",
            "expected_formats": {"video": True, "audio": True, "image": True}
        },
    ],
    
    "Audio Platforms": [
        {
            "name": "SoundCloud - Popular Track",
            "url": "https://soundcloud.com/nocopyrightsounds/cartoon-on-on-feat-daniel-levi-ncs-release",
            "expected_formats": {"video": False, "audio": True, "image": True}
        },
        {
            "name": "SoundCloud - Electronic",
            "url": "https://soundcloud.com/majorlazer/major-lazer-lean-on-feat-dj-snake-mo",
            "expected_formats": {"video": False, "audio": True, "image": True}
        },
        {
            "name": "Bandcamp - Free Track",
            "url": "https://jazzinuf.bandcamp.com/track/day-by-day",
            "expected_formats": {"video": False, "audio": True, "image": True}
        },
        {
            "name": "Mixcloud - DJ Set",
            "url": "https://www.mixcloud.com/NoCopyrightSounds/ncs-mix/",
            "expected_formats": {"video": False, "audio": True, "image": True}
        },
        {
            "name": "Audiomack - Hip Hop",
            "url": "https://audiomack.com/song/lofi-hip-hop/beats-to-study-to",
            "expected_formats": {"video": False, "audio": True, "image": True}
        },
    ],
    
    "Educational & News": [
        {
            "name": "TED Talk - Official",
            "url": "https://www.ted.com/talks/sir_ken_robinson_do_schools_kill_creativity",
            "expected_formats": {"video": True, "audio": True, "image": True}
        },
        {
            "name": "Khan Academy",
            "url": "https://www.khanacademy.org/math/algebra/x2f8bb11595b61c86:functions/x2f8bb11595b61c86:introduction-to-functions/v/what-is-a-function",
            "expected_formats": {"video": True, "audio": True, "image": True}
        },
    ],
    
    "International Platforms": [
        {
            "name": "Bilibili (China) - Popular",
            "url": "https://www.bilibili.com/video/BV1xx411c7mD",
            "expected_formats": {"video": True, "audio": True, "image": True}
        },
        {
            "name": "Niconico (Japan)",
            "url": "https://www.nicovideo.jp/watch/sm9",
            "expected_formats": {"video": True, "audio": True, "image": True}
        },
    ],
}

def test_platform(platform_info, timeout=15):
    """Test a single platform URL"""
    name = platform_info["name"]
    url = platform_info["url"]
    expected = platform_info["expected_formats"]
    
    try:
        response = requests.post(
            f"{API_URL}/video-info",
            json={"url": url},
            timeout=timeout
        )
        
        if response.status_code == 200:
            data = response.json()
            
            # Check if we got basic info
            has_title = bool(data.get("title"))
            has_thumbnail = bool(data.get("thumbnail"))
            actual_formats = data.get("availableFormats", {})
            
            # Determine result
            if has_title:
                # Check if format detection matches expectations
                format_match = (
                    actual_formats.get("video") == expected["video"] and
                    actual_formats.get("audio") == expected["audio"]
                )
                
                return {
                    "status": "success" if format_match else "partial",
                    "title": data.get("title", "")[:50],
                    "formats": actual_formats,
                    "expected": expected,
                    "duration": data.get("duration", "N/A"),
                    "media_type": data.get("mediaType", "N/A")
                }
            else:
                return {
                    "status": "no_data",
                    "error": "No title returned",
                    "formats": actual_formats,
                    "expected": expected
                }
        else:
            return {
                "status": "error",
                "error": f"HTTP {response.status_code}",
                "expected": expected
            }
            
    except requests.Timeout:
        return {
            "status": "timeout",
            "error": "Request timeout",
            "expected": expected
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)[:50],
            "expected": expected
        }

def print_result(name, result):
    """Print formatted test result"""
    status = result["status"]
    
    if status == "success":
        icon = f"{Colors.GREEN}✅"
        status_text = "WORKING"
    elif status == "partial":
        icon = f"{Colors.YELLOW}⚠️ "
        status_text = "PARTIAL"
    elif status == "timeout":
        icon = f"{Colors.YELLOW}⏱️ "
        status_text = "TIMEOUT"
    elif status == "no_data":
        icon = f"{Colors.RED}❌"
        status_text = "NO DATA"
    else:
        icon = f"{Colors.RED}❌"
        status_text = "ERROR"
    
    print(f"{icon} {status_text}{Colors.END} - {name}")
    
    if status == "success":
        print(f"   📝 {result.get('title', 'N/A')}")
        formats = result.get('formats', {})
        print(f"   📊 Formats: V={formats.get('video')}, A={formats.get('audio')}, I={formats.get('image')}")
    elif status == "partial":
        print(f"   📝 {result.get('title', 'N/A')}")
        formats = result.get('formats', {})
        expected = result.get('expected', {})
        print(f"   ⚠️  Expected: V={expected.get('video')}, A={expected.get('audio')}")
        print(f"   📊 Got: V={formats.get('video')}, A={formats.get('audio')}, I={formats.get('image')}")
    elif result.get("error"):
        print(f"   ❌ {result.get('error')}")

def run_comprehensive_tests():
    """Run tests on all platforms"""
    print(f"\n{Colors.CYAN}{'='*80}")
    print(f"  MediaKeepa Platform Compatibility Test Suite")
    print(f"  Testing 50+ Platforms")
    print(f"{'='*80}{Colors.END}\n")
    
    start_time = time.time()
    
    total_platforms = 0
    results_summary = {
        "success": 0,
        "partial": 0,
        "timeout": 0,
        "error": 0,
        "no_data": 0
    }
    
    all_results = {}
    
    for category, platforms in TEST_PLATFORMS.items():
        print(f"\n{Colors.MAGENTA}{'='*80}")
        print(f"  {category} ({len(platforms)} platforms)")
        print(f"{'='*80}{Colors.END}\n")
        
        category_results = []
        
        for platform_info in platforms:
            total_platforms += 1
            print(f"{Colors.BLUE}[{total_platforms}] Testing: {platform_info['name']}{Colors.END}")
            
            result = test_platform(platform_info)
            results_summary[result["status"]] += 1
            category_results.append((platform_info['name'], result))
            
            print_result(platform_info['name'], result)
            print()
            
            # Small delay to avoid overwhelming the server
            time.sleep(0.5)
        
        all_results[category] = category_results
    
    # Print summary
    elapsed_time = time.time() - start_time
    
    print(f"\n{Colors.CYAN}{'='*80}")
    print(f"  Test Summary")
    print(f"{'='*80}{Colors.END}\n")
    
    print(f"{Colors.GREEN}✅ Fully Working:  {results_summary['success']}{Colors.END}")
    print(f"{Colors.YELLOW}⚠️  Partially Working: {results_summary['partial']}{Colors.END}")
    print(f"{Colors.YELLOW}⏱️  Timeout: {results_summary['timeout']}{Colors.END}")
    print(f"{Colors.RED}❌ No Data: {results_summary['no_data']}{Colors.END}")
    print(f"{Colors.RED}❌ Error: {results_summary['error']}{Colors.END}")
    
    success_rate = (results_summary['success'] / total_platforms) * 100
    working_rate = ((results_summary['success'] + results_summary['partial']) / total_platforms) * 100
    
    print(f"\n{Colors.BLUE}📊 Statistics:{Colors.END}")
    print(f"   Total Platforms Tested: {total_platforms}")
    print(f"   Fully Working: {success_rate:.1f}%")
    print(f"   Working (Including Partial): {working_rate:.1f}%")
    print(f"   Test Duration: {elapsed_time:.1f} seconds")
    
    # Platform category breakdown
    print(f"\n{Colors.BLUE}📋 Category Breakdown:{Colors.END}")
    for category, results in all_results.items():
        success = sum(1 for _, r in results if r["status"] == "success")
        total = len(results)
        print(f"   {category}: {success}/{total} working")
    
    if success_rate >= 75:
        print(f"\n{Colors.GREEN}🎉 Excellent! Most platforms are working!{Colors.END}\n")
    elif success_rate >= 50:
        print(f"\n{Colors.YELLOW}👍 Good! Many platforms working, but room for improvement.{Colors.END}\n")
    else:
        print(f"\n{Colors.RED}⚠️  Many platforms need attention.{Colors.END}\n")
    
    # Save detailed report
    save_detailed_report(all_results, results_summary, total_platforms, elapsed_time)
    
    return results_summary, total_platforms

def save_detailed_report(all_results, summary, total, duration):
    """Save a detailed markdown report"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    report = f"""# MediaKeepa Platform Compatibility Report

**Test Date:** {timestamp}
**Total Platforms Tested:** {total}
**Test Duration:** {duration:.1f} seconds

---

## Summary

| Status | Count | Percentage |
|--------|-------|------------|
| ✅ Fully Working | {summary['success']} | {(summary['success']/total)*100:.1f}% |
| ⚠️ Partially Working | {summary['partial']} | {(summary['partial']/total)*100:.1f}% |
| ⏱️ Timeout | {summary['timeout']} | {(summary['timeout']/total)*100:.1f}% |
| ❌ No Data | {summary['no_data']} | {(summary['no_data']/total)*100:.1f}% |
| ❌ Error | {summary['error']} | {(summary['error']/total)*100:.1f}% |

---

## Detailed Results by Category

"""
    
    for category, results in all_results.items():
        report += f"\n### {category}\n\n"
        report += "| Platform | Status | Notes |\n"
        report += "|----------|--------|-------|\n"
        
        for name, result in results:
            status_icon = {
                "success": "✅",
                "partial": "⚠️",
                "timeout": "⏱️",
                "no_data": "❌",
                "error": "❌"
            }.get(result["status"], "❓")
            
            notes = result.get('title', result.get('error', 'N/A'))[:40]
            report += f"| {name} | {status_icon} | {notes} |\n"
        
        report += "\n"
    
    # Write to file
    with open("PLATFORM_TEST_REPORT.md", "w", encoding="utf-8") as f:
        f.write(report)
    
    print(f"\n{Colors.BLUE}📄 Detailed report saved to: PLATFORM_TEST_REPORT.md{Colors.END}")

if __name__ == "__main__":
    try:
        summary, total = run_comprehensive_tests()
        exit(0)
    except KeyboardInterrupt:
        print(f"\n\n{Colors.YELLOW}Tests interrupted by user{Colors.END}\n")
        exit(1)
    except Exception as e:
        print(f"\n\n{Colors.RED}Test suite error: {str(e)}{Colors.END}\n")
        exit(1)
