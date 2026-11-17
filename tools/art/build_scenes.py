"""Regenerates the sample-story base scenes in src/art/scenes/ (cover + 8 story scenes).

Usage: python3 tools/art/build_scenes.py
Needs only the Python 3 standard library. The six art styles are applied at runtime by
src/art/styles.ts, so this script only draws the plain scenes.
"""
import os

from scenes import SCENES

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "src", "art", "scenes")
NAMES = ["cover"] + [f"scene{i}" for i in range(1, len(SCENES))]


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, build in zip(NAMES, SCENES):
        path = os.path.join(OUT, f"{name}.svg")
        with open(path, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(build() + "\n")
        print(f"{os.path.relpath(path, ROOT)}  {os.path.getsize(path) // 1024} KB")


if __name__ == "__main__":
    main()
