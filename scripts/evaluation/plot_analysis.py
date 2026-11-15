"""Export study figures from the reproducible routing evaluation."""
import json
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'data/processed/nasa'
report = json.loads((OUT / 'comparison_report.json').read_text())
grid = json.loads((OUT / 'terrain_grid.json').read_text())
fig, axes = plt.subplots(1, 2, figsize=(11, 4.5), constrained_layout=True)
x = np.arange(len(report['results']))
for offset, mode, label, color in [(-.18, 'baseline', 'Distance-only', '#d6aa49'), (.18, 'terrain_aware', 'Terrain-aware', '#287f9e')]:
    axes[0].bar(x+offset, [r[mode]['d'] for r in report['results']], .35, label=label, color=color)
    axes[1].bar(x+offset, [r[mode]['meanSlope'] for r in report['results']], .35, label=label, color=color)
for ax in axes:
    ax.set_xticks(x, ['Landing–delta', 'Crater floor', 'Western terrain'])
    ax.grid(axis='y', alpha=.2)
    ax.set_axisbelow(True)
axes[0].set_ylabel('One-way route distance (km)')
axes[1].set_ylabel('Distance-weighted mean DEM slope (degrees)')
axes[0].legend(frameon=False)
fig.suptitle('Jezero route comparison: real CTX elevation, shared 20° exclusion policy')
fig.savefig(OUT / 'route_comparison.png', dpi=180)
plt.close(fig)

fig, ax = plt.subplots(figsize=(10, 6), constrained_layout=True)
b = grid['bbox']
values = np.array(grid['slope_mean_deg'], dtype=float)
im = ax.imshow(values, origin='upper', extent=[b['lon0'], b['lon1'], b['lat0'], b['lat1']], cmap='terrain', vmin=0, vmax=25, aspect=1/np.cos(np.deg2rad(18.45)))
for mode, label, color in [('baseline_path', 'Distance-only', '#ffe163'), ('terrain_aware_path', 'Terrain-aware', '#2a97df')]:
    ll = np.array(report['results'][0][mode])
    ax.plot(ll[:,1], ll[:,0], color=color, linewidth=2, linestyle='--' if mode=='baseline_path' else '-', label=label)
ax.set_xlabel('East-positive longitude (degrees)')
ax.set_ylabel('Planetocentric latitude (degrees)')
ax.set_title('Mean slope derived from native 20 m CTX DEM; displayed on ~100 m cells')
fig.colorbar(im, ax=ax, label='Mean slope (degrees)')
ax.legend()
fig.savefig(OUT / 'slope_and_routes.png', dpi=180)
plt.close(fig)
print('Saved route_comparison.png and slope_and_routes.png')
