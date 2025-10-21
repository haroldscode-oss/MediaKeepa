from flask import Flask, request, jsonify, send_from_directory, send_file, Response
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import subprocess
import os
import glob
import socket
import uuid
import re
import json
from pathlib import Path
import requests
import time
from functools import lru_cache
import hashlib
import threading
import secrets

ROOT_DIR = Path(__file__).resolve().parent
DIST_FOLDER = ROOT_DIR / "spark-template" / "dist"
DEFAULT_PORT = int(os.environ.get("PORT", "8080"))

if not DIST_FOLDER.exists():
    print("⚠️  Frontend build not found at spark-template/dist. Run 'npm run build' inside spark-template.")

app = Flask(__name__, static_folder=str(DIST_FOLDER), static_url_path="")

# CORS Configuration - defaults cover localhost and common LAN dev setups.
def detect_lan_ip():
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except Exception:
        return None


default_origins = {
    "http://localhost:5000",
    "http://127.0.0.1:5000",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
}

lan_ip_override = os.environ.get("DEV_HOST_IP")
lan_ip = lan_ip_override or detect_lan_ip()
if lan_ip:
    default_origins.update({
        f"http://{lan_ip}:5000",
        f"http://{lan_ip}:{DEFAULT_PORT}",
        f"http://{lan_ip}:5173",
    })

allowed_origins_env = os.environ.get("ALLOWED_ORIGINS")
if allowed_origins_env:
    allowed_origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]
else:
    allowed_origins = sorted(default_origins)

CORS(app, resources={r"/*": {"origins": allowed_origins, "methods": ["GET", "POST", "OPTIONS"], "allow_headers": ["Content-Type"]}})
print(f"🔐 CORS allowed origins: {', '.join(allowed_origins)}")

# Rate Limiting - Prevents abuse and spam
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
)

# In-memory cache for video metadata (prevents repeated yt-dlp calls)
video_cache = {}
CACHE_DURATION = 3600  # 1 hour in seconds

# In-memory storage for download progress tracking
download_progress = {}

# Cleanup configuration
CLEANUP_INTERVAL = 300  # Run cleanup every 5 minutes
FILE_MAX_AGE = 600  # Delete files older than 10 minutes

def cleanup_old_files():
    """
    Periodically clean up old files from temp_downloads folder
    Runs in a background thread
    """
    while True:
        try:
            time.sleep(CLEANUP_INTERVAL)
            
            if not os.path.exists(temp_downloads_path):
                continue
            
            current_time = time.time()
            files_cleaned = 0
            
            # Get all files in temp_downloads
            for filename in os.listdir(temp_downloads_path):
                file_path = os.path.join(temp_downloads_path, filename)
                
                # Skip if not a file
                if not os.path.isfile(file_path):
                    continue
                
                # Check file age
                file_age = current_time - os.path.getmtime(file_path)
                
                # Delete if older than max age
                if file_age > FILE_MAX_AGE:
                    try:
                        os.remove(file_path)
                        files_cleaned += 1
                        print(f"🗑️  Auto-cleanup: Removed old file {filename} (age: {int(file_age)}s)")
                    except Exception as e:
                        print(f"⚠️  Auto-cleanup failed for {filename}: {e}")
            
            if files_cleaned > 0:
                print(f"✨ Auto-cleanup completed: {files_cleaned} file(s) removed")
                
        except Exception as e:
            print(f"❌ Error in cleanup thread: {e}")

def get_best_tiktok_thumbnail(video_data):
    """
    Extract the best quality TikTok thumbnail URL from video metadata.
    Priority: dynamicCover > cover > originCover > default
    Returns: (thumbnail_url, thumbnail_id)
    """
    thumbnails = video_data.get("thumbnails", [])
    default_thumbnail = video_data.get("thumbnail", "")
    
    # Debug: Print all available thumbnails
    print(f"🔍 DEBUG: Found {len(thumbnails)} thumbnails for TikTok video")
    for i, thumb in enumerate(thumbnails):
        thumb_id = thumb.get("id", "unknown")
        thumb_url = thumb.get("url", "")[:100]  # First 100 chars
        print(f"   [{i}] ID: {thumb_id}, URL: {thumb_url}...")
    
    if not thumbnails:
        print(f"⚠️  No thumbnails array found, using default: {default_thumbnail[:100]}...")
        return default_thumbnail, "default"
    
    # Priority order: dynamicCover and cover are high quality (3MB+)
    # originCover is low quality (8KB) - avoid if possible
    priority_order = ["dynamicCover", "cover", "originCover"]
    
    for thumb_priority in priority_order:
        for thumb in thumbnails:
            if thumb.get("id", "") == thumb_priority:
                url = thumb.get("url")
                if url:
                    print(f"✅ Selected thumbnail: {thumb_priority} - {url[:100]}...")
                    return url, thumb_priority
    
    # Fallback to default if no match found
    print(f"⚠️  No priority thumbnails found, using default: {default_thumbnail[:100]}...")
    return default_thumbnail, "default"


def sanitize_filename(filename):
    """
    Sanitize filename to remove special characters that cause URL encoding issues.
    Replaces spaces with underscores for better compatibility.
    """
    # Split filename into name and extension
    name, ext = os.path.splitext(filename)
    
    # Remove just the # symbol but keep the hashtag text (TikTok/social media tags)
    name = name.replace('#', '')
    
    # Replace problematic unicode characters with safe alternatives
    # ⧸ (U+29F8) is a "big solidus" that appears in place of /
    name = name.replace('⧸', '-')
    
    # Remove other problematic characters but keep basic punctuation
    name = re.sub(r'[^\w\s\-_]', '', name)
    
    # Remove multiple spaces and trim
    name = re.sub(r'\s+', ' ', name).strip()
    
    # Replace all spaces with underscores for better compatibility
    name = name.replace(' ', '_')
    
    # If name is empty or too short, use a default name
    if not name or len(name) < 3:
        name = "video"
    
    return name + ext


def extract_audio_bitrate_kbps(fmt, duration_seconds=None):
    """Best-effort extraction of an audio track's bitrate in kbps from a yt-dlp format entry."""

    def to_float(value):
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            value = value.strip().lower().replace("kbps", "").replace("kb", "")
            try:
                return float(value)
            except ValueError:
                return None
        return None

    # Direct numeric fields exposed by yt-dlp
    for key in ("abr", "audio_bitrate", "bitrate", "abr_kbit", "abr_kbps"):
        if key in fmt:
            bitrate = to_float(fmt.get(key))
            if bitrate and bitrate > 0:
                return bitrate

    # Some formats expose the bitrate in textual descriptors like format_id or format_note
    for field in ("format_id", "format", "format_note"):
        text = fmt.get(field)
        if not isinstance(text, str):
            continue
        lower_text = text.lower()

        match = re.search(r"(\d{2,3})\s*(?:kbps|k)\b", lower_text)
        if match:
            return float(match.group(1))

        match = re.search(r"(\d{2,3})000\b", text)
        if match:
            return float(match.group(1))

    # Some extractors expose qualitative audio levels we can map to common bitrates
    audio_quality = fmt.get("audio_quality")
    if isinstance(audio_quality, str):
        quality_map = {
            "lossless": 320,
            "ultra": 320,
            "highest": 320,
            "high": 256,
            "medium": 192,
            "standard": 192,
            "normal": 160,
            "low": 128,
            "basic": 96,
            "economy": 64,
        }
        lower_quality = audio_quality.lower()
        for key, value in quality_map.items():
            if key in lower_quality:
                return float(value)

    # As a last resort, fall back to total bitrate (tbr) when the stream is audio-only
    tbr = to_float(fmt.get("tbr"))
    if tbr and tbr > 0:
        vcodec = (fmt.get("vcodec") or "").lower()
        video_ext = (fmt.get("video_ext") or "").lower()
        height = fmt.get("height")

        if vcodec in ("none", "") and video_ext in ("none", ""):
            return tbr
        if (vcodec in ("none", "") or video_ext in ("none", "")) and not height:
            return tbr

    # Estimate bitrate from filesize and duration for audio-only renditions
    filesize_bytes = fmt.get("filesize") or fmt.get("filesize_approx")
    if not filesize_bytes and isinstance(fmt.get("fragments"), list):
        fragment_sizes = [fragment.get("filesize") for fragment in fmt["fragments"] if fragment.get("filesize")]
        if fragment_sizes:
            filesize_bytes = sum(fragment_sizes)

    if filesize_bytes and duration_seconds:
        try:
            filesize_float = float(filesize_bytes)
            duration_float = float(duration_seconds)
            if duration_float > 0:
                vcodec = (fmt.get("vcodec") or "").lower()
                video_ext = (fmt.get("video_ext") or "").lower()
                height = fmt.get("height")

                if vcodec in ("none", "") or video_ext in ("none", "") or not height:
                    bitrate = (filesize_float * 8.0) / duration_float / 1000.0
                    if bitrate > 0:
                        return bitrate
        except (TypeError, ValueError):
            pass

    return None

