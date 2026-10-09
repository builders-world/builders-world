// Live weather for the street, from Open-Meteo (free, no key, CC BY 4.0).
// Location is city level: the home city chosen at arrivals, or the district itself.
// A visitor can opt in to their own location, rounded to about 10 km and kept on this device.

const CITIES = {
  Abuja: { lat: 9.0765, lon: 7.3986 },
  Uyo: { lat: 5.0377, lon: 7.9128 },
  'Port Harcourt': { lat: 4.8156, lon: 7.0498 },
};

const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* storage unavailable */ } },
};

const LABELS = {
  0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast', 45: 'Fog', 48: 'Fog',
  51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle', 56: 'Freezing drizzle', 57: 'Freezing drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 66: 'Freezing rain', 67: 'Freezing rain',
  71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow grains',
  80: 'Rain showers', 81: 'Heavy showers', 82: 'Violent showers', 85: 'Snow showers', 86: 'Snow showers',
  95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Thunderstorm with hail',
};
// how hard it rains for a given code, before looking at measured amounts
const CODE_RAIN = { 51: 0.15, 53: 0.25, 55: 0.35, 61: 0.4, 63: 0.6, 65: 0.85, 80: 0.5, 81: 0.75, 82: 1, 95: 0.8, 96: 0.9, 99: 1 };

// Test and demo presets: ?wx=clear|cloudy|drizzle|rain|storm|fog|haze
const PRESETS = {
  clear: { code: 0, cloud: 0.1, rain: 0, wet: 0, wind: 2, fog: 0 },
  cloudy: { code: 3, cloud: 0.95, rain: 0, wet: 0.1, wind: 4, fog: 0.1 },
  drizzle: { code: 53, cloud: 0.85, rain: 0.25, wet: 0.6, wind: 3, fog: 0.15 },
  rain: { code: 63, cloud: 1, rain: 0.65, wet: 1, wind: 5, fog: 0.25 },
  storm: { code: 95, cloud: 1, rain: 1, wet: 1, wind: 12, fog: 0.35 },
  fog: { code: 45, cloud: 0.7, rain: 0, wet: 0.3, wind: 1, fog: 1 },
  haze: { code: 2, cloud: 0.3, rain: 0, wet: 0, wind: 3, fog: 0.55 },
};

const clamp01 = (v) => Math.max(0, Math.min(1, v));

export function rainFrom(code, mmPerHour) {
  const byRate = mmPerHour <= 0.02 ? 0 : clamp01(0.15 + Math.log10(1 + mmPerHour) * 0.6);
  return code in CODE_RAIN ? Math.max(CODE_RAIN[code], byRate) : byRate;
}

// Streets dry the way they do outside: recent rain counts most, and sun dries faster than night.
export function wetFrom(hourly, nowRain, isDay) {
  const tau = isDay ? 2 : 3.5;
  let w = 0;
  hourly.forEach(({ hoursAgo, mm }) => { w += mm * Math.exp(-Math.max(0, hoursAgo) / tau); });
  return clamp01(Math.max(w / 0.6, nowRain > 0 ? 0.55 + 0.45 * nowRain : 0));
}

export function fogFrom(code, visibility) {
  if (code === 45 || code === 48) return 1;
  if (visibility == null) return 0;
  if (visibility < 1000) return 1;
  if (visibility < 5000) return 0.55;
  if (visibility < 10000) return 0.25;
  return 0;
}

