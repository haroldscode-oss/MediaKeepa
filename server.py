from flask import Flask, request, jsonify, send_from_directory, send_file, Response
from flask_cors import CORS
import subprocess
import os
import webbrowser
import glob
import uuid
import re
from pathlib import Path
import requests
import time
from functools import lru_cache
import hashlib
import threading

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*", "methods": ["GET", "POST", "OPTIONS"], "allow_headers": ["Content-Type"]}})

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

# Automatically open browser on server start
webbrowser.open("http://127.0.0.1:5000")

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
        
        # Set explicit extension based on format type
        file_extension = "mp3" if format_type == "mp3" else "mp4"
        
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
            
        # Get the original filename
        original_file = downloaded_files[0]
        original_filename = os.path.basename(original_file)
        print(f"Original filename: {original_filename}")
        
        # Ensure the file has the correct extension
        if not original_filename.endswith(f".{file_extension}"):
            # If the file doesn't have the right extension, add it
            correct_file = original_file + f".{file_extension}"
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

@app.route("/")
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route("/sw.js")
def serve_service_worker():
    """Serve the Monetag service worker file"""
    return send_from_directory('.', 'sw.js', mimetype='application/javascript')

@app.route("/ping")
def ping():
    return jsonify({"status": "ok", "message": "Server is running!"})

@app.route("/download", methods=["POST"])
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

    try:
        # Generate unique session ID for this download
        session_id = str(uuid.uuid4())[:8]
        
        # Initialize progress tracking for this session
        download_progress[session_id] = {
            'progress': 0,
            'status': 'starting',
            'message': 'Initializing download...'
        }
        
        # Set explicit extension based on format type
        file_extension = "mp3" if format_type == "mp3" else "mp4"
        
        # Output template - use explicit extension to prevent file type issues
        output_template = os.path.join(temp_downloads_path, f"{session_id}_%(title)s.{file_extension}")
        
        # Base command with --no-playlist to prevent downloading entire playlists
        command = ["yt-dlp.exe", url, "-o", output_template, "--no-playlist"]

        if format_type == "mp3":
            # For MP3, extract audio only with quality setting
            command += [
                "-x", 
                "--audio-format", "mp3",
                "--audio-quality", f"{quality}k" if quality else "192",
                "--embed-thumbnail",
                "--add-metadata"
            ]
            print(f"Download mode: Audio (MP3) - Quality: {quality if quality else 192}kbps")
        elif format_type == "mp4":
            # For MP4, prefer MP4 container formats to avoid audio issues
            if quality:
                # Get best video at requested quality + best audio in MP4/M4A formats
                format_string = f"bestvideo[height<={quality}][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<={quality}]+bestaudio/best[height<={quality}]/best"
                command += ["-f", format_string, "--merge-output-format", "mp4", "--recode-video", "mp4"]
                print(f"Download mode: Video (MP4) - Quality: {quality}p with audio (ffmpeg)")
            else:
                # If no quality specified, get best
                command += ["-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best", "--merge-output-format", "mp4", "--recode-video", "mp4"]
                print("Download mode: Video (MP4) - Best quality with audio (ffmpeg)")

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
def get_download_progress(session_id):
    """Get the current progress of a download session"""
    if session_id not in download_progress:
        return jsonify({"status": "error", "message": "Session not found"}), 404
    
    return jsonify(download_progress[session_id])

@app.route("/video-info", methods=["POST"])
def video_info():
    """Fetch video information including thumbnail using yt-dlp with caching"""
    data = request.get_json()
    url = data.get("url")
    
    if not url:
        return jsonify({"status": "error", "message": "Missing URL"}), 400
    
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
                "message": "Failed to fetch video info"
            }), 500
        
        # Parse JSON output
        import json
        video_data = json.loads(result.stdout)
        
        # Extract thumbnail URL - USE DIRECT URL FOR SPEED (except Instagram)
        thumbnail_url = video_data.get("thumbnail", "")
        local_thumbnail = ""
        
        # For YouTube, construct high-quality thumbnail URL directly
        if "youtube.com" in url or "youtu.be" in url:
            video_id = video_data.get("id")
            if video_id:
                # Use maxresdefault for best quality, fallback to sddefault
                thumbnail_url = f"https://i.ytimg.com/vi/{video_id}/maxresdefault.jpg"
                local_thumbnail = thumbnail_url
        
        # For Instagram, download thumbnail locally (CORS blocked otherwise)
        elif "instagram.com" in url:
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
                    
                    # Use yt-dlp to download the thumbnail (handles Instagram auth)
                    thumb_command = ["yt-dlp.exe", "--write-thumbnail", "--skip-download", "-o", 
                                   os.path.join(temp_downloads_path, f"thumb_{session_id}"), url]
                    
                    print(f"⏳ Downloading Instagram thumbnail...")
                    thumb_result = subprocess.run(thumb_command, capture_output=True, text=True, timeout=8)
                    
                    # Find the downloaded thumbnail file
                    thumb_files = glob.glob(os.path.join(temp_downloads_path, f"thumb_{session_id}.*"))
                    if thumb_files:
                        actual_thumbnail = os.path.basename(thumb_files[0])
                        local_thumbnail = f"/thumbnail/{actual_thumbnail}"
                        print(f"✓ Instagram thumbnail downloaded: {actual_thumbnail}")
                    else:
                        print("⚠ Thumbnail download failed, using direct URL (may be blocked)")
                        local_thumbnail = thumbnail_url
                        
                except Exception as e:
                    print(f"⚠ Thumbnail download error: {e}")
                    local_thumbnail = thumbnail_url
            else:
                local_thumbnail = thumbnail_url
        
        # For TikTok and other platforms, use direct URL
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
            "music": music_info
        }
        
        # Cache the result
        video_cache[cache_key] = (info, time.time())
        
        print(f"Title: {info['title']}")
        print(f"Uploader: {uploader}")
        print(f"Duration: {info['duration']}")
        print(f"Dimensions: {width}x{height}")
        print(f"Orientation: {orientation}")
        print(f"Has thumbnail: {info['hasThumbnail']}")
        print(f"Thumbnail: {local_thumbnail[:60] if len(local_thumbnail) > 60 else local_thumbnail}")
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

if __name__ == "__main__":
    # Start cleanup thread for automatic file deletion
    cleanup_thread = threading.Thread(target=cleanup_old_files, daemon=True)
    cleanup_thread.start()
    print("🧹 Auto-cleanup thread started (checks every 5 minutes)")
    
    app.run(debug=False, port=8000)