# Temporary downloads path (in the project folder)
temp_downloads_path = os.path.join(os.path.dirname(__file__), "temp_downloads")

# Create temp folder if it doesn't exist
if not os.path.exists(temp_downloads_path):
    os.makedirs(temp_downloads_path)
else:
    # Clean up any leftover files from previous runs on startup
    try:
        for filename in os.listdir(temp_downloads_path):
            file_path = os.path.join(temp_downloads_path, filename)
            if os.path.isfile(file_path):
                os.remove(file_path)
        print("🧹 Startup cleanup: Cleared temp_downloads folder")
    except Exception as e:
        print(f"⚠️  Startup cleanup warning: {e}")

def perform_download(session_id, url, format_type, quality, output_template, command):
    """
    Perform the actual download in a background thread and track progress
    """
    try:
        download_progress[session_id]['status'] = 'downloading'
        download_progress[session_id]['message'] = 'Downloading...'
        
        print(f"Running command: {' '.join(command)}")
        
        # Run the download with real-time output
        process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )
        
        # Parse output in real-time to track progress
        for line in process.stdout:
            print(line.strip())
            
            # Parse yt-dlp progress line (format: [download]  12.3% of 45.67MiB at 1.23MiB/s ETA 00:12)
            if '[download]' in line and '%' in line:
                try:
                    # Extract percentage
                    if line.strip().startswith('[download]'):
                        parts = line.split()
                        for i, part in enumerate(parts):
                            if '%' in part:
                                percent_str = part.replace('%', '')
                                progress_value = float(percent_str)
                                download_progress[session_id]['progress'] = min(progress_value, 100)
                                download_progress[session_id]['message'] = f'Downloading... {progress_value:.1f}%'
                                break
                except:
                    pass
        
        process.wait()
        
        if process.returncode != 0:
            download_progress[session_id]['status'] = 'error'
            download_progress[session_id]['message'] = f'Download failed with return code {process.returncode}'
            download_progress[session_id]['progress'] = 0
            return
        
        print(f"Download completed successfully!")
        
        # Update progress to show we're processing the file
        download_progress[session_id]['status'] = 'processing'
        download_progress[session_id]['progress'] = 100
        download_progress[session_id]['message'] = 'Processing file...'
        
        # Determine file extension based on format type
        image_formats = ["png", "webp", "jpg", "jpeg"]
        video_formats = ["mp4", "webm", "mkv"]
        audio_formats = ["mp3", "m4a", "flac"]
        
        if format_type.lower() in image_formats:
            file_extension = format_type.lower()
        elif format_type.lower() in audio_formats:
            file_extension = format_type.lower()
        elif format_type.lower() in video_formats:
            file_extension = format_type.lower()
        else:
            file_extension = "mp4"  # Default fallback
        
        # Find the downloaded file (it will have the session_id prefix)
        downloaded_files = glob.glob(os.path.join(temp_downloads_path, f"{session_id}_*"))
        print(f"Looking for files: {temp_downloads_path}\\{session_id}_*")
        print(f"Found files: {downloaded_files}")
        
        if not downloaded_files:
            print("ERROR: File not found after download")
            download_progress[session_id]['status'] = 'error'
            download_progress[session_id]['message'] = 'File not found after download'
            download_progress[session_id]['progress'] = 0
            return
        
        # For image formats, filter to only get the actual image file (not .webp.part or other temp files)
        if format_type.lower() in image_formats:
            # Look for files with the correct extension
            image_files = [f for f in downloaded_files if f.endswith(f".{file_extension}")]
            if image_files:
                original_file = image_files[0]
            else:
                # No file with correct extension found, try any file
                original_file = downloaded_files[0]
        else:
            original_file = downloaded_files[0]
            
        original_filename = os.path.basename(original_file)
        print(f"Original filename: {original_filename}")
        
        # Ensure the file has the correct extension
        if not original_filename.endswith(f".{file_extension}"):
            # If the file doesn't have the right extension, rename it
            base_name = os.path.splitext(original_filename)[0]
            correct_filename = f"{base_name}.{file_extension}"
            correct_file = os.path.join(temp_downloads_path, correct_filename)
            os.rename(original_file, correct_file)
            original_file = correct_file
            original_filename = os.path.basename(correct_file)
            print(f"Fixed extension, new filename: {original_filename}")
        
        # Sanitize the filename to remove special characters
        sanitized_filename = sanitize_filename(original_filename)
        print(f"Sanitized filename: {sanitized_filename}")
        
        # Rename the file to the sanitized version
        sanitized_file_path = os.path.join(temp_downloads_path, sanitized_filename)
        os.rename(original_file, sanitized_file_path)
        print(f"File renamed to: {sanitized_file_path}")
        
        # Mark download as complete
        download_progress[session_id]['status'] = 'complete'
        download_progress[session_id]['progress'] = 100
        download_progress[session_id]['message'] = 'Download complete!'
        download_progress[session_id]['filename'] = sanitized_filename
        
        # Clean up progress data after 5 minutes (user should have downloaded by then)
        def cleanup_progress():
            time.sleep(300)  # Wait 5 minutes
            if session_id in download_progress:
                del download_progress[session_id]
                print(f"🗑️  Cleaned up progress data for session: {session_id}")
        
        threading.Thread(target=cleanup_progress, daemon=True).start()
        
    except Exception as e:
        print(f"ERROR in download thread: {str(e)}")
        download_progress[session_id]['status'] = 'error'
        download_progress[session_id]['message'] = str(e)
        download_progress[session_id]['progress'] = 0
        
        # Clean up error progress data after 1 minute
        def cleanup_error_progress():
            time.sleep(60)
            if session_id in download_progress:
                del download_progress[session_id]
                print(f"🗑️  Cleaned up error progress data for session: {session_id}")
        
        threading.Thread(target=cleanup_error_progress, daemon=True).start()

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_index(path):
    index_path = DIST_FOLDER / "index.html"
    if not index_path.exists():
        return jsonify({
            "status": "error",
            "message": "Frontend build missing. Please run npm run build inside spark-template."
        }), 503

    requested_path = DIST_FOLDER / path
    if path and requested_path.exists() and requested_path.is_file():
        # Serve existing static asset
        relative_path = os.path.relpath(requested_path, DIST_FOLDER)
        return send_from_directory(DIST_FOLDER, relative_path)

    return send_from_directory(DIST_FOLDER, 'index.html')

@app.route("/sw.js")
def serve_service_worker():
    """Serve the Monetag service worker file"""
    sw_path = DIST_FOLDER / "sw.js"
    source_dir = DIST_FOLDER if sw_path.exists() else ROOT_DIR
    return send_from_directory(source_dir, 'sw.js', mimetype='application/javascript')

