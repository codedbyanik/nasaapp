"""Compatibility entry point for the real-data route evaluation; requires Node."""
from pathlib import Path
import subprocess

if __name__ == '__main__':
    root = Path(__file__).resolve().parents[2]
    subprocess.run(['node', 'scripts/evaluation/evaluate_routes.cjs'], cwd=root, check=True)
