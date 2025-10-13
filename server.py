from flask import Flask, request, jsonify, send_from_directory, send_file
import subprocess
import os
import webbrowser
import glob
import uuid
import re
from pathlib import Path

app = Flask(__name__)

def sanitize_filename(filename):
    """
    Sanitize filename to remove special characters that cause URL encoding issues.
    Keeps alphanumeric, spaces, dots, hyphens, and underscores.
    """
    # Remove hashtags completely (TikTok/social media tags)
    filename = re.sub(r'#\w+', '', filename)
    
    # Replace problematic unicode characters with safe alternatives
    # ⧸ (U+29F8) is a "big solidus" that appears in place of /
    filename = filename.replace('⧸', '-')
    
    # Remove other problematic characters but keep basic punctuation
    filename = re.sub(r'[^\w\s\-_\.]', '', filename)
    
    # Remove multiple spaces and trim
    filename = re.sub(r'\s+', ' ', filename).strip()
    
    return filename

# Automatically open browser on server start
webbrowser.open("http://127.0.0.1:5000")

# Temporary downloads path (in the project folder)
temp_downloads_path = os.path.join(os.path.dirname(__file__), "temp_downloads")

# Create temp folder if it doesn't exist
if not os.path.exists(temp_downloads_path):
    os.makedirs(temp_downloads_path)

@app.route("/")
def serve_index():
    return send_from_directory('.', 'index.html')

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
        
        # Output template to track the filename
        output_template = os.path.join(temp_downloads_path, f"{session_id}_%(title)s.%(ext)s")
        
        # Base command
        command = ["yt-dlp.exe", url, "-o", output_template]

        if format_type == "mp3":
            # For MP3, extract audio only
            command += ["-x", "--audio-format", "mp3"]
            print("Download mode: Audio (MP3)")
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

        print(f"Running command: {' '.join(command)}")
        
        # Run the download with real-time output
        process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1
        )
        
        # Print output in real-time
        for line in process.stdout:
            print(line.strip())
        
        process.wait()
        
        if process.returncode != 0:
            raise Exception(f"yt-dlp failed with return code {process.returncode}")
        
        print(f"Download completed successfully!")
        
        # Find the downloaded file (it will have the session_id prefix)
        downloaded_files = glob.glob(os.path.join(temp_downloads_path, f"{session_id}_*"))
        print(f"Looking for files: {temp_downloads_path}\\{session_id}_*")
        print(f"Found files: {downloaded_files}")
        
        if not downloaded_files:
            print("ERROR: File not found after download")
            return jsonify({"status": "error", "message": "File not found after download. The video may not be available."}), 500
            
        # Get the original filename
        original_file = downloaded_files[0]
        original_filename = os.path.basename(original_file)
        print(f"Original filename: {original_filename}")
        
        # Sanitize the filename to remove special characters
        sanitized_filename = sanitize_filename(original_filename)
        print(f"Sanitized filename: {sanitized_filename}")
        
        # Rename the file to the sanitized version
        sanitized_file_path = os.path.join(temp_downloads_path, sanitized_filename)
        os.rename(original_file, sanitized_file_path)
        print(f"File renamed to: {sanitized_file_path}")
        
        return jsonify({
            "status": "success", 
            "message": "Download completed",
            "filename": sanitized_filename
        })
    except subprocess.CalledProcessError as e:
        error_msg = f"Download failed: {str(e)}"
        print(f"ERROR: subprocess failed: {e}")
        print(f"stderr: {e.stderr if hasattr(e, 'stderr') else 'No stderr'}")
        return jsonify({"status": "error", "message": error_msg}), 500
    except Exception as e:
        error_msg = str(e) if str(e) else "Unknown error occurred during download"
        print(f"ERROR: {type(e).__name__}: {error_msg}")
        return jsonify({"status": "error", "message": error_msg}), 500

@app.route("/video-info", methods=["POST"])
def video_info():
    """Fetch video information including thumbnail using yt-dlp"""
    data = request.get_json()
    url = data.get("url")
    
    if not url:
        return jsonify({"status": "error", "message": "Missing URL"}), 400
    
    try:
        # Use yt-dlp to get video info in JSON format
        command = ["yt-dlp.exe", "--dump-json", "--no-download", url]
        
        print(f"\n=== FETCHING VIDEO INFO ===")
        print(f"URL: {url}")
        
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=15
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
        
        # Extract thumbnail URL
        thumbnail_url = video_data.get("thumbnail", "")
        local_thumbnail = ""
        
        # Download thumbnail to our server to bypass CORS!
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
                
                # Use yt-dlp to download the thumbnail (it handles auth/cookies properly!)
                thumb_command = ["yt-dlp.exe", "--write-thumbnail", "--skip-download", "-o", 
                               os.path.join(temp_downloads_path, f"thumb_{session_id}"), url]
                
                print(f"Downloading thumbnail...")
                thumb_result = subprocess.run(thumb_command, capture_output=True, text=True, timeout=10)
                
                # Find the downloaded thumbnail file
                thumb_files = glob.glob(os.path.join(temp_downloads_path, f"thumb_{session_id}.*"))
                if thumb_files:
                    actual_thumbnail = os.path.basename(thumb_files[0])
                    local_thumbnail = f"/thumbnail/{actual_thumbnail}"
                    print(f"Thumbnail downloaded: {actual_thumbnail}")
                else:
                    print("Thumbnail download failed, will try direct URL")
                    local_thumbnail = thumbnail_url
                    
            except Exception as e:
                print(f"Thumbnail download error: {e}")
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
        
        info = {
            "status": "success",
            "title": video_data.get("title", "Unknown Title"),
            "duration": video_data.get("duration_string", "Unknown"),
            "thumbnail": local_thumbnail,
            "hasThumbnail": bool(local_thumbnail),
            "width": width,
            "height": height,
            "orientation": orientation
        }
        
        print(f"Title: {info['title']}")
        print(f"Duration: {info['duration']}")
        print(f"Dimensions: {width}x{height}")
        print(f"Orientation: {orientation}")
        print(f"Has thumbnail: {info['hasThumbnail']}")
        print(f"Thumbnail: {local_thumbnail}")
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
            except:
                pass
        
        return response
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=False)
