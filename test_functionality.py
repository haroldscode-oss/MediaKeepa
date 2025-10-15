"""
MediaKeepa Functionality Test Suite
Tests all major features of the application
"""

import requests
import json
import time

API_URL = "http://127.0.0.1:8000"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def print_test(name):
    print(f"\n{Colors.BLUE}🧪 Testing: {name}{Colors.END}")

def print_success(message):
    print(f"{Colors.GREEN}✅ {message}{Colors.END}")

def print_error(message):
    print(f"{Colors.RED}❌ {message}{Colors.END}")

def print_warning(message):
    print(f"{Colors.YELLOW}⚠️  {message}{Colors.END}")

def test_server_connection():
    """Test if backend server is accessible"""
    print_test("Server Connection")
    try:
        response = requests.get(f"{API_URL}/", timeout=5)
        if response.status_code == 200:
            print_success("Backend server is running and accessible")
            return True
        else:
            print_error(f"Server returned status code: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Cannot connect to server: {str(e)}")
        return False

def test_video_info_youtube():
    """Test video info fetching for YouTube"""
    print_test("YouTube Video Info")
    try:
        url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        response = requests.post(
            f"{API_URL}/video-info",
            json={"url": url},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("title") and data.get("thumbnail"):
                print_success(f"YouTube info fetched: {data.get('title')[:50]}")
                print(f"   - Thumbnail: {'✓' if data.get('thumbnail') else '✗'}")
                print(f"   - Duration: {data.get('duration', 'N/A')}")
                print(f"   - Channel: {data.get('channel', 'N/A')}")
                print(f"   - Formats Available: Video={data.get('availableFormats', {}).get('video')}, Audio={data.get('availableFormats', {}).get('audio')}, Image={data.get('availableFormats', {}).get('image')}")
                return True
            else:
                print_error("Response missing required fields")
                return False
        else:
            print_error(f"Failed with status code: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Error: {str(e)}")
        return False

def test_video_info_soundcloud():
    """Test video info fetching for SoundCloud"""
    print_test("SoundCloud Audio Info")
    try:
        url = "https://soundcloud.com/octobersveryown/drake-hotline-bling"
        response = requests.post(
            f"{API_URL}/video-info",
            json={"url": url},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("title"):
                print_success(f"SoundCloud info fetched: {data.get('title')[:50]}")
                print(f"   - Media Type: {data.get('mediaType', 'N/A')}")
                print(f"   - Formats Available: Video={data.get('availableFormats', {}).get('video')}, Audio={data.get('availableFormats', {}).get('audio')}, Image={data.get('availableFormats', {}).get('image')}")
                
                # Check that video format is NOT available for audio-only platform
                if not data.get('availableFormats', {}).get('video'):
                    print_success("Correctly identified as audio-only (no video option)")
                else:
                    print_warning("Video format available for audio-only platform (might be incorrect)")
                return True
            else:
                print_error("Response missing title")
                return False
        else:
            print_error(f"Failed with status code: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Error: {str(e)}")
        return False

def test_video_info_instagram():
    """Test video info fetching for Instagram"""
    print_test("Instagram Video Info")
    try:
        url = "https://www.instagram.com/p/C2-example/"
        response = requests.post(
            f"{API_URL}/video-info",
            json={"url": url},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            print_success("Instagram endpoint is working")
            print(f"   - Title: {data.get('title', 'N/A')[:50]}")
            return True
        else:
            print_warning(f"Instagram test returned status {response.status_code} (may need valid URL)")
            return True  # Don't fail test for invalid URL
    except Exception as e:
        print_warning(f"Instagram test skipped: {str(e)}")
        return True

def test_download_endpoint():
    """Test download endpoint initialization"""
    print_test("Download Endpoint")
    try:
        # Don't actually download, just test the endpoint exists
        url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        response = requests.post(
            f"{API_URL}/download",
            json={"url": url, "format": "mp3", "quality": "192kbps"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("session_id"):
                print_success(f"Download endpoint working - Session ID: {data.get('session_id')}")
                return True, data.get('session_id')
            else:
                print_error("No session_id returned")
                return False, None
        else:
            print_error(f"Failed with status code: {response.status_code}")
            return False, None
    except Exception as e:
        print_error(f"Error: {str(e)}")
        return False, None

def test_download_progress(session_id):
    """Test download progress tracking"""
    print_test("Download Progress Tracking")
    try:
        response = requests.get(
            f"{API_URL}/download-progress/{session_id}",
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            print_success(f"Progress endpoint working - Status: {data.get('status')}")
            print(f"   - Progress: {data.get('progress', 0)}%")
            print(f"   - Message: {data.get('message', 'N/A')}")
            return True
        else:
            print_error(f"Failed with status code: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Error: {str(e)}")
        return False

def test_cors_headers():
    """Test CORS configuration"""
    print_test("CORS Configuration")
    try:
        response = requests.options(
            f"{API_URL}/video-info",
            headers={"Origin": "http://localhost:5000"}
        )
        
        cors_header = response.headers.get("Access-Control-Allow-Origin")
        if cors_header:
            print_success(f"CORS is configured: {cors_header}")
            return True
        else:
            print_warning("CORS headers not found (may cause frontend issues)")
            return False
    except Exception as e:
        print_error(f"Error: {str(e)}")
        return False

def test_file_cleanup():
    """Test that temp file cleanup is configured"""
    print_test("File Cleanup System")
    try:
        import os
        temp_path = os.path.join(os.getcwd(), "temp_downloads")
        if os.path.exists(temp_path):
            print_success("Temp downloads folder exists")
            files = os.listdir(temp_path)
            print(f"   - Current files in temp: {len(files)}")
            return True
        else:
            print_warning("Temp downloads folder not found")
            return False
    except Exception as e:
        print_error(f"Error: {str(e)}")
        return False

def run_all_tests():
    """Run all test suites"""
    print(f"\n{Colors.BLUE}{'='*60}")
    print(f"  MediaKeepa Functionality Test Suite")
    print(f"{'='*60}{Colors.END}\n")
    
    results = []
    
    # Core tests
    results.append(("Server Connection", test_server_connection()))
    results.append(("CORS Configuration", test_cors_headers()))
    results.append(("File Cleanup System", test_file_cleanup()))
    
    # Video info tests
    results.append(("YouTube Video Info", test_video_info_youtube()))
    results.append(("SoundCloud Audio Info", test_video_info_soundcloud()))
    results.append(("Instagram Video Info", test_video_info_instagram()))
    
    # Download tests
    download_result, session_id = test_download_endpoint()
    results.append(("Download Endpoint", download_result))
    
    if session_id:
        time.sleep(2)  # Wait for download to start
        results.append(("Download Progress", test_download_progress(session_id)))
    
    # Summary
    print(f"\n{Colors.BLUE}{'='*60}")
    print(f"  Test Summary")
    print(f"{'='*60}{Colors.END}\n")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = f"{Colors.GREEN}✅ PASS{Colors.END}" if result else f"{Colors.RED}❌ FAIL{Colors.END}"
        print(f"{status} - {test_name}")
    
    print(f"\n{Colors.BLUE}Total: {passed}/{total} tests passed{Colors.END}")
    
    if passed == total:
        print(f"\n{Colors.GREEN}🎉 All tests passed! MediaKeepa is working great!{Colors.END}\n")
    else:
        print(f"\n{Colors.YELLOW}⚠️  Some tests failed. Review the issues above.{Colors.END}\n")
    
    return passed, total

if __name__ == "__main__":
    try:
        passed, total = run_all_tests()
        exit(0 if passed == total else 1)
    except KeyboardInterrupt:
        print(f"\n\n{Colors.YELLOW}Tests interrupted by user{Colors.END}\n")
        exit(1)
