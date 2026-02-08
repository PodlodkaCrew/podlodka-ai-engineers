# Curve Ticker Animation — Design Rules & Decisions

## Overview

`curve-ascii-v2.html` contains `CurveTickerAnimation` — a self-contained module that detects prominent curves in a photo and animates a ticker phrase along them. It is designed to work with any photo of a person (portrait, headshot, etc.) against a dark background.

## Public API

```js
const anim = CurveTickerAnimation.apply(imgElement, {
    phrase: "YOU'RE ABSOLUTELY RIGHT",  // text to scroll
    tickerSpeed: 12,       // character-slots per second
    pauseTime: 0.6,        // seconds gap between curves
    fontSize: 14,
    color: { r: 255, g: 119, b: 0 },
    onStatus: (msg) => {}, // optional status callback
});

anim.stop();   // stop the animation
anim.resize(); // re-fit overlay after layout change
```

All options have sensible defaults. The function creates an overlay `<canvas>` on top of the image automatically (or uses a provided one).

## Animation Rules

### Ticker Behaviour
- The entire curve is treated as **one continuous line** of character slots.
- Each slot is one evenly-spaced point along the curve path.
- The phrase scrolls through these slots like a ticker/marquee — it enters from one end and exits the other.
- **Only one phrase is visible at a time** on the whole image. Never show the phrase wrapping or appearing in multiple places.
- **Only one curve is animated at a time.** When the phrase finishes scrolling through one curve, there's a brief pause, then a different random curve is picked.

### Text Direction
- Curve points are always normalized to flow **left-to-right** before rendering, so text reads naturally regardless of how the contour was scanned.

### Character Placement
- Characters are placed **directly on the detected curve edge** — never in the interior, never off the contour.
- Each character occupies one sampled point, spaced at `charWidth` intervals along the curve path.

### No Opacity Effects
- No shimmering, no fade-in/fade-out. Characters are rendered at full opacity (`alpha = 1.0`).
- The glow effect uses two passes: a soft outer glow and a sharp inner pass.

## Curve Detection Rules

### Pipeline
1. **Grayscale** → **Gaussian blur** (sigma 1.5) → **Otsu threshold** → **multi-directional contour scan**
2. Curves are **smoothed** (moving-average, window 11).
3. Curves are **split at sharp turns** (>40° direction change). Each sub-curve may have at most 1 turn.
4. Only **horizontal** curves are kept (width/height ratio > 1.4).

### What Counts as a Valid Curve
- Must have **≥40 smoothed points** after detection.
- Must have **≥20 character slots** after sampling at display scale.
- Must have **no bend sharper than 50°** anywhere along the sampled path. Sharp angles make text unreadable.
- Must be **predominantly horizontal** (width/height > 1.4). Exception: glasses curves are allowed at ratio ≥ 1.0.

### Contour Sources (scanned from 4 directions + internal edges)
| Source | Direction | Edge Inset | Notes |
|---|---|---|---|
| Head arc | Top-down | +8px down | Limited to top 22% of head region |
| Left contour | Left-to-right | +8px right | Split into upper/lower halves |
| Right contour | Right-to-left | +8px left | Split into upper/lower halves |
| Bottom contour | Bottom-up | +8px up | Limited to bottom 25% |
| Glasses (top) | Gradient-based | — | Horizontal bright→dark transitions in face region |
| Glasses (bottom) | Gradient-based | — | Horizontal dark→bright transitions in face region |

### Edge Inset
All silhouette-scanned contours are shifted **8px inward** from the first above-threshold pixel. This aligns characters precisely on the visible edge rather than floating above it.

### Glasses Detection
- Searches the face region (20–50% down from silhouette top, near-full width).
- Finds y-rows with the most consistent vertical gradients (bright→dark for top edge, dark→bright for bottom edge).
- Relaxed silhouette check: includes dark pixels (the glasses frame itself).
- Glasses curves skip turn-splitting (frames have many small bends that are fine visually).

## Tuning Parameters

| Parameter | Default | Purpose |
|---|---|---|
| `blurSigma` | 1.5 | Lower = tighter edges, higher = smoother but less precise |
| `edgeInset` | 8 | Push contour points inward to sit on visible edge |
| `smoothWindow` | 11 | Curve smoothing. Higher = smoother but may lose detail |
| `minCurvePoints` | 40 | Reject tiny contour fragments |
| `horizontalRatio` | 1.4 | Minimum width/height to qualify as "horizontal" |
| `turnAngleDeg` | 40 | Threshold for splitting curves at direction changes |
| `minSampledSlots` | 20 | Reject curves too short for readable text |
| `maxBendDeg` | 50 | Reject curves with any sharp bend (unreadable text) |
| `tickerSpeed` | 12 | How fast the phrase scrolls (chars/sec) |
| `pauseTime` | 0.6 | Gap between curve animations |

## Code Architecture

```
CurveTickerAnimation (IIFE module)
├── Image Processing
│   ├── toGrayscale()
│   ├── gaussianBlur()
│   └── otsuThreshold()
├── Curve Utilities
│   ├── smoothCurve()
│   ├── computeBBox()
│   └── sampleCurvePoints()
├── Turn Detection
│   ├── findTurns()
│   └── splitByTurns()
├── Contour Scanning
│   ├── findContours()      — 4-direction silhouette scan
│   └── findGlassesEdges()  — internal gradient-based detection
├── Detection Pipeline
│   └── detectCurves()      — orchestrates the full pipeline
├── Animation
│   ├── prepareCurveSlots() — scale, orient, sample, filter
│   └── runTickerLoop()     — requestAnimationFrame ticker
└── Public API
    └── apply(img, opts)    — entry point, returns {stop, resize}
```

## Key Design Decisions

1. **Point-based rendering** (not row-based). Characters are placed at individual (x, y) points sampled along the curve path. Earlier row-based approaches caused issues with text appearing off-edge or wrapping across multiple lines.

2. **All suitable curves are detected**, sorted by length. The animation randomly cycles through them one at a time — no pre-selection or limit on count.

3. **No code snippets** — uses a configurable phrase. The phrase content is passed as an option and can be changed without touching the detection/animation logic.

4. **The module is self-contained** with zero dependencies. It only needs a loaded `<img>` element. The overlay canvas and processing canvas are created automatically if not provided.
