"""Convenience launcher that builds the frontend (if needed) and starts the Flask server."""
from __future__ import annotations

import argparse
import os
import subprocess
import sys
import time
import webbrowser
from pathlib import Path
from typing import Iterable

import requests

ROOT_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = ROOT_DIR / "spark-template"
DIST_DIR = FRONTEND_DIR / "dist"
DEFAULT_URL = "http://127.0.0.1:5000"
PING_URL = f"{DEFAULT_URL}/ping"


def latest_mtime(paths: Iterable[Path]) -> float:
    latest = 0.0
    for path in paths:
        if path.is_file():
            latest = max(latest, path.stat().st_mtime)
        elif path.is_dir():
            for child in path.rglob("*"):
                if child.is_file():
                    latest = max(latest, child.stat().st_mtime)
    return latest


def should_build(force: bool = False) -> bool:
    if force:
        return True

    index_file = DIST_DIR / "index.html"
    if not index_file.exists():
        return True

    dist_mtime = latest_mtime([DIST_DIR])

    sources = [
        FRONTEND_DIR / "src",
        FRONTEND_DIR / "package.json",
        FRONTEND_DIR / "pnpm-lock.yaml",
        FRONTEND_DIR / "yarn.lock",
        FRONTEND_DIR / "package-lock.json",
        FRONTEND_DIR / "tailwind.config.js",
        FRONTEND_DIR / "vite.config.ts",
        FRONTEND_DIR / "tsconfig.json",
        FRONTEND_DIR / "components.json",
    ]
    source_mtime = latest_mtime([path for path in sources if path.exists()])

    return source_mtime > dist_mtime


def run_frontend_build() -> None:
    print("🛠  Building frontend with npm run build ...")
    subprocess.run(["npm", "run", "build"], cwd=FRONTEND_DIR, check=True)


def start_server_env() -> subprocess.Popen:
    env = os.environ.copy()
    env.setdefault("PYTHONUNBUFFERED", "1")
    print("🚀 Starting Flask server ...")
    return subprocess.Popen([sys.executable, "server.py"], cwd=ROOT_DIR, env=env)


def wait_for_server(timeout: float = 30.0) -> bool:
    start = time.time()
    while time.time() - start < timeout:
        try:
            response = requests.get(PING_URL, timeout=3)
            if response.status_code == 200:
                return True
        except requests.RequestException:
            pass
        time.sleep(1)
    return False


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build frontend (if needed) and start the Flask server on port 5000.")
    parser.add_argument("--force-build", action="store_true", help="Always rebuild the frontend before starting.")
    parser.add_argument("--no-browser", action="store_true", help="Do not open the browser automatically.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    try:
        if should_build(force=args.force_build):
            run_frontend_build()
        else:
            print("✅ Frontend build is up to date.")
    except subprocess.CalledProcessError as exc:
        print(f"❌ Frontend build failed with exit code {exc.returncode}.")
        return exc.returncode

    server_process = start_server_env()

    try:
        if not args.no_browser:
            if wait_for_server():
                print(f"🌐 Opening {DEFAULT_URL} in your default browser ...")
                webbrowser.open(DEFAULT_URL)
            else:
                print("⚠️  Server did not respond to /ping within the timeout.")

        return server_process.wait()
    except KeyboardInterrupt:
        print("\n🛑 Stopping server ...")
        server_process.terminate()
        try:
            return server_process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            server_process.kill()
            return server_process.wait()
    finally:
        if server_process.poll() is None:
            server_process.terminate()


if __name__ == "__main__":
    sys.exit(main())
