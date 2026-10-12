#!/usr/bin/env python3
"""Sample GHS-BUILT-H (average building height per 100 m, EU JRC, CC BY 4.0) over a city's box into a small JSON
grid for scripts/city/bake.mjs.  pip install rasterio numpy;  python3 heights.py <ghs.tif> s w n e out.json"""
import json, sys
import numpy as np, rasterio
from rasterio.windows import from_bounds
tif, s, w, n, e, out = sys.argv[1], *map(float, sys.argv[2:6]), sys.argv[6]
with rasterio.open(tif) as r:
    win = from_bounds(w, s, e, n, r.transform)
    a = r.read(1, window=win, boundless=True, fill_value=0).astype(float)
    t = r.window_transform(win)
a[a < 0] = 0
json.dump({'w': t.c, 'n': t.f, 'dx': t.a, 'dy': -t.e, 'cols': a.shape[1], 'rows': a.shape[0],
           'h': [round(v, 1) for v in a.ravel().tolist()],
           'source': 'GHS-BUILT-H ANBH 2018, European Commission JRC (CC BY 4.0)'}, open(out, 'w'), separators=(',', ':'))
print(a.shape, 'max', a.max(), 'mean', round(a[a > 0].mean(), 1))
