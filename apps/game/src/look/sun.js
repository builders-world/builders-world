// Where the sun is for a place and a moment. NOAA's simplified solar position,
// accurate to a fraction of a degree, which is plenty for lighting a street.

const RAD = Math.PI / 180;

export function sunPosition(date, lat, lon) {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const t = (jd - 2451545) / 36525;
  const L0 = (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360;
  const M = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  const C = Math.sin(M * RAD) * (1.914602 - t * (0.004817 + 0.000014 * t))
    + Math.sin(2 * M * RAD) * (0.019993 - 0.000101 * t) + Math.sin(3 * M * RAD) * 0.000289;
  const trueLong = L0 + C;
  const omega = 125.04 - 1934.136 * t;
  const lambda = trueLong - 0.00569 - 0.00478 * Math.sin(omega * RAD);
  const eps0 = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos(omega * RAD);
  const decl = Math.asin(Math.sin(eps * RAD) * Math.sin(lambda * RAD));

  const y = Math.tan((eps / 2) * RAD) ** 2;
  const eqTime = 4 / RAD * (y * Math.sin(2 * L0 * RAD) - 2 * e * Math.sin(M * RAD)
    + 4 * e * y * Math.sin(M * RAD) * Math.cos(2 * L0 * RAD)
    - 0.5 * y * y * Math.sin(4 * L0 * RAD) - 1.25 * e * e * Math.sin(2 * M * RAD));

  const minutesUtc = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  const trueSolar = (minutesUtc + eqTime + 4 * lon + 1440) % 1440;
  const hourAngle = (trueSolar / 4 < 0 ? trueSolar / 4 + 180 : trueSolar / 4 - 180) * RAD;

  const latR = lat * RAD;
  const cosZen = Math.sin(latR) * Math.sin(decl) + Math.cos(latR) * Math.cos(decl) * Math.cos(hourAngle);
  const zenith = Math.acos(Math.max(-1, Math.min(1, cosZen)));
  const elevation = 90 - zenith / RAD;
  let azimuth = Math.acos(Math.max(-1, Math.min(1,
    (Math.sin(latR) * Math.cos(zenith) - Math.sin(decl)) / (Math.cos(latR) * Math.sin(zenith) || 1e-6)))) / RAD;
  azimuth = hourAngle > 0 ? (azimuth + 180) % 360 : (540 - azimuth) % 360; // degrees clockwise from north
  return { elevation, azimuth };
}

// World direction toward the sun. The map has north at -z and east at +x.
export function sunDirection(sun, out) {
  const el = sun.elevation * RAD, az = sun.azimuth * RAD;
  out.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
  return out;
}
