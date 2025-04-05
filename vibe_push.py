import os
import subprocess
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

GITHUB_USERNAME = os.getenv("GITHUB_USERNAME")
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
REPO = "https://github.com/Tryentist-1/wdv.git"
LOCAL_REPO_DIR = "."

def run(cmd, cwd=None):
    result = subprocess.run(cmd, cwd=cwd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print("❌ Error:", result.stderr)
    else:
        print(result.stdout)
    return result

def main():
    branch_name = f"feature/vibe-update-{datetime.now().strftime('%Y%m%d%H%M')}"
    print(f"📦 Creating new branch: {branch_name}")

    run(f"git checkout -b {branch_name}", cwd=LOCAL_REPO_DIR)
    run("git add .", cwd=LOCAL_REPO_DIR)
    run(f'git commit -m "Vibe update: {branch_name}"', cwd=LOCAL_REPO_DIR)
    remote_url = f"https://{GITHUB_USERNAME}:{GITHUB_TOKEN}@github.com/Tryentist-1/wdv.git"
    run(f"git push {remote_url} {branch_name}", cwd=LOCAL_REPO_DIR)

if __name__ == "__main__":
    main()