@app.route("/ping")
def ping():
    return jsonify({"status": "ok", "message": "Server is running!"})

@app.route("/download", methods=["POST"])
@limiter.limit("10 per minute")  # Limit to 10 downloads per minute per IP
def download():
    data = request.get_json()
    url = data.get("url")
    format_type = data.get("format")
    quality = data.get("quality")
    
    print(f"\n=== DOWNLOAD REQUEST ===")
    print(f"URL: {url}")
    print(f"Format: {format_type}")
    print(f"Quality: {quality}")
    print(f"========================\n")

    if not url or not format_type:
        print("ERROR: Missing URL or format")
        return jsonify({"status": "error", "message": "Missing parameters"}), 400
    
    # BASIC SECURITY VALIDATION - Block dangerous URL schemes and local addresses
    # This allows all yt-dlp supported sites (1000+) while preventing obvious attacks
    dangerous_patterns = [
        r'^(file|ftp|ssh|telnet|data|javascript):',  # Dangerous protocols
        r'(localhost|127\.0\.0\.1|0\.0\.0\.0|::1)',   # Local addresses
        r'192\.168\.',                                 # Private network
        r'10\.\d{1,3}\.\d{1,3}\.\d{1,3}',             # Private network
        r'172\.(1[6-9]|2[0-9]|3[0-1])\.',             # Private network
    ]
    
    for pattern in dangerous_patterns:
        if re.search(pattern, url, re.IGNORECASE):
            print(f"❌ REJECTED: Dangerous URL pattern detected: {url}")
            return jsonify({
                "status": "error", 
                "message": "Invalid URL: Dangerous protocol or local address not allowed."
            }), 400
    
    # Ensure it's at least a valid http/https URL
    if not url.startswith(('http://', 'https://')):
        print(f"❌ REJECTED: Not a valid HTTP(S) URL: {url}")
        return jsonify({
            "status": "error", 
            "message": "Invalid URL: Must be a valid HTTP or HTTPS link."
        }), 400

    try:
        # Generate unique session ID for this download
        session_id = str(uuid.uuid4())[:8]
        
        # Initialize progress tracking for this session
        download_progress[session_id] = {
            'progress': 0,
            'status': 'starting',
            'message': 'Initializing download...'
        }
        
        # Check if this is an image format request
        image_formats = ["png", "webp", "jpg", "jpeg"]
        is_image_format = format_type.lower() in image_formats
        
        if is_image_format:
            # For image formats, download thumbnail only
            file_extension = format_type.lower()
            output_template = os.path.join(temp_downloads_path, f"{session_id}_%(title)s")
            
            # For TikTok, we need to download the CORRECT custom thumbnail (dynamicCover/cover)
            # not yt-dlp's default which might be originCover (low quality)
            if "tiktok.com" in url:
                try:
                    # Get video info to find the correct thumbnail
                    info_command = ["yt-dlp.exe", "--dump-json", "--no-playlist", url]
                    result = subprocess.run(info_command, capture_output=True, text=True, timeout=30)
                    video_data = json.loads(result.stdout)
                    
                    # Use the shared helper function to get the EXACT same thumbnail as preview
                    thumbnail_url, best_thumbnail_id = get_best_tiktok_thumbnail(video_data)
                    
                    print(f"🎯 Using TikTok {best_thumbnail_id} thumbnail for download")
                    
                    # Download the specific thumbnail URL
                    if thumbnail_url:
                        print(f"📥 Downloading from URL: {thumbnail_url[:150]}...")
                        response = requests.get(thumbnail_url, timeout=10)
                        response.raise_for_status()
                        
                        # Check content type to ensure we're getting an image, not a video
                        content_type = response.headers.get('content-type', '').lower()
                        content_length = len(response.content)
                        
                        print(f"📦 Received: {content_type}, Size: {content_length/1024:.1f} KB")
                        
                        # If we got a video instead of an image, this is the wrong thumbnail
                        if 'video' in content_type or 'mp4' in content_type:
                            print(f"⚠️  WARNING: Thumbnail URL returned a VIDEO ({content_type}), not an image!")
                            print(f"⚠️  This means TikTok returned the wrong thumbnail. Falling back to yt-dlp.")
                            raise Exception("Thumbnail URL returned video instead of image")
                        
                        # Determine the source format from the URL or content-type
                        source_ext = 'jpg'
                        if 'webp' in content_type or '.webp' in thumbnail_url.lower():
                            source_ext = 'webp'
                        elif 'png' in content_type or '.png' in thumbnail_url.lower():
                            source_ext = 'png'
                        elif 'jpeg' in content_type or 'jpg' in content_type:
                            source_ext = 'jpg'
                        
                        # Save with proper filename - SANITIZE BEFORE SAVING!
                        title = video_data.get("title", "thumbnail")
                        # Create temp filename with source extension and sanitize it
                        temp_filename = f"{session_id}_{title}.{source_ext}"
                        temp_filename = sanitize_filename(temp_filename)  # Fix invalid characters
                        temp_path = os.path.join(temp_downloads_path, temp_filename)
                        
                        with open(temp_path, 'wb') as f:
                            f.write(response.content)
                        
                        print(f"✓ Downloaded TikTok thumbnail as {source_ext.upper()} ({content_length/1024:.1f} KB)")
                        
                        # For now, deliver the thumbnail in its native format from TikTok
                        # (usually WebP or JPG) - this ensures we get the correct custom thumbnail
                        # without relying on external conversion tools
                        final_filename = temp_filename
                        print(f"✅ TikTok custom thumbnail ready: {final_filename}")
                        
                        # Update progress to complete
                        download_progress[session_id] = {
                            'progress': 100,
                            'status': 'complete',
                            'message': 'Download complete!',
                            'filename': final_filename
                        }
                        
                        print(f"✅ TikTok thumbnail ready as {file_extension.upper()}: {final_filename}")
                        
                        return jsonify({
                            "status": "started",
                            "session_id": session_id,
                            "message": "Download started"
                        })
                except Exception as e:
                    print(f"⚠ TikTok thumbnail download failed, falling back to yt-dlp: {e}")
            
            # For non-TikTok or fallback, use yt-dlp's --write-thumbnail
            # Download thumbnail and convert to requested format
            # Note: yt-dlp will add the extension automatically
            command = [
                "yt-dlp.exe", url, 
                "--write-thumbnail", 
                "--skip-download",  # Don't download video
                "--convert-thumbnails", file_extension,
                "-o", output_template,
                "--no-playlist",
                "--no-check-certificate"  # Help with some SSL issues
            ]
            print(f"Download mode: Thumbnail ({file_extension.upper()})")
        else:
            # For video/audio formats, use the requested format type
            file_extension = format_type.lower()
            
            # Output template - use explicit extension to prevent file type issues
            output_template = os.path.join(temp_downloads_path, f"{session_id}_%(title)s.{file_extension}")
            
            # Base command with --no-playlist to prevent downloading entire playlists
            command = ["yt-dlp.exe", url, "-o", output_template, "--no-playlist"]

        # Audio formats handling
        if format_type in ["mp3", "m4a", "flac"]:
            # For audio formats, extract audio only with quality setting
            command += [
                "-x", 
                "--audio-format", format_type,
                "--audio-quality", f"{quality}k" if quality else "192",
                "--embed-thumbnail",
                "--add-metadata"
            ]
            print(f"Download mode: Audio ({format_type.upper()}) - Quality: {quality if quality else 192}kbps")
        
        # Video formats handling
        elif format_type in ["mp4", "webm", "mkv"] and not is_image_format:
            if quality:
                # Get best video at requested quality + best audio
                if format_type == "webm":
                    # For WEBM, prefer VP9/VP8 video codec + opus/vorbis audio
                    format_string = f"bestvideo[height<={quality}][ext=webm]+bestaudio[ext=webm]/bestvideo[height<={quality}]+bestaudio/best[height<={quality}]/best"
                    command += ["-f", format_string, "--merge-output-format", "webm"]
                    print(f"Download mode: Video (WEBM) - Quality: {quality}p with audio")
                elif format_type == "mkv":
                    # For MKV, get best available (MKV supports any codec)
                    format_string = f"bestvideo[height<={quality}]+bestaudio/best[height<={quality}]/best"
                    command += ["-f", format_string, "--merge-output-format", "mkv"]
                    print(f"Download mode: Video (MKV) - Quality: {quality}p with audio")
                else:  # mp4
                    # For MP4, prefer MP4 container formats to avoid audio issues
                    format_string = f"bestvideo[height<={quality}][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<={quality}]+bestaudio/best[height<={quality}]/best"
                    command += ["-f", format_string, "--merge-output-format", "mp4", "--recode-video", "mp4"]
                    print(f"Download mode: Video (MP4) - Quality: {quality}p with audio")
            else:
                # If no quality specified, get best
                if format_type == "webm":
                    command += ["-f", "bestvideo[ext=webm]+bestaudio[ext=webm]/bestvideo+bestaudio/best", "--merge-output-format", "webm"]
                    print("Download mode: Video (WEBM) - Best quality with audio")
                elif format_type == "mkv":
                    command += ["-f", "bestvideo+bestaudio/best", "--merge-output-format", "mkv"]
                    print("Download mode: Video (MKV) - Best quality with audio")
                else:  # mp4
                    command += ["-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best", "--merge-output-format", "mp4", "--recode-video", "mp4"]
                    print("Download mode: Video (MP4) - Best quality with audio")

        # Start download in background thread
        download_thread = threading.Thread(
            target=perform_download,
            args=(session_id, url, format_type, quality, output_template, command)
        )
        download_thread.daemon = True
        download_thread.start()
        
        # Return session_id immediately so frontend can start polling for progress
        return jsonify({
            "status": "started",
            "session_id": session_id,
            "message": "Download started"
        })
    except Exception as e:
        error_msg = str(e) if str(e) else "Unknown error occurred during download"
        print(f"ERROR: {type(e).__name__}: {error_msg}")
        return jsonify({"status": "error", "message": error_msg}), 500

