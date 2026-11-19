"""
build_gallery_manifest.py - read the gallery folder and write img/gallery/manifest.json

The website reads manifest.json to know which pictures exist. Run this after adding or
deleting pictures (GitHub also runs it automatically, see .github/workflows/gallery-manifest.yml).

Usage (from the website folder):
    py -3 tools/build_gallery_manifest.py                  (uses img/gallery)
    py -3 tools/build_gallery_manifest.py "some/other/folder"

File names:  <category><number>_<A|B|C>_<caption or credit>.jpg
    category : ex = exterior scenes, in = interior scenes, ob = objects, sk = sketches
    A = original picture, B = day render, C = night render (optional)
    N = night render shown FIRST (use N instead of C; the Day button then switches to B)
    e.g.  ex5_A_Villa.jpg  ex5_B_Villa.jpg  ex5_C_Villa.jpg
Highlights:  img/gallery/highlights.txt  - ids such as  sk18, ex5, in4  (one per line or comma
separated, in the order they should appear). Lines starting with # are ignored.

Only the Python standard library is used. Pictures are only read (to find their size), never changed.
"""
import hashlib
import json
import os
import re
import struct
import sys

CATS = ["ex", "in", "ob", "sk"]
CAT_NAMES = {"ex": "Exterior scenes", "in": "Interior scenes", "ob": "Objects", "sk": "Sketches"}
EXTS = (".jpg", ".jpeg", ".png", ".webp")
PATTERN = re.compile(r"^(ex|in|ob|sk)(\d+)_([ABCN])_(.+)$", re.I)
ID_RE = re.compile(r"^(ex|in|ob|sk)(\d+)$", re.I)
IGNORE = {"manifest.json", "highlights.txt", "captions.txt", "readme.txt", "readme.md", ".gitkeep", "desktop.ini", "thumbs.db"}


def image_size(path):
    """Return (width, height) of a JPEG, PNG or WebP file, or None. Reads only the file header."""
    try:
        with open(path, "rb") as f:
            head = f.read(32)
            if head[:8] == b"\x89PNG\r\n\x1a\n":
                return struct.unpack(">II", head[16:24])
            if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
                kind = head[12:16]
                if kind == b"VP8X":
                    return (1 + int.from_bytes(head[24:27], "little"), 1 + int.from_bytes(head[27:30], "little"))
                if kind == b"VP8 ":
                    w, h = struct.unpack("<HH", head[26:30])
                    return (w & 0x3FFF, h & 0x3FFF)
                if kind == b"VP8L":
                    b = head[21:25]
                    return (1 + (((b[1] & 0x3F) << 8) | b[0]), 1 + (((b[3] & 0xF) << 10) | (b[2] << 2) | ((b[1] & 0xC0) >> 6)))
                return None
            if head[:2] != b"\xff\xd8":
                return None
            f.seek(2)
            while True:
                byte = f.read(1)
                while byte and byte != b"\xff":
                    byte = f.read(1)
                while byte == b"\xff":
                    byte = f.read(1)
                if not byte:
                    return None
                marker = byte[0]
                if marker in (0xD8, 0x01) or 0xD0 <= marker <= 0xD7:
                    continue
                seg = f.read(2)
                if len(seg) < 2:
                    return None
                length = struct.unpack(">H", seg)[0]
                if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
                    data = f.read(5)
                    h, w = struct.unpack(">HH", data[1:5])
                    return (w, h)
                f.seek(length - 2, 1)
    except (OSError, struct.error, IndexError):
        return None


def content_version(folder, names):
    """Short fingerprint of the pictures' content. It changes whenever a picture is replaced or
    renamed onto another number, so browsers fetch the new picture instead of an old saved copy."""
    h = hashlib.sha1()
    for name in names:
        h.update(name.encode("utf-8"))
        with open(os.path.join(folder, name), "rb") as f:
            for chunk in iter(lambda: f.read(1 << 20), b""):
                h.update(chunk)
    return h.hexdigest()[:10]


def read_highlights(folder, known, warnings):
    path = os.path.join(folder, "highlights.txt")
    if not os.path.isfile(path):
        warnings.append("highlights.txt not found - the Highlights tab will show the first item of each tab.")
        return [], False
    with open(path, encoding="utf-8-sig", errors="replace") as f:
        text = "\n".join(line.split("#", 1)[0] for line in f)
    out = []
    for token in re.split(r"[\s,;]+", text):
        if not token:
            continue
        m = ID_RE.match(token)
        if not m:
            warnings.append(f"highlights.txt: '{token}' is not a valid id (expected e.g. ex5) - ignored")
            continue
        hid = m.group(1).lower() + str(int(m.group(2)))
        if hid not in known:
            warnings.append(f"highlights.txt: '{hid}' has no matching pictures (or no B picture) - ignored")
            continue
        if hid in out:
            warnings.append(f"highlights.txt: '{hid}' is listed twice - kept once")
            continue
        out.append(hid)
    return out, True