export function createWeather({ district, profile, query }) {
  const listeners = new Set();
  const preset = PRESETS[query.get('wx')];
  const wxloc = (query.get('wxloc') || '').split(',').map(Number);
  let state = null;
  let timer = 0;

  function where() {
    if (wxloc.length === 2 && wxloc.every(Number.isFinite)) return { lat: wxloc[0], lon: wxloc[1], label: 'Test location', how: 'test' };
    const mine = store.get('bw-wx-geo');
    if (mine) return { ...mine, label: 'Your area', how: 'your location' };
    const city = profile?.city && CITIES[profile.city];
    if (city) return { ...city, label: profile.city, how: 'home city' };
    return { lat: district.lat, lon: district.lon, label: district.name, how: 'district' };
  }

  // local time at the weather's location, or a test clock from ?hour=19.5
  const hourParam = query.get('hour');
  function now() {
    if (hourParam == null || !state) return new Date();
    const h = +hourParam;
    const local = new Date(Date.now() + state.utcOffset * 1000);
    local.setUTCHours(Math.floor(h), Math.round((h % 1) * 60), 0, 0);
    return new Date(local.getTime() - state.utcOffset * 1000);
  }

  function emit() { listeners.forEach((fn) => fn(state)); }

  async function refresh() {
    const loc = where();
    const lat = +loc.lat.toFixed(2), lon = +loc.lon.toFixed(2);
    const key = `bw-wx-cache-${lat},${lon}`;
    let data = store.get(key);
    if (!data || Date.now() - data.at > 10 * 60 * 1000) {
      try {
        const url = 'https://api.open-meteo.com/v1/forecast'
          + `?latitude=${lat}&longitude=${lon}`
          + '&current=temperature_2m,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m,is_day,visibility'
          + '&hourly=precipitation&past_hours=6&forecast_hours=1&timezone=auto&wind_speed_unit=ms';
        const ctl = new AbortController();
        const t = setTimeout(() => ctl.abort(), 8000);
        const res = await fetch(url, { signal: ctl.signal });
        clearTimeout(t);
        if (!res.ok) throw new Error(`weather ${res.status}`);
        data = { at: Date.now(), json: await res.json() };
        store.set(key, data);
      } catch {
        data = data || null; // keep a stale copy rather than nothing
      }
    }

    if (!data) {
      state = { source: 'offline', loc, code: 2, label: 'Weather unavailable', tempC: null, rain: 0, wet: 0, cloud: 0.4,
        wind: { speed: 3, dir: 200 }, fog: 0.1, storm: false, utcOffset: 3600, at: Date.now() };
    } else {
      const j = data.json, c = j.current;
      const mmPerHour = (c.precipitation || 0) * (3600 / (c.interval || 900));
      const rain = rainFrom(c.weather_code, mmPerHour);
      const nowMs = Date.now();
      const hourly = (j.hourly?.time || []).map((t, i) => ({
        hoursAgo: (nowMs - (Date.parse(`${t}:00Z`) - j.utc_offset_seconds * 1000)) / 3.6e6,
        mm: j.hourly.precipitation[i] || 0,
      }));
      state = {
        source: 'live', loc, code: c.weather_code, label: LABELS[c.weather_code] || 'Unknown', tempC: c.temperature_2m,
        rain, wet: wetFrom(hourly, rain, !!c.is_day), cloud: clamp01((c.cloud_cover ?? 0) / 100),
        wind: { speed: c.wind_speed_10m ?? 2, dir: c.wind_direction_10m ?? 200, gust: c.wind_gusts_10m },
        fog: fogFrom(c.weather_code, c.visibility), storm: c.weather_code >= 95,
        utcOffset: j.utc_offset_seconds, at: data.at,
      };
    }
    if (preset) {
      Object.assign(state, {
        source: 'preset', code: preset.code, label: LABELS[preset.code], rain: preset.rain, wet: preset.wet,
        cloud: preset.cloud, fog: preset.fog, storm: preset.code >= 95, wind: { speed: preset.wind, dir: 220 },
      });
    }
    emit();
  }

  function start() {
    refresh();
    clearInterval(timer);
    timer = setInterval(refresh, 10 * 60 * 1000); // Open-Meteo updates every 15 minutes
  }

  function useMyLocation() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(false); return; }
      navigator.geolocation.getCurrentPosition((p) => {
        store.set('bw-wx-geo', { lat: Math.round(p.coords.latitude * 10) / 10, lon: Math.round(p.coords.longitude * 10) / 10 });
        refresh().then(() => resolve(true));
      }, () => resolve(false), { enableHighAccuracy: false, maximumAge: 3600000, timeout: 10000 });
    });
  }
  function forgetMyLocation() { store.del('bw-wx-geo'); return refresh(); }

  function localTime() {
    const off = state?.utcOffset ?? 3600;
    const d = new Date(now().getTime() + off * 1000);
    return d.toISOString().slice(11, 16);
  }

  return {
    start, refresh, now, localTime, useMyLocation, forgetMyLocation,
    get state() { return state; },
    onChange(fn) { listeners.add(fn); if (state) fn(state); return () => listeners.delete(fn); },
    dispose() { clearInterval(timer); listeners.clear(); },
  };
}
