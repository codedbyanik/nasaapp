# Needs: pip install kaggle pandas pillow numpy
# Setup: place kaggle.json in %USERPROFILE%/.kaggle/ then run: python download_kaggle.py
import os
SETS = {
 "mars-surface-images": "markmbaum/mars-surface-images",
 "terrain-binary-underexposed": "sanjidh090/underexposed-mars-rover-images",
 "crater-study": "codebreaker619/mars-crater-study-dataset",
 "rems-weather": "deepcontractor/mars-rover-environmental-monitoring-station",
 "ai4mars-2026": "parthd144/ai4mars-dataset-june-2026",
}
os.makedirs("data/raw", exist_ok=True)
for folder, slug in SETS.items():
    out = f"data/raw/{folder}"
    print("="*60, "\n", slug, "->", out)
    os.system(f'python -m kaggle datasets download -d {slug} -p "{out}" --unzip')
print("Done. Keep data/raw immutable. Record product IDs in docs/DATA_CARDS.md.")
