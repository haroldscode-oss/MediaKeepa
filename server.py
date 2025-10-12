from flask import Flask, request, jsonify, send_from_directory, send_file
import subprocess
import os
import webbrowser
import glob
import uuid
from pathlib import Path

app = Flask(__name__)

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
            # For MP4, use best quality with ffmpeg merging (now that we have ffmpeg)
            if quality:
                # Get best video at requested quality + best audio, merge with ffmpeg
                format_string = f"bestvideo[height<={quality}]+bestaudio/best[height<={quality}]/best"
                command += ["-f", format_string, "--merge-output-format", "mp4"]
                print(f"Download mode: Video (MP4) - Quality: {quality}p with ffmpeg merging")
            else:
                # If no quality specified, get best
                command += ["-f", "bestvideo+bestaudio/best", "--merge-output-format", "mp4"]
                print("Download mode: Video (MP4) - Quality: Best available with ffmpeg merging")

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
            
        # Get the filename (just the name, not full path)
        filename = os.path.basename(downloaded_files[0])
        print(f"Returning filename: {filename}")
        
        return jsonify({
            "status": "success", 
            "message": "Download completed",
            "filename": filename
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
