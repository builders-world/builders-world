// Cities as whole cities (Elvis, 11 October 2026: "rather than it being Yaba, let it just be Lagos. And let's have a mix
// of different areas in Lagos as well there, and popular landmarks... rather than it being Uyo, let it be Akwa Ibom...
// since Uyo is the capital, we'll use Uyo, but let it show other areas in Akwa Ibom as well"). Each city is a set of
// areas; each area is its own real patch of streets from OpenStreetMap (public/data/<slug>.json, baked with
// scripts/fetch-osm-api.mjs), with the famous places that are in or near it. The first area is where the city starts
// (and where the airport taxi and the city sheet bring you). Coordinates were looked up on OpenStreetMap (Nominatim);
// places that could not be found there are left out rather than guessed.
//
// Structure (lanes, crossings, streaming, animals, parks...) is the same in every area; what each area looks like
// comes from its own streets, its city's style (cityinfo.js) and its landmarks below.

export const REGIONS = {
  Lagos: {
    label: 'Lagos',
    areas: [
      { area: 'Yaba', lat: 6.5095, lon: 3.3715, r: 230, about: 'Yabacon Valley: CcHub, Yaba Tech and UNILAG down the road.' },
      { area: 'Ikeja', lat: 6.6080, lon: 3.3550, r: 230, about: 'The state capital: Ikeja City Mall, Alausa and Computer Village.',
        landmarks: [
          { key: 'icm', name: 'Ikeja City Mall', sub: 'Obafemi Awolowo Way · Alausa', lat: 6.61438, lon: 3.35777, kind: 'mall', w: 44, d: 24, storeys: 2, accent: 0xc8102e, cinema: true, cinemaName: 'FILMHOUSE', parking: 8, fact: 'Ikeja City Mall opened in 2011 on Obafemi Awolowo Way: Shoprite, the cinema, and half of Lagos on a Saturday.' },
          { key: 'secretariat', name: 'Lagos State Secretariat', sub: 'Alausa · Ikeja', lat: 6.61562, lon: 3.36074, kind: 'compound', accent: 0x2f6b4f, fact: "The Lagos State Government's seat at Alausa, with the House of Assembly and the governor's office." },
          { key: 'computer_village', name: 'Computer Village', sub: 'Otigba Street · Ikeja', lat: 6.59425, lon: 3.34022, kind: 'market', accent: 0x1f4f9a, fact: "West Africa's biggest phone and computer market: thousands of stalls round Otigba Street. Haggle hard." },
        ] },
      { area: 'Victoria Island', lat: 6.4300, lon: 3.4220, r: 230, about: 'Banks, embassies, the big hotels and Eko Atlantic rising on the sea.',
        landmarks: [
          { key: "reddington", name: "Reddington Hospital", sub: "Victoria Island", lat: 6.43301, lon: 3.42042, kind: 'hospital', storeys: 3, accent: 0x2f6b4f, fact: "A private hospital in Victoria Island, with emergency care and specialist clinics." },
          { key: 'eko_hotel', name: 'Eko Hotel and Suites', sub: 'Adetokunbo Ademola Street', lat: 6.42707, lon: 3.43029, kind: 'tower', storeys: 12, accent: 0x1f3d7a, fact: "Eko Hotel, on Adetokunbo Ademola: concerts, conferences and wedding receptions in the Expo Centre." },
          { key: 'federal_palace', name: 'Federal Palace Hotel', sub: 'Ahmadu Bello Way', lat: 6.43056, lon: 3.40737, kind: 'tower', storeys: 10, accent: 0xb8862b, fact: 'Opened in 1960 for independence, on Ahmadu Bello Way by the lagoon.' },
          { key: 'civic_centre', name: 'The Civic Centre', sub: 'Ozumba Mbadiwe Avenue', lat: 6.44018, lon: 3.43088, kind: 'theatre', accent: 0x2a9d94, fact: 'The Civic Centre by the lagoon: conferences, concerts and tech summits with a view of the Lekki-Ikoyi bridge.' },
          { key: 'tbs', name: 'Tafawa Balewa Square', sub: 'Lagos Island', lat: 6.44707, lon: 3.40151, kind: 'plaza', accent: 0x2f6b4f, fact: 'Where Nigeria marked independence in 1960. The horses and the eagles still stand at the gate.' },
        ],
        skyline: [{ key: 'eko_atlantic', name: 'Eko Atlantic', lat: 6.41305, lon: 3.41805, kind: 'twin', h: 110, color: 0x8fa6b8 }] },
      { area: 'Lekki Phase 1', lat: 6.4478, lon: 3.4741, r: 220, about: 'Admiralty Way, estates, start-ups and the bridge to Ikoyi.',
        landmarks: [
          { key: 'palms', name: 'The Palms Shopping Mall', sub: 'Lekki · Maroko', lat: 6.43598, lon: 3.45118, kind: 'mall', w: 40, d: 22, storeys: 2, accent: 0x2a9d94, cinema: true, parking: 8, fact: "The Palms, Lekki's first big mall: Shoprite, the cinema and the food court everyone meets at." },
        ],
        skyline: [{ key: 'eko_atlantic', name: 'Eko Atlantic', lat: 6.41305, lon: 3.41805, kind: 'twin', h: 110, color: 0x8fa6b8 }] },
      { area: 'Surulere', lat: 6.4985, lon: 3.3600, r: 230, about: 'Football and Nollywood: the National Stadium and Teslim Balogun.',
        landmarks: [
          { key: "randle", name: "Randle General Hospital", sub: "Surulere", lat: 6.50817, lon: 3.35748, kind: 'hospital', storeys: 3, accent: 0x2f6b4f, fact: "A Lagos State general hospital in Surulere." },
          { key: 'national_stadium', name: 'National Stadium', sub: 'Surulere · 1972', lat: 6.49714, lon: 3.36499, kind: 'stadium', accent: 0x2f6b4f, fact: 'Opened in 1972 for the All-Africa Games; the Super Eagles played here for decades.' },
          { key: 'teslim_balogun', name: 'Teslim Balogun Stadium', sub: 'Western Avenue', lat: 6.49977, lon: 3.36078, kind: 'stadium', accent: 0x1f4f9a, fact: "Named after the Nigerian footballer; home to Lagos's league games." },
          { key: 'national_theatre', name: 'National Arts Theatre', sub: 'Iganmu', lat: 6.47648, lon: 3.36949, kind: 'theatre', accent: 0x9b2f2f, fact: "The general's cap: built for FESTAC '77, Nigeria's home of theatre and the arts." },
        ] },
      { area: 'Lagos Island', lat: 6.4545, lon: 3.3900, r: 220, about: 'The old city: Balogun Market, Tinubu Square, the Marina.',
        landmarks: [
          { key: "massey", name: "Massey Street Children's Hospital", sub: "Lagos Island", lat: 6.45507, lon: 3.39224, kind: 'hospital', storeys: 3, accent: 0x2f6b4f, fact: "A hospital for children on Massey Street, Lagos Island." },
          { key: 'tinubu_square', name: 'Tinubu Square', sub: 'Lagos Island', lat: 6.45384, lon: 3.38944, kind: 'plaza', accent: 0x2f6b4f, fact: 'Named after Madam Efunroye Tinubu, the 19th-century trader and kingmaker. The fountain is at its heart.' },
          { key: 'cathedral', name: 'Cathedral Church of Christ', sub: 'Marina', lat: 6.45089, lon: 3.39021, kind: 'church', accent: 0x6b4a2f, fact: 'The Anglican cathedral on the Marina; the present building was finished in 1946.' },
          { key: 'central_mosque', name: 'Lagos Central Mosque', sub: 'Nnamdi Azikiwe Street', lat: 6.45738, lon: 3.38814, kind: 'mosque', accent: 0x2f6b4f, fact: 'The central mosque of Lagos Island, rebuilt in the 1980s with four minarets.' },
          { key: 'balogun', name: 'Balogun Market', sub: 'Lagos Island', lat: 6.4559, lon: 3.3890, kind: 'market', accent: 0xe46f4f, fact: 'Fabrics, shoes, everything: the market that fills the streets behind Tinubu Square.' },
        ] },
    ],
  },
  Uyo: {
    label: 'Akwa Ibom',
    areas: [
      { area: 'Uyo', lat: 5.0338, lon: 7.9270, r: 240, about: 'The capital: Ibom Plaza, the heart of Uyo.' },
      { area: 'Ring Road Uyo', name: 'Ring Road, Uyo', lat: 5.00637, lon: 7.88473, r: 230, about: 'Ring Road III and the Nest of Champions.',
        landmarks: [
          { key: 'akpabio_stadium', name: 'Godswill Akpabio International Stadium', sub: 'Nest of Champions · Ring Road III', lat: 5.00637, lon: 7.88473, kind: 'stadium', accent: 0x1f4f9a, fact: 'The 30,000-seat "Nest of Champions", opened in 2014, modelled on the Allianz Arena. The Super Eagles play here.' },
        ] },
      { area: 'Eket', lat: 4.6406, lon: 7.9339, r: 220, about: 'Oil town by the coast; the terminal at Ibeno lights the sky.',
        landmarks: [
          { key: 'eket_stadium', name: 'Eket Stadium', sub: 'Clinic Road · Afaha Eket', lat: 4.64065, lon: 7.93390, kind: 'stadium', accent: 0x2f6b4f, fact: "Eket's stadium on Clinic Road, home to local football." },
        ],
        skyline: [{ key: 'ibeno', name: 'Ibeno oil terminal flares', lat: 4.55801, lon: 8.10856, kind: 'flare' }] },
      { area: 'Ikot Ekpene', lat: 5.1795, lon: 7.7115, r: 220, about: 'The raffia city: crafts, the plaza and the township stadium.',
        landmarks: [
          { key: 'ikot_ekpene_plaza', name: 'Ikot Ekpene Plaza', sub: 'Ikot Obon Edon', lat: 5.17990, lon: 7.71200, kind: 'plaza', accent: 0x2f6b4f, fact: 'The plaza at the centre of Ikot Ekpene, the raffia city known for its weaving and masks.' },
          { key: 'ikot_ekpene_stadium', name: 'Ikot Ekpene Township Stadium', sub: 'Ikot Ekpene', lat: 5.17875, lon: 7.71024, kind: 'stadium', accent: 0x1f4f9a, fact: "The township stadium, a short walk from the plaza." },
        ] },
    ],
  },
  Abuja: {
    label: 'Abuja',
    areas: [
      { area: 'Wuse', lat: 9.0790, lon: 7.4700, r: 200, about: 'Wuse Market and the busy zones of the city.' },
      { area: 'Central Business District', lat: 9.0560, lon: 7.4920, r: 230, about: 'The National Mosque, the National Christian Centre and Aso Rock above it all.',
        landmarks: [
          { key: "limi", name: "Limi Children's Hospital", sub: "Abuja", lat: 9.07043, lon: 7.48659, kind: 'hospital', storeys: 3, accent: 0x2f6b4f, fact: "A hospital for children in Abuja." },
          { key: 'national_mosque', name: 'Abuja National Mosque', sub: 'Sani Abacha Way', lat: 9.0602, lon: 7.48979, kind: 'mosque', accent: 0xc9952a, fact: 'Finished in 1984: the golden dome and four minarets on Independence Avenue.' },
          { key: 'national_christian_centre', name: 'National Christian Centre', sub: 'Central Area', lat: 9.0484, lon: 7.49488, kind: 'church', accent: 0x1f3d7a, fact: "The ecumenical centre facing the National Mosque across the city's central axis, opened in 2005." },
          { key: 'millennium_park', name: 'Millennium Park', sub: 'Maitama', lat: 9.07156, lon: 7.49947, kind: 'park', accent: 0x2f6b4f, fact: "Abuja's largest park, designed by Manfredi Nicoletti and opened in 2003." },
        ],
        skyline: [{ key: 'aso_rock', name: 'Aso Rock', lat: 9.08039, lon: 7.53604, kind: 'rock', r: 700, h: 400, color: 0x77726a }] },
      { area: 'Jabi', lat: 9.0763, lon: 7.4255, r: 220, about: 'Jabi Lake and the mall on its shore.',
        landmarks: [
          { key: "arewa", name: "Arewa Specialist Hospital", sub: "Abuja", lat: 9.07288, lon: 7.41583, kind: 'hospital', storeys: 3, accent: 0x2f6b4f, fact: "A specialist hospital near Jabi." },
          { key: 'jabi_lake_mall', name: 'Jabi Lake Mall', sub: 'Bala Sokoto Way', lat: 9.07628, lon: 7.42548, kind: 'mall', w: 44, d: 24, storeys: 2, accent: 0x2a9d94, parking: 8, fact: 'Opened in 2015 on the shore of Jabi Lake: shops, the cinema and the lakeside walk.' },
        ],
        skyline: [{ key: 'aso_rock', name: 'Aso Rock', lat: 9.08039, lon: 7.53604, kind: 'rock', r: 700, h: 400, color: 0x77726a }] },
    ],
  },
  'Port Harcourt': {
    label: 'Port Harcourt',
    areas: [
      { area: 'Old GRA', lat: 4.7737, lon: 7.0142, r: 200, about: 'The Garden City: the old Government Reservation Area and Isaac Boro Park.' },
      { area: 'Rumuola', lat: 4.8375, lon: 7.0115, r: 220, about: 'The Pleasure Park on the Aba Expressway.',
        landmarks: [
          { key: "ph_military", name: "Military Hospital", sub: "Port Harcourt", lat: 4.82607, lon: 7.00497, kind: 'hospital', storeys: 3, accent: 0x2f6b4f, fact: "The military hospital in Port Harcourt." },
          { key: 'pleasure_park', name: 'Port Harcourt Pleasure Park', sub: 'Aba Expressway · Rumuola', lat: 4.83751, lon: 7.01151, kind: 'park', accent: 0x2a9d94, fact: 'Opened in 2019 on the Aba Expressway: lakes, rides, a zip line and Sunday picnics.' },
        ] },
      { area: 'Trans-Amadi', lat: 4.8180, lon: 7.0360, r: 220, about: 'The industrial layout: oil service yards and the power plant.',
        landmarks: [
          { key: "nobsams", name: "NOBSAMS Hospital", sub: "Port Harcourt", lat: 4.82888, lon: 7.03672, kind: 'hospital', storeys: 3, accent: 0x2f6b4f, fact: "A hospital near the Trans-Amadi layout." },
          { key: 'trans_amadi_power', name: 'Trans Amadi Power Plant', sub: 'Trans-Amadi Industrial Layout', lat: 4.81611, lon: 7.03159, kind: 'compound', accent: 0x55605a, fact: 'The gas-fired power station in the Trans-Amadi industrial layout.' },
          { key: 'oginigba_police', name: 'Oginigba Police Division', sign: 'NIGERIA POLICE FORCE', sub: 'Trans-Amadi', lat: 4.82015, lon: 7.04120, kind: 'police', accent: 0x1f3d7a, fact: 'The police division on the Trans-Amadi Industrial Layout Road.' },
        ] },
    ],
  },
  Nairobi: {
    label: 'Nairobi',
    areas: [
      { area: 'Kilimani', lat: -1.2905, lon: 36.7855, r: 200, about: 'Leafy Kilimani and its start-ups off Argwings Kodhek.' },
      { area: 'City Centre', lat: -1.2860, lon: 36.8230, r: 220, about: 'KICC, the Jamia Mosque, the Archives and Uhuru Park.',
        landmarks: [
          { key: "mater", name: "Mater Hospital", sub: "Nairobi", lat: -1.28805, lon: 36.82729, kind: 'hospital', storeys: 3, accent: 0x2f6b4f, fact: "The Mater Misericordiae Hospital, a mission hospital in Nairobi." },
          { key: 'kicc_here', name: 'KICC', sub: 'Kenyatta International Convention Centre', lat: -1.28809, lon: 36.82326, kind: 'tower', storeys: 28, accent: 0xa47055, fact: "Opened in 1973: the cylinder tower and the saucer on top, Nairobi's best-known building." },
          { key: 'jamia', name: 'Jamia Mosque', sub: 'Banda Street', lat: -1.28362, lon: 36.82069, kind: 'mosque', accent: 0x2f6b4f, fact: "Nairobi's main mosque, built in 1906 and later enlarged, with its silver domes off Kimathi Street." },
          { key: 'archives', name: 'Kenya National Archives', sub: 'Tom Mboya Street', lat: -1.28499, lon: 36.82595, kind: 'compound', accent: 0x9b2f2f, fact: 'The old Bank of India building on Tom Mboya Street, now the national archives and a gallery.' },
          { key: 'uhuru_park', name: 'Uhuru Park', sub: 'City Centre', lat: -1.28995, lon: 36.81672, kind: 'park', accent: 0x2f6b4f, fact: 'Freedom Park: rowing boats on the lake and rallies on the lawns, saved from a tower block by Wangari Maathai.' },
        ] },
      { area: 'Westlands', lat: -1.2590, lon: 36.8025, r: 220, about: 'Malls, offices and nightlife: Sarit Centre and Westgate.',
        landmarks: [
          { key: 'sarit', name: 'Sarit Centre', sub: 'Westlands', lat: -1.2609, lon: 36.80183, kind: 'mall', w: 40, d: 24, storeys: 3, accent: 0x2a9d94, fact: 'Opened in 1983, one of the first malls in Nairobi.' },
          { key: 'westgate', name: 'Westgate Mall', sub: 'Mwanzi Road', lat: -1.25678, lon: 36.80319, kind: 'mall', w: 36, d: 22, storeys: 4, accent: 0x1f3d7a, fact: 'Rebuilt and reopened in 2015 on Mwanzi Road.' },
        ] },
    ],
  },
  Accra: {
    label: 'Accra',
    areas: [
      { area: 'Osu', lat: 5.5560, lon: -0.1830, r: 200, about: 'Oxford Street, the castle and the sea.' },
      { area: 'Accra Central', lat: 5.5480, lon: -0.2000, r: 230, about: 'Independence Square, Makola Market and the Nkrumah Memorial.',
        landmarks: [
          { key: "nyaho", name: "Nyaho Medical Centre", sub: "Accra", lat: 5.55149, lon: -0.20394, kind: 'hospital', storeys: 3, accent: 0x2f6b4f, fact: "A private medical centre in Accra." },
          { key: 'black_star', name: 'Black Star Square', sub: 'Independence Square', lat: 5.54742, lon: -0.19256, kind: 'plaza', accent: 0xce1126, fact: 'Built in 1961, the parade ground of the nation, where Independence Day is marched; the Black Star Gate stands over it.' },
          { key: 'independence_arch', name: 'Independence Arch', sub: 'Black Star Square', lat: 5.54647, lon: -0.19241, kind: 'arch', accent: 0xfcd116, fact: 'The arch on Black Star Square, marking freedom and justice since 1961.' },
          { key: 'makola', name: 'Makola Market', sub: 'Kojo Thompson Avenue', lat: 5.54807, lon: -0.20693, kind: 'market', accent: 0xe46f4f, fact: "Accra's great market, run by its market queens: cloth, food, pots, everything." },
          { key: 'nkrumah_park', name: 'Kwame Nkrumah Memorial Park', sub: 'Accra Central', lat: 5.54474, lon: -0.20299, kind: 'park', accent: 0x2f6b4f, fact: "Where Nkrumah declared independence; his mausoleum and statue stand in the gardens." },
          { key: 'national_theatre_gh', name: 'National Theatre', sub: 'Ridge', lat: 5.55367, lon: -0.20059, kind: 'theatre', accent: 0x9b2f2f, fact: 'Opened in 1992, its roof shaped like sails. Plays, concerts and the National Symphony.' },
        ] },
      { area: 'Airport City', lat: 5.6040, lon: -0.1730, r: 220, about: 'Offices and hotels by Kotoka, and the Accra Mall up the road.',
        landmarks: [
          { key: "nyaho_clinic", name: "Nyaho Clinic", sub: "Airport Residential", lat: 5.61448, lon: -0.18489, kind: 'hospital', storeys: 3, accent: 0x2f6b4f, fact: "A clinic near Airport City, Accra." },
          { key: 'accra_mall', name: 'Accra Mall', sub: 'Spintex Road', lat: 5.62218, lon: -0.17294, kind: 'mall', w: 44, d: 24, storeys: 2, accent: 0xce1126, cinema: true, parking: 8, fact: "Opened in 2008 at the Tetteh Quarshie interchange, Ghana's first big mall." },
        ] },
    ],
  },
};