# New endpoint to check download progress
@app.route("/download-progress/<session_id>", methods=["GET"])
@limiter.exempt  # Exempt from rate limiting - this is just status checking
def get_download_progress(session_id):
    """Get the current progress of a download session"""
    if session_id not in download_progress:
        return jsonify({"status": "error", "message": "Session not found"}), 404
    
    return jsonify(download_progress[session_id])

@app.route("/video-info", methods=["POST"])
@limiter.limit("30 per minute")  # Limit to 30 info requests per minute per IP
def video_info():
    """Fetch video information including thumbnail using yt-dlp with caching"""
    data = request.get_json()
    url = data.get("url")
    
    if not url:
        return jsonify({"status": "error", "message": "Missing URL"}), 400
    
    # BASIC SECURITY VALIDATION - Same as download endpoint
    dangerous_patterns = [
        r'^(file|ftp|ssh|telnet|data|javascript):',
        r'(localhost|127\.0\.0\.1|0\.0\.0\.0|::1)',
        r'192\.168\.',
        r'10\.\d{1,3}\.\d{1,3}\.\d{1,3}',
        r'172\.(1[6-9]|2[0-9]|3[0-1])\.',
    ]
    
    for pattern in dangerous_patterns:
        if re.search(pattern, url, re.IGNORECASE):
            print(f"❌ REJECTED: Dangerous URL pattern detected: {url}")
            return jsonify({
                "status": "error", 
                "message": "Invalid URL: Dangerous protocol or local address not allowed."
            }), 400
    
    if not url.startswith(('http://', 'https://')):
        print(f"❌ REJECTED: Not a valid HTTP(S) URL: {url}")
        return jsonify({
            "status": "error", 
            "message": "Invalid URL: Must be a valid HTTP or HTTPS link."
        }), 400
    
    # Create cache key from URL
    cache_key = hashlib.md5(url.encode()).hexdigest()
    
    # Check cache first
    if cache_key in video_cache:
        cached_data, cached_time = video_cache[cache_key]
        if time.time() - cached_time < CACHE_DURATION:
            print(f"✓ Using cached data for: {url[:50]}...")
            return jsonify(cached_data)
        else:
            # Cache expired, remove it
            del video_cache[cache_key]
    
    try:
        # Use yt-dlp to get video info in JSON format (FAST - no download)
        # For YouTube, explicitly ignore playlist to speed up
        command = ["yt-dlp.exe", "--dump-json", "--no-download", "--no-playlist", url]
        
        print(f"\n=== FETCHING VIDEO INFO ===")
        print(f"URL: {url}")
        
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=20  # Increased timeout for YouTube
        )
        
        if result.returncode != 0:
            print(f"ERROR: yt-dlp failed: {result.stderr}")
            return jsonify({
                "status": "error",
                "message": "Failed to fetch media info"
            }), 500
        
        # Parse JSON output
        import json
        video_data = json.loads(result.stdout)
        
        # Extract thumbnail URL - USE DIRECT URL FOR SPEED (except Instagram)
        thumbnail_url = video_data.get("thumbnail", "")
        local_thumbnail = ""
        
        # For TikTok, prefer dynamicCover or cover (the REAL custom thumbnails with text overlays!)
        # originCover is tiny (8KB) and low quality, but cover/dynamicCover are high quality (3MB+)
        if "tiktok.com" in url:
            # Use the shared helper function to ensure consistency with download
            thumbnail_url, thumb_id = get_best_tiktok_thumbnail(video_data)
            print(f"✓ Using TikTok {thumb_id} thumbnail for preview")
        
        # For YouTube, construct high-quality thumbnail URL directly
        if "youtube.com" in url or "youtu.be" in url:
            video_id = video_data.get("id")
            if video_id:
                # Use maxresdefault for best quality, fallback to sddefault
                thumbnail_url = f"https://i.ytimg.com/vi/{video_id}/maxresdefault.jpg"
                local_thumbnail = thumbnail_url
        
        # For Instagram and TikTok, download thumbnail locally (CORS blocked otherwise)
        elif "instagram.com" in url or "tiktok.com" in url:
            if thumbnail_url:
                try:
                    session_id = str(uuid.uuid4())[:8]
                    # Determine file extension
                    ext = "jpg"
                    if ".png" in thumbnail_url.lower():
                        ext = "png"
                    elif ".webp" in thumbnail_url.lower():
                        ext = "webp"
                    
                    thumbnail_filename = f"thumb_{session_id}.{ext}"
                    thumbnail_path = os.path.join(temp_downloads_path, thumbnail_filename)
                    
                    platform_name = "TikTok" if "tiktok.com" in url else "Instagram"
                    
                    # Download the SPECIFIC thumbnail URL we selected (not yt-dlp's default!)
                    print(f"⏳ Downloading {platform_name} thumbnail from: {thumbnail_url[:80]}...")
                    response = requests.get(thumbnail_url, timeout=10)
                    response.raise_for_status()
                    
                    with open(thumbnail_path, 'wb') as f:
                        f.write(response.content)
                    
                    local_thumbnail = f"/thumbnail/{thumbnail_filename}"
                    print(f"✓ {platform_name} thumbnail downloaded: {thumbnail_filename} ({len(response.content)/1024:.1f} KB)")
                        
                except Exception as e:
                    print(f"⚠ Thumbnail download error: {e}")
                    local_thumbnail = thumbnail_url
            else:
                local_thumbnail = thumbnail_url
        
        # For other platforms, use direct URL
        else:
            local_thumbnail = thumbnail_url
        
        # Get video dimensions for aspect ratio detection
        width = video_data.get("width", 0)
        height = video_data.get("height", 0)
        
        # Determine orientation
        orientation = "horizontal"  # default
        if width and height:
            aspect_ratio = width / height
            if aspect_ratio < 0.8:  # Vertical videos (9:16 ratio = 0.5625)
                orientation = "vertical"
            elif 0.8 <= aspect_ratio <= 1.2:  # Square videos
                orientation = "square"
            else:  # Horizontal videos (16:9 ratio = 1.777)
                orientation = "horizontal"
        
        # Extract basic metadata only (no sensitive stats)
        uploader = video_data.get("uploader") or video_data.get("channel") or video_data.get("creator") or "Unknown Creator"
        
        # SMART FORMAT DETECTION
        # Analyze what formats are actually available
        formats = video_data.get("formats", [])
        extractor = video_data.get("extractor", "").lower()
        extractor_key = video_data.get("extractor_key", "").lower()
        duration_seconds = video_data.get("duration")

        # Check for video streams and collect available qualities
        has_video = False
        has_audio = False
        available_qualities = set()
        available_bitrates = set()

        def bucketize_bitrate(value):
            if not value or value <= 0:
                return
            if value >= 320:
                available_bitrates.add("320kbps")
            elif value >= 256:
                available_bitrates.add("256kbps")
            elif value >= 192:
                available_bitrates.add("192kbps")
            elif value >= 160:
                available_bitrates.add("160kbps")
            elif value >= 128:
                available_bitrates.add("128kbps")
            elif value >= 96:
                available_bitrates.add("96kbps")
            else:
                available_bitrates.add("64kbps")
        
        for fmt in formats:
            vcodec = fmt.get("vcodec", "none")
            acodec = fmt.get("acodec", "none")
            height = fmt.get("height")
            bitrate_kbps = extract_audio_bitrate_kbps(fmt, duration_seconds)
            
            # Check if format has video (vcodec is not "none" and not None, OR has video_ext, OR has .mp4/.webm/.mkv URL)
            format_url = fmt.get("url", "")
            video_ext = fmt.get("video_ext", "none")
            has_video_codec = vcodec and vcodec not in ("none", "None", None)
            has_video_extension = video_ext and video_ext not in ("none", "None", None)
            has_video_url = any(ext in format_url.lower() for ext in [".mp4", ".webm", ".mkv", ".mov", ".avi", ".flv"])
            
            if has_video_codec or has_video_extension or has_video_url:
                has_video = True
                # Collect video qualities
                if height:
                    if height >= 4320:
                        available_qualities.add("8K")
                    elif height >= 2160:
                        available_qualities.add("4K")
                    elif height >= 1440:
                        available_qualities.add("2K")
                        available_qualities.add("1440p")
                    elif height >= 1080:
                        available_qualities.add("1080p")
                    elif height >= 720:
                        available_qualities.add("720p")
                    elif height >= 480:
                        available_qualities.add("480p")
                    elif height >= 360:
                        available_qualities.add("360p")
                    elif height >= 240:
                        available_qualities.add("240p")
                    else:
                        available_qualities.add("144p")
            
            if acodec and acodec != "none":
                has_audio = True
                # Collect audio bitrates
                bucketize_bitrate(bitrate_kbps)

        # Also inspect requested formats if present (yt-dlp often preselects best audio here)
        requested_formats = video_data.get("requested_formats") or []
        for fmt in requested_formats:
            acodec = fmt.get("acodec", "none")
            if acodec and acodec != "none":
                has_audio = True
                bitrate_kbps = extract_audio_bitrate_kbps(fmt, duration_seconds)
                bucketize_bitrate(bitrate_kbps)

        # Fallback: try overall info object for bitrate hints
        if not available_bitrates and has_audio:
            inferred_bitrate = extract_audio_bitrate_kbps(video_data, duration_seconds)
            bucketize_bitrate(inferred_bitrate)

        # Platform-specific fallback when bitrate data cannot be detected
        if not available_bitrates and has_audio:
            if "tiktok" in extractor or "tiktok" in extractor_key:
                available_bitrates.add("128kbps")
                print("🎵 TikTok bitrate unavailable from metadata; defaulting to 128kbps")
            else:
                available_bitrates.add("192kbps")
                print("🎵 Audio bitrate unavailable; providing conservative default 192kbps option")
        
        # Convert sets to sorted lists
        quality_order = ["8K", "4K", "2K", "1440p", "1080p", "720p", "480p", "360p", "240p", "144p"]
        available_qualities = [q for q in quality_order if q in available_qualities]
        
        bitrate_order = ["320kbps", "256kbps", "192kbps", "160kbps", "128kbps", "96kbps", "64kbps"]
        available_bitrates = [b for b in bitrate_order if b in available_bitrates]
        
        # Determine media type and available download options
        # Audio-only platforms
        audio_only_platforms = [
            "soundcloud", "bandcamp", "mixcloud", "audiomack", 
            "music.youtube", "spotify", "applemusic", "deezer"
        ]
        
        # Video platforms (always treat as video even if detection is unclear)
        video_platforms = [
            "youtube", "tiktok", "instagram", "snapchat", "twitter", 
            "vimeo", "dailymotion", "twitch", "facebook"
        ]
        
        is_audio_platform = any(platform in extractor or platform in extractor_key for platform in audio_only_platforms)
        is_video_platform = any(platform in extractor or platform in extractor_key for platform in video_platforms)
        
        # If it's a known video platform, treat as video
        if is_video_platform:
            media_type = "video"
            available_formats = {
                "video": True,
                "audio": True,
                "image": bool(video_data.get("thumbnail"))
            }
        # If it's an audio platform or has no video, it's audio-only
        elif is_audio_platform or (has_audio and not has_video):
            media_type = "audio"
            available_formats = {
                "video": False,
                "audio": True,
                "image": bool(video_data.get("thumbnail"))
            }
        # If it has video (with or without audio), it's a video
        elif has_video:
            media_type = "video"
            available_formats = {
                "video": True,
                "audio": True,  # Most videos have audio or can extract it
                "image": bool(video_data.get("thumbnail"))
            }
        # Image-only (rare case)
        else:
            media_type = "image"
            available_formats = {
                "video": False,
                "audio": False,
                "image": bool(video_data.get("thumbnail"))
            }
        
        # Extract music/audio metadata if available
        track = video_data.get("track") or video_data.get("alt_title")
        artist = video_data.get("artist") or video_data.get("creator")
        album = video_data.get("album")
        
        # Build music info object
        music_info = None
        if track or artist:
            music_info = {
                "track": track or "Unknown Track",
                "artist": artist or "Unknown Artist",
                "album": album
            }
        else:
            # Try to parse music info from title for YouTube music videos
            title = video_data.get("title", "")
            # Common patterns: "Artist - Song", "Song - Artist", "Artist: Song", "Song (Official Video)"
            if " - " in title:
                parts = title.split(" - ", 1)
                if len(parts) == 2:
                    # Check if it looks like music (contains common indicators)
                    title_lower = title.lower()
                    music_indicators = ["official", "lyrics", "audio", "music", "video", "mv", "visualizer"]
                    if any(indicator in title_lower for indicator in music_indicators):
                        music_info = {
                            "track": parts[1].split("(")[0].strip(),  # Remove (Official Video) etc
                            "artist": parts[0].strip(),
                            "album": None
                        }
        
        info = {
            "status": "success",
            "title": video_data.get("title", "Unknown Title"),
            "duration": video_data.get("duration_string", "Unknown"),
            "thumbnail": local_thumbnail,  # Use local for Instagram, direct for others
            "hasThumbnail": bool(local_thumbnail),
            "width": width,
            "height": height,
            "orientation": orientation,
            "uploader": uploader,
            "music": music_info,
            "mediaType": media_type,
            "availableFormats": available_formats,
            "availableQualities": available_qualities,
            "availableBitrates": available_bitrates,
            "extractor": extractor
        }
        
        # Caption checking moved to on-demand /check-captions endpoint
        # This speeds up initial load from 7s to 1-2s
        
        # Cache the result
        video_cache[cache_key] = (info, time.time())
        
        print(f"Title: {info['title']}")
        print(f"Uploader: {uploader}")
        print(f"Duration: {info['duration']}")
        print(f"Dimensions: {width}x{height}")
        print(f"Orientation: {orientation}")
        print(f"Has thumbnail: {info['hasThumbnail']}")
        print(f"Thumbnail: {local_thumbnail[:60] if len(local_thumbnail) > 60 else local_thumbnail}")
        print(f"🎯 Media Type: {media_type}")
        print(f"📋 Available Formats: Video={available_formats['video']}, Audio={available_formats['audio']}, Image={available_formats['image']}")
        print(f"🎬 Available Qualities: {', '.join(available_qualities) if available_qualities else 'None detected'}")
        print(f"🎵 Available Bitrates: {', '.join(available_bitrates) if available_bitrates else 'None detected'}")
        print(f"🔧 Extractor: {extractor}")
        if music_info:
            print(f"🎵 Music Detected: {music_info.get('track', 'Unknown')} by {music_info.get('artist', 'Unknown')}")
        else:
            print(f"🎵 No music metadata found")
        print(f"✓ Cached for future requests")
        print(f"===========================\n")
        
        return jsonify(info)
        
    except subprocess.TimeoutExpired:
        return jsonify({
            "status": "error",
            "message": "Request timed out"
        }), 500
    except Exception as e:
        print(f"ERROR: {type(e).__name__}: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route("/get-video-url", methods=["POST"])
def get_video_url():
    """Get direct video stream URL for preview player"""
    data = request.get_json()
    url = data.get("url")
    
    if not url:
        return jsonify({"status": "error", "message": "Missing URL"}), 400
    
    try:
        # Use yt-dlp to get the best video URL (medium quality for preview)
        command = ["yt-dlp.exe", "--get-url", "-f", "best[height<=720]/best", url]
        
        print(f"\n=== FETCHING VIDEO STREAM URL ===")
        print(f"URL: {url}")
        
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode != 0:
            print(f"ERROR: yt-dlp failed: {result.stderr}")
            return jsonify({
                "status": "error",
                "message": "Failed to get video stream URL"
            }), 500
        
        video_url = result.stdout.strip()
        
        print(f"Video stream URL obtained")
        print(f"===========================\n")
        
        return jsonify({
            "status": "success",
            "videoUrl": video_url
        })
        
    except subprocess.TimeoutExpired:
        return jsonify({
            "status": "error",
            "message": "Request timed out"
        }), 500
    except Exception as e:
        print(f"ERROR: {type(e).__name__}: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route("/thumbnail/<filename>")
def serve_thumbnail(filename):
    """Serve downloaded thumbnail images"""
    try:
        file_path = os.path.join(temp_downloads_path, filename)
        
        if not os.path.exists(file_path):
            return jsonify({"status": "error", "message": "Thumbnail not found"}), 404
        
        # Serve the thumbnail
        return send_file(file_path, mimetype='image/jpeg')
        
    except Exception as e:
        print(f"ERROR serving thumbnail: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/get-file/<filename>")
def get_file(filename):
    try:
        file_path = os.path.join(temp_downloads_path, filename)
        
        if not os.path.exists(file_path):
            return jsonify({"status": "error", "message": "File not found"}), 404
        
        print(f"📤 Sending file to user: {filename}")
        
        # Send file to user's browser
        response = send_file(
            file_path,
            as_attachment=True,
            download_name=filename.split('_', 1)[1] if '_' in filename else filename  # Remove session_id prefix
        )
        
        # Clean up the file after sending
        @response.call_on_close
        def cleanup():
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
                    print(f"🗑️  Cleaned up file: {filename}")
            except Exception as e:
                print(f"⚠️  Failed to cleanup {filename}: {e}")
        
        return response
    except Exception as e:
        print(f"❌ Error serving file {filename}: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/stream-video/<session_id>")
def stream_video(session_id):
    """Stream video directly using yt-dlp piping"""
    try:
        # Get the video URL from session (we'll store it temporarily)
        video_url = request.args.get('url')
        
        if not video_url:
            return jsonify({
                "status": "error",
                "message": "No URL provided"
            }), 400
        
        print(f"\n===========================")
        print(f"Streaming video via yt-dlp")
        print(f"URL: {video_url}")
        print(f"Session: {session_id}")
        print(f"===========================")
        
        # Use yt-dlp to pipe video directly to stdout
        # For YouTube, use format that doesn't require merging (pre-merged formats)
        # For other platforms, use best available format
        if 'youtube.com' in video_url or 'youtu.be' in video_url:
            # YouTube: Use pre-merged formats only (no ffmpeg required)
            format_string = "18/best[height<=480][ext=mp4]/best[ext=mp4]/best"
        else:
            # Other platforms: Use best format up to 720p
            format_string = "best[height<=720][ext=mp4]/best[height<=720]/best"
        
        cmd = [
            "yt-dlp.exe",
            "-f", format_string,
            "-o", "-",  # Output to stdout
            video_url
        ]
        
        # Start yt-dlp process
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        def generate():
            """Generator to stream video chunks"""
            try:
                while True:
                    chunk = process.stdout.read(8192)
                    if not chunk:
                        break
                    yield chunk
            finally:
                process.stdout.close()
                process.wait()
        
        return Response(
            generate(),
            mimetype='video/mp4',
            headers={
                'Accept-Ranges': 'bytes',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache'
            }
        )
        
    except Exception as e:
        print(f"ERROR streaming video: {type(e).__name__}: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route("/get-stream-session", methods=['POST'])
def get_stream_session():
    """Generate a session ID for video streaming"""
    try:
        data = request.json
        video_url = data.get('url')
        
        if not video_url:
            return jsonify({
                "status": "error",
                "message": "No URL provided"
            }), 400
        
        # Generate unique session ID
        session_id = str(uuid.uuid4())
        
        print(f"\n===========================")
        print(f"Created stream session")
        print(f"URL: {video_url}")
        print(f"Session: {session_id}")
        print(f"===========================\n")
        
        return jsonify({
            "status": "success",
            "sessionId": session_id
        })
        
    except Exception as e:
        print(f"ERROR: {type(e).__name__}: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route("/proxy-video")
def proxy_video():
    """Proxy video stream with Range header support"""
    try:
        video_url = request.args.get('url')
        
        if not video_url:
            return jsonify({
                "status": "error",
                "message": "No URL provided"
            }), 400
        
        # Get Range header from client
        range_header = request.headers.get('Range')
        
        # Prepare comprehensive headers to bypass anti-hotlinking
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'identity',
            'Origin': 'https://www.tiktok.com',
            'Referer': 'https://www.tiktok.com/',
            'Sec-Fetch-Dest': 'video',
            'Sec-Fetch-Mode': 'no-cors',
            'Sec-Fetch-Site': 'same-site'
        }
        
        if range_header:
            headers['Range'] = range_header
        
        # Stream the video from the source with a timeout
        response = requests.get(video_url, headers=headers, stream=True, timeout=30)
        
        print(f"Video proxy response status: {response.status_code}")
        
        # If we get 403, the URL might be expired or need different headers
        if response.status_code == 403:
            print(f"ERROR: 403 Forbidden - Video URL may be expired or blocked")
            return jsonify({
                "status": "error",
                "message": "Video access denied. The video URL may have expired."
            }), 403
        
        # Create Flask response with proper headers
        flask_response = Response(
            response.iter_content(chunk_size=8192),
            status=response.status_code,
            content_type=response.headers.get('Content-Type', 'video/mp4')
        )
        
        # Copy important headers
        if 'Content-Range' in response.headers:
            flask_response.headers['Content-Range'] = response.headers['Content-Range']
        if 'Content-Length' in response.headers:
            flask_response.headers['Content-Length'] = response.headers['Content-Length']
        
        flask_response.headers['Accept-Ranges'] = 'bytes'
        flask_response.headers['Access-Control-Allow-Origin'] = '*'
        flask_response.headers['Cache-Control'] = 'no-cache'
        
        return flask_response
        
    except requests.exceptions.Timeout:
        print(f"ERROR: Request timed out")
        return jsonify({
            "status": "error",
            "message": "Video request timed out"
        }), 504
    except Exception as e:
        print(f"ERROR proxying video: {type(e).__name__}: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

def check_caption_availability(url):
    """
    Helper function to check if video has captions.
    Returns dict with has_captions (bool) and languages (list).
    """
    try:
        # Run yt-dlp --list-subs to get available captions
        command = ["yt-dlp.exe", "--list-subs", url, "--no-playlist"]
        
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=30,
            encoding='utf-8',
            errors='replace'
        )
        
        output = result.stdout + result.stderr
        
        # Check if video has no subtitles
        if "has no subtitles" in output.lower():
            return {"has_captions": False, "languages": []}
        
        # Parse available subtitle languages from output
        languages = []
        in_subtitle_section = False
        
        for line in output.split('\n'):
            line = line.strip()
            
            # Detect subtitle section header
            if "Available subtitles" in line or "Language" in line and "Formats" in line:
                in_subtitle_section = True
                continue
            
            # Parse language lines
            if in_subtitle_section and line:
                # Skip empty lines and separator lines
                if not line or line.startswith('-'):
                    continue
                
                # Extract language code (first word before whitespace)
                parts = line.split()
                if parts:
                    lang_code = parts[0]
                    # Skip if it's a format name (vtt, srt, etc.)
                    if lang_code.lower() not in ['vtt', 'srt', 'ttml', 'json3', 'srv1', 'srv2', 'srv3']:
                        # Get readable language name
                        lang_name = get_language_name(lang_code)
                        languages.append({
                            "code": lang_code,
                            "name": lang_name
                        })
        
        return {
            "has_captions": len(languages) > 0,
            "languages": languages
        }
        
    except Exception as e:
        print(f"ERROR checking captions: {type(e).__name__}: {str(e)}")
        return {"has_captions": False, "languages": []}


# Language code to name mapping
LANGUAGE_NAMES = {
    'eng': 'English', 'spa': 'Spanish', 'fra': 'French', 'deu': 'German', 'ita': 'Italian',
    'por': 'Portuguese', 'rus': 'Russian', 'jpn': 'Japanese', 'kor': 'Korean', 'cmn': 'Chinese',
    'ara': 'Arabic', 'hin': 'Hindi', 'ben': 'Bengali', 'tur': 'Turkish', 'vie': 'Vietnamese',
    'pol': 'Polish', 'ukr': 'Ukrainian', 'nld': 'Dutch', 'tha': 'Thai', 'ind': 'Indonesian',
    'heb': 'Hebrew', 'ces': 'Czech', 'ron': 'Romanian', 'swe': 'Swedish', 'dan': 'Danish',
    'fin': 'Finnish', 'nor': 'Norwegian', 'bul': 'Bulgarian', 'cat': 'Catalan', 'hrv': 'Croatian',
    'hun': 'Hungarian', 'lit': 'Lithuanian', 'lav': 'Latvian', 'est': 'Estonian', 'slk': 'Slovak',
    'slv': 'Slovenian', 'srp': 'Serbian', 'ell': 'Greek', 'alb': 'Albanian', 'mkd': 'Macedonian',
    'uzb': 'Uzbek', 'kaz': 'Kazakh', 'aze': 'Azerbaijani', 'urd': 'Urdu', 'khm': 'Khmer',
    'swa': 'Swahili', 'jav': 'Javanese', 'ceb': 'Cebuano', 'fil': 'Filipino', 'msa': 'Malay'
}

def get_language_name(lang_code):
    """
    Convert language code to readable name.
    Examples: 'eng-US' -> 'English (US)', 'jpn-JP' -> 'Japanese', 'cmn-Hans-CN' -> 'Chinese (Simplified)'
    """
    if not lang_code:
        return lang_code
    
    # Split by hyphen
    parts = lang_code.split('-')
    base_code = parts[0].lower()
    
    # Get base language name
    lang_name = LANGUAGE_NAMES.get(base_code, base_code.title())
    
    # Add region/variant if present
    if len(parts) > 1:
        region = parts[-1].upper()  # Last part is usually region (US, GB, CN, etc.)
        
        # Special handling for Chinese variants
        if base_code == 'cmn':
            if 'Hans' in lang_code:
                return 'Chinese (Simplified)'
            elif 'Hant' in lang_code:
                return 'Chinese (Traditional)'
        
        # Add region for specific cases
        if region in ['US', 'GB', 'CA', 'AU', 'BR', 'MX', 'ES', 'PT']:
            return f"{lang_name} ({region})"
    
    return lang_name


def perform_caption_check(session_id, url):
    """
    Background thread function to check caption availability with progress updates.
    Similar to perform_download() but for caption checking.
    """
    try:
        download_progress[session_id] = {
            "status": "checking",
            "progress": "0",
            "message": "Checking for captions..."
        }
        
        print(f"\n=== CAPTION CHECK (Session: {session_id}) ===")
        print(f"URL: {url}")
        
        # Simulate progress updates during caption check
        download_progress[session_id]["progress"] = "25"
        download_progress[session_id]["message"] = "Fetching subtitle information..."
        
        # Run yt-dlp --list-subs to get available captions
        command = ["yt-dlp.exe", "--list-subs", url, "--no-playlist"]
        print(f"Running command: {' '.join(command)}")
        
        download_progress[session_id]["progress"] = "50"
        download_progress[session_id]["message"] = "Parsing caption data..."
        
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=30,
            encoding='utf-8',
            errors='replace'
        )
        
        output = result.stdout + result.stderr
        
        download_progress[session_id]["progress"] = "75"
        download_progress[session_id]["message"] = "Processing languages..."
        
        # Check if video has no subtitles
        if "has no subtitles" in output.lower():
            print("✗ No captions available for this video")
            download_progress[session_id] = {
                "status": "complete",
                "progress": "100",
                "has_captions": False,
                "languages": [],
                "message": "No captions available"
            }
            return
        
        # Parse available subtitle languages from output
        languages = []
        in_subtitle_section = False
        
        for line in output.split('\n'):
            line = line.strip()
            
            # Detect subtitle section header
            if "Available subtitles" in line or "Language" in line and "Formats" in line:
                in_subtitle_section = True
                continue
            
            # Parse language lines
            if in_subtitle_section and line:
                # Skip empty lines and separator lines
                if not line or line.startswith('-'):
                    continue
                
                # Extract language code (first word before whitespace)
                parts = line.split()
                if parts:
                    lang_code = parts[0]
                    # Skip if it's a format name (vtt, srt, etc.)
                    if lang_code.lower() not in ['vtt', 'srt', 'ttml', 'json3', 'srv1', 'srv2', 'srv3']:
                        # Get readable language name
                        lang_name = get_language_name(lang_code)
                        languages.append({
                            "code": lang_code,
                            "name": lang_name
                        })
        
        if languages:
            print(f"✓ Found {len(languages)} caption languages")
            download_progress[session_id] = {
                "status": "complete",
                "progress": "100",
                "has_captions": True,
                "languages": languages,
                "message": f"Found {len(languages)} languages"
            }
        else:
            print("✗ No captions found in output")
            download_progress[session_id] = {
                "status": "complete",
                "progress": "100",
                "has_captions": False,
                "languages": [],
                "message": "No captions found"
            }
            
    except subprocess.TimeoutExpired:
        print("ERROR: Caption check timed out")
        download_progress[session_id] = {
            "status": "error",
            "message": "Caption check timed out"
        }
    except Exception as e:
        print(f"ERROR checking captions: {type(e).__name__}: {str(e)}")
        download_progress[session_id] = {
            "status": "error",
            "message": str(e)
        }


@app.route("/check-captions", methods=["POST"])
@limiter.limit("20 per minute")
def check_captions():
    """
    Check if video has captions - returns immediately with session_id for progress polling.
    This endpoint is called ONLY when user clicks the Caption tab (lazy loading).
    """
    data = request.get_json()
    url = data.get("url")
    
    if not url:
        return jsonify({"status": "error", "message": "Missing URL"}), 400
    
    try:
        # Generate session ID for progress tracking
        session_id = secrets.token_hex(8)
        
        # Start caption check in background thread
        check_thread = threading.Thread(
            target=perform_caption_check,
            args=(session_id, url)
        )
        check_thread.daemon = True
        check_thread.start()
        
        # Return session_id immediately so frontend can poll for progress
        return jsonify({
            "status": "started",
            "session_id": session_id,
            "message": "Caption check started"
        })
        
    except Exception as e:
        print(f"ERROR starting caption check: {type(e).__name__}: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


def convert_caption_to_txt(vtt_file_path):
    """
    Convert VTT caption file to plain text format.
    Removes timestamps, formatting, and keeps only the spoken text.
    """
    try:
        with open(vtt_file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        lines = content.split('\n')
        text_lines = []
        
        for line in lines:
            line = line.strip()
            
            # Skip empty lines
            if not line:
                continue
            
            # Skip WEBVTT header
            if line.startswith('WEBVTT'):
                continue
            
            # Skip timestamp lines (contains -->)
            if '-->' in line:
                continue
            
            # Skip cue identifiers (numbers or timestamps at start)
            if line.replace(':', '').replace('.', '').replace(',', '').isdigit():
                continue
            
            # Skip NOTE lines (VTT comments)
            if line.startswith('NOTE'):
                continue
            
            # Remove HTML-like tags (e.g., <v Speaker>, <i>, </i>)
            import re
            line = re.sub(r'<[^>]+>', '', line)
            
            # Add the cleaned line if it has content
            if line and line not in text_lines:  # Avoid duplicates
                text_lines.append(line)
        
        # Join with newlines and return
        return '\n'.join(text_lines)
    
    except Exception as e:
        print(f"ERROR converting to TXT: {e}")
        return None


@app.route("/download-caption", methods=["POST"])
@limiter.limit("10 per minute")
def download_caption():
    """
    Download caption file in the requested format and language.
    Works with any platform that yt-dlp supports.
    Supports TXT, SRT, and VTT formats.
    """
    data = request.get_json()
    url = data.get("url")
    language = data.get("language")
    caption_format = data.get("format", "srt")  # Default to SRT
    
    print(f"\n=== CAPTION DOWNLOAD REQUEST ===")
    print(f"URL: {url}")
    print(f"Language: {language}")
    print(f"Format: {caption_format}")
    print(f"================================\n")
    
    if not url or not language:
        return jsonify({"status": "error", "message": "Missing URL or language"}), 400
    
    try:
        # Generate unique session ID for this download
        session_id = str(uuid.uuid4())[:8]
        
        # Initialize progress tracking
        download_progress[session_id] = {
            'progress': 0,
            'status': 'starting',
            'message': 'Downloading caption...'
        }
        
        # Output template for caption file
        output_template = os.path.join(temp_downloads_path, f"{session_id}_%(title)s.%(ext)s")
        
        # For TXT format, download as VTT first, then convert
        # yt-dlp doesn't support TXT natively
        download_format = "vtt" if caption_format == "txt" else caption_format
        
        # Build yt-dlp command for caption download
        command = [
            "yt-dlp.exe",
            url,
            "--write-sub",              # Download subtitles
            "--sub-lang", language,     # Specific language
            "--sub-format", download_format,  # Download as VTT/SRT
            "--skip-download",          # Don't download video
            "--no-playlist",
            "-o", output_template,
            "--convert-subs", download_format  # Convert to requested format if needed
        ]
        
        print(f"Running command: {' '.join(command)}")
        
        # Run download in background thread
        def download_caption_thread():
            try:
                download_progress[session_id]['status'] = 'downloading'
                download_progress[session_id]['message'] = 'Extracting caption...'
                
                result = subprocess.run(
                    command,
                    capture_output=True,
                    text=True,
                    timeout=60,
                    encoding='utf-8',
                    errors='replace'
                )
                
                output = result.stdout + result.stderr
                print(f"Caption download output:\n{output}")
                
                # Find the downloaded caption file
                pattern = os.path.join(temp_downloads_path, f"{session_id}_*")
                files = glob.glob(pattern)
                
                if not files:
                    print(f"ERROR: No caption file found matching pattern: {pattern}")
                    download_progress[session_id] = {
                        'progress': 0,
                        'status': 'error',
                        'message': 'Caption file not found. The video may not have captions in the requested language.'
                    }
                    return
                
                # Get the caption file (should be only one)
                caption_file = files[0]
                original_filename = os.path.basename(caption_file)
                print(f"Original caption filename: {original_filename}")
                
                # If user requested TXT format, convert VTT to plain text
                if caption_format == "txt":
                    print(f"📝 Converting caption to TXT format...")
                    txt_content = convert_caption_to_txt(caption_file)
                    
                    if txt_content:
                        # Create new TXT file
                        txt_filename = original_filename.replace('.vtt', '.txt').replace('.srt', '.txt')
                        txt_path = os.path.join(temp_downloads_path, txt_filename)
                        
                        with open(txt_path, 'w', encoding='utf-8') as f:
                            f.write(txt_content)
                        
                        # Remove original VTT file
                        os.remove(caption_file)
                        
                        caption_file = txt_path
                        original_filename = txt_filename
                        print(f"✅ Converted to TXT: {txt_filename}")
                    else:
                        print(f"ERROR: Failed to convert caption to TXT")
                        download_progress[session_id] = {
                            'progress': 0,
                            'status': 'error',
                            'message': 'Failed to convert caption to TXT format'
                        }
                        return
                
                # Sanitize filename
                sanitized_filename = sanitize_filename(original_filename)
                sanitized_path = os.path.join(temp_downloads_path, sanitized_filename)
                
                # Rename if needed
                if original_filename != sanitized_filename:
                    os.rename(caption_file, sanitized_path)
                    print(f"Caption file renamed to: {sanitized_filename}")
                else:
                    sanitized_filename = original_filename
                
                # Update progress
                download_progress[session_id] = {
                    'progress': 100,
                    'status': 'complete',
                    'message': 'Caption download complete!',
                    'filename': sanitized_filename
                }
                
                print(f"✅ Caption download complete: {sanitized_filename}")
                
            except subprocess.TimeoutExpired:
                print(f"ERROR: Caption download timed out for session {session_id}")
                download_progress[session_id] = {
                    'progress': 0,
                    'status': 'error',
                    'message': 'Caption download timed out'
                }
            except Exception as e:
                print(f"ERROR in caption download thread: {type(e).__name__}: {str(e)}")
                download_progress[session_id] = {
                    'progress': 0,
                    'status': 'error',
                    'message': f'Caption download failed: {str(e)}'
                }
        
        # Start download thread
        thread = threading.Thread(target=download_caption_thread)
        thread.start()
        
        return jsonify({
            "status": "started",
            "session_id": session_id,
            "message": "Caption download started"
        })
        
    except Exception as e:
        print(f"ERROR starting caption download: {type(e).__name__}: {str(e)}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


if __name__ == "__main__":
    # Start cleanup thread for automatic file deletion
    cleanup_thread = threading.Thread(target=cleanup_old_files, daemon=True)
    cleanup_thread.start()
    print("🧹 Auto-cleanup thread started (checks every 5 minutes)")
    
    app.run(debug=False, host='0.0.0.0', port=DEFAULT_PORT)
