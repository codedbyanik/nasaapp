# Saves Kaggle API key to %USERPROFILE%/.kaggle/kaggle.json
# Usage: $env:KAGGLE_USERNAME='you'; $env:KAGGLE_KEY='abc123...'; python data/setup_kaggle_auth.py
import os, json
u = os.environ.get("KAGGLE_USERNAME", "").strip()
k = os.environ.get("KAGGLE_KEY", "").strip()
if not u or not k:
    print("Set env vars first:")
    print("  $env:KAGGLE_USERNAME='your-username'; $env:KAGGLE_KEY='your-key'; python data/setup_kaggle_auth.py")
    raise SystemExit(1)
p = os.path.join(os.path.expanduser("~"), ".kaggle", "kaggle.json")
os.makedirs(os.path.dirname(p), exist_ok=True)
json.dump({"username": u, "key": k}, open(p, "w"))
print("wrote", p, "- now run: python data/download_kaggle.py")