def read_captions(folder, warnings):
    """captions.txt: lines  id = caption  replace the caption taken from the file names."""
    path = os.path.join(folder, "captions.txt")
    out = {}
    if not os.path.isfile(path):
        return out
    with open(path, encoding="utf-8-sig", errors="replace") as f:
        for n, line in enumerate(f, 1):
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            key, sep, text = line.partition("=")
            m = ID_RE.match(key.strip())
            if not sep or not m or not text.strip():
                warnings.append(f"captions.txt line {n}: expected  id = caption  - ignored")
                continue
            out[m.group(1).lower() + str(int(m.group(2)))] = text.strip()
    return out


def build(folder):
    groups = {}          # id -> {"cat","n","A":[names],"B":[...],"C":[...]}
    unmatched, warnings = [], []
    for name in sorted(os.listdir(folder)):
        full = os.path.join(folder, name)
        if not os.path.isfile(full) or name.lower() in IGNORE or name.startswith("."):
            continue
        stem, ext = os.path.splitext(name)
        m = PATTERN.match(stem)
        if ext.lower() not in EXTS or not m:
            unmatched.append(name)
            continue
        cat, num, letter, cap = m.group(1).lower(), int(m.group(2)), m.group(3).upper(), m.group(4).strip()
        key = f"{cat}{num}"
        g = groups.setdefault(key, {"cat": cat, "n": num, "A": [], "B": [], "C": [], "N": []})
        g[letter].append((name, cap))

    over = read_captions(folder, warnings)
    items, no_b, dupes = [], [], []
    for key, g in groups.items():
        if g["N"]:
            if g["C"]:
                warnings.append(f"{key}: has both a C and an N night picture - using N (night shown first)")
            g["C"], night_first = g["N"], True
        else:
            night_first = False
        for letter in "ABC":
            if len(g[letter]) > 1:
                dupes.append(f"{key} {letter}: " + " | ".join(n for n, _ in g[letter]) + f"  -> using '{g[letter][0][0]}'")
        if not g["B"]:
            no_b.append(key + ("" if g["A"] else " (no A either)"))
            continue
        if not g["A"]:
            no_b.append(key + " (has B but no A original)")
            continue
        b_name, caption = g["B"][0]
        caps = {c for lst in (g["A"], g["B"], g["C"]) for _, c in lst}
        if key in over:
            caption = over[key]
        elif len(caps) > 1:
            warnings.append(f"{key}: files have different captions {sorted(caps)} - using the B caption")
        if key in over:
            over.pop(key)
        item = {"id": key, "cat": g["cat"], "n": g["n"], "caption": caption.replace("_", " ").strip(),
                "a": g["A"][0][0], "b": b_name}
        if g["C"]:
            item["c"] = g["C"][0][0]
            if night_first:
                item["nf"] = True
        item["v"] = content_version(folder, [item[k] for k in ("a", "b", "c") if k in item])
        size = image_size(os.path.join(folder, b_name))
        if size:
            item["w"], item["h"] = int(size[0]), int(size[1])
        else:
            warnings.append(f"{key}: could not read the picture size of '{b_name}'")
        items.append(item)

    for k in over:
        warnings.append(f"captions.txt: '{k}' has no matching pictures - ignored")
    items.sort(key=lambda it: (CATS.index(it["cat"]), it["n"]))
    known = {it["id"] for it in items}
    highlights, _ = read_highlights(folder, known, warnings)
    manifest = {"highlights": highlights, "items": items}
    return manifest, unmatched, no_b, dupes, warnings


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    folder = args[0] if args else os.path.join(here, "..", "img", "gallery")
    folder = os.path.normpath(folder)
    if not os.path.isdir(folder):
        print("Folder not found:", folder)
        sys.exit(1)

    manifest, unmatched, no_b, dupes, warnings = build(folder)
    text = json.dumps(manifest, indent=1, ensure_ascii=True) + "\n"
    out = os.path.join(folder, "manifest.json")
    old = None
    if os.path.isfile(out):
        with open(out, encoding="utf-8") as f:
            old = f.read()
    if old != text:
        with open(out, "w", encoding="utf-8", newline="\n") as f:
            f.write(text)
        status = "written"
    else:
        status = "unchanged"

    print("Gallery folder:", folder)
    print(f"manifest.json {status} - {len(manifest['items'])} items")
    print()
    print("Items per tab:")
    print(f"  {'Highlights':<17}{len(manifest['highlights']):>4}" +
          ("   " + ", ".join(manifest["highlights"]) if manifest["highlights"] else ""))
    for c in CATS:
        its = [it for it in manifest["items"] if it["cat"] == c]
        nights = sum(1 for it in its if "c" in it)
        nf = sum(1 for it in its if it.get("nf"))
        print(f"  {CAT_NAMES[c]:<17}{len(its):>4}   ({nights} with night view" + (f", {nf} showing night first" if nf else "") + ")")

    def section(title, rows):
        if rows:
            print()
            print(f"{title} ({len(rows)}):")
            for r in rows:
                print("  -", r)

    section("Ignored - no B (day render) or no A (original)", no_b)
    section("Duplicates", dupes)
    section("File names that do not match <id>_<A|B|C|N>_<caption>.jpg (ignored)", unmatched)
    section("Warnings", warnings)
    if not (no_b or dupes or unmatched or warnings):
        print()
        print("No problems found.")


if __name__ == "__main__":
    main()