/** the region (city with its areas) for a city name */
export const regionOf = (city) => REGIONS[city] || null;
/** what to call the city on screen: "Akwa Ibom" for Uyo, the city's own name elsewhere */
export const cityLabel = (city) => REGIONS[city]?.label || city;
/** one area of a city by its name (or slug), or the city's first area */
export function areaOf(city, name) {
  const R = REGIONS[city]; if (!R) return null;
  const k = String(name || '').toLowerCase();
  return R.areas.find((a) => a.area.toLowerCase() === k || (a.name || '').toLowerCase() === k) || null;
}
/** an area's own display name (Ring Road, Uyo), else its key */
export const areaName = (a) => a?.name || a?.area || '';
/** the page address that loads an area */
export const areaUrl = (city, a) => `?world=1&city=${encodeURIComponent(city)}&name=${encodeURIComponent(a.area)}&lat=${a.lat}&lon=${a.lon}&r=${a.r}`;
/** distance in km between two points */
export function kmBetween(a, b) {
  const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}
/** the taxi fare across town: a base and so much a kilometre */
export const areaFare = (km) => Math.round((300 + km * 120) / 50) * 50;
/** the compass bearing (radians, from north toward east) from one point to another */
export function bearing(a, b) {
  const r = Math.PI / 180;
  return Math.atan2(Math.sin((b.lon - a.lon) * r) * Math.cos(b.lat * r), Math.cos(a.lat * r) * Math.sin(b.lat * r) - Math.sin(a.lat * r) * Math.cos(b.lat * r) * Math.cos((b.lon - a.lon) * r));
}
