#!/usr/bin/env bash
# Rebuilds the vendored Motion/Stack Kit that Nobara copies into demo folders.
# Libs are NOT committed (700KB minified blobs) — this script re-fetches them.
# Kit lives in the shared demos dir so every agent workspace reaches it via the demos/ symlink.
set -euo pipefail
KIT="${1:-/home/hermes/.openclaw/demos-shared/_stack-kit}"
mkdir -p "$KIT/three" "$KIT/gsap" "$KIT/lenis"
curl -fsSL -o "$KIT/three/three.min.js"          https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js
curl -fsSL -o "$KIT/gsap/gsap.min.js"            https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js
curl -fsSL -o "$KIT/gsap/ScrollTrigger.min.js"   https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js
curl -fsSL -o "$KIT/lenis/lenis.min.js"          https://cdn.jsdelivr.net/npm/lenis@1.3.24/dist/lenis.min.js
curl -fsSL -o "$KIT/lenis/lenis.min.css"         https://cdn.jsdelivr.net/npm/lenis@1.3.24/dist/lenis.min.css
echo "Stack kit ready in $KIT:"; ls -lh "$KIT"/three/*.js "$KIT"/gsap/*.js "$KIT"/lenis/* | awk '{print $5, $9}'
# three r128 = UMD global THREE; gsap 3.12.5 = UMD global gsap + ScrollTrigger; lenis 1.3.24 = IIFE global Lenis.
# Guia: referencias/web-stack-motion.md
