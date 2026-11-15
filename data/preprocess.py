# Preprocess helpers (Roadmap §11: RAW immutable -> processed + manifest)
# pip install pandas pillow numpy
import os, glob, json
import pandas as pd
from PIL import Image, ImageOps

MAN = []
def underexposed_demo(inp="data/raw/terrain-binary-underexposed", out="data/processed/equalized"):
    os.makedirs(out, exist_ok=True)
    files = glob.glob(f"{inp}/**/*.jpg", recursive=True) + glob.glob(f"{inp}/**/*.png", recursive=True)
    for f in files[:20]:
        im = Image.open(f).convert("RGB")
        eq = ImageOps.equalize(im)
        p = os.path.join(out, os.path.basename(f))
        eq.save(p); MAN.append({"step":"equalize","in":f,"out":p})
    print(f"equalized {len(MAN)} samples -> {out} (Gate G1 evidence)")

def crater_filter(inp="data/raw/crater-study", out="data/processed/craters_jezero.csv"):
    fs = glob.glob(f"{inp}/**/*.csv", recursive=True)
    if not fs: print("no crater CSV yet — run download first"); return
    df = pd.read_csv(fs[0])
    print("crater columns:", list(df.columns))
    # try common lat/lon names; adjust after inspection
    lat = next((c for c in df.columns if "lat" in c.lower()), None)
    lon = next((c for c in df.columns if "lon" in c.lower()), None)
    if lat and lon:
        # wide window incl. Jezero rim (catalog >=1km; tight bbox misses Jezero at lon 77.702)
        q = df[(df[lat].between(17, 20)) & (df[lon].between(76, 79))]
        os.makedirs(os.path.dirname(out), exist_ok=True)
        q.to_csv(out, index=False)
        print(f"filtered {len(q)}/{len(df)} craters in Jezero region -> {out}")
        MAN.append({"step":"crater-filter","in":fs[0],"out":out,"n":len(q)})
    else:
        print("rename lat/lon manually; saved manifest only")

def rems_strip(inp="data/raw/rems-weather", out="data/processed/rems_daily.csv"):
    fs = glob.glob(f"{inp}/**/*.csv", recursive=True)
    if not fs: print("no REMS CSV yet"); return
    df = pd.read_csv(fs[0]); print("rems columns:", list(df.columns))
    os.makedirs(os.path.dirname(out), exist_ok=True)
    df.to_csv(out, index=False); print(f"copied REMS -> {out} (label Gale heritage in UI)")

if __name__ == "__main__":
    underexposed_demo(); crater_filter(); rems_strip()
    json.dump(MAN, open("data/processed/manifest.json","w"), indent=2)
    print("manifest -> data/processed/manifest.json")
