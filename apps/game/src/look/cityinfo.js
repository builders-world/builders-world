// What makes each city itself (Elvis, 10 October 2026: "it's showing Yaba, Yaba Fitness inside Nairobi, which
// makes no sense... this game has to be relatable"). One entry per city: the names of the places you walk
// into, the shops and stalls on the street, how people get about, the police, the street signs, the
// greetings, and the real landmarks with where they really are (landmarks.js pulls each into the district on
// the side it really lies). Researched from OpenStreetMap, Wikipedia and the places' own pages, 10 October 2026.
// Yaba's landmarks are modelled one by one in landmarks.js; the others are built from kits by kind (landkit.js).

const LAGOS = {
  city: 'Lagos', district: 'Yaba', country: 'Nigeria',
  places: {
    hub: 'Yaba Creative Hub', loft: 'Lagos Builders Loft', studio: 'Yaba Design Studio', cafe: 'Kofo Cafe', gym: 'Yaba Fitness',
    bank: 'Yaba Builders Bank', immigration: 'Yaba Immigration Centre',
  },
  wifi: { cafe: ['KofoCafe-Guest', 'flatwhite'], gym: ['YabaFitness', 'nopainnogain'], loft: ['BuildersLoft', 'shiplagos'], bank: ['YBB-Customer', 'buildersbank'] },
  shops: [
    ['Iya Bose Provisions', 'Iya Bose waves you in. Bread, Milo, sachet water, everything for a long night of shipping.'],
    ['Femi Phone Repairs', 'Screens, batteries, charging ports. A cracked phone is fixed while you wait.'],
    ['Yaba Print and Bind', 'Pitch decks, CVs and hackathon posters, printed before the generator goes off.'],
    ['Mama Nkechi Kitchen', 'Jollof, plantain and a long bench where builders argue about frameworks.'],
    ['Gadget Corner', 'Chargers, cables, adapters and a power bank for every budget.'],
    ['Kofo Cafe', 'Good coffee, slow wifi, and the best people-watching on the street.'],
  ],
  stalls: [
    ['Suya spot', 'The grill is on. Suya is better after a deploy.'],
    ['Fruit stall', 'Oranges, pineapple and garden eggs, peeled while you wait.'],
    ['Recharge and POS', 'Airtime, data and a POS for when the bank app is down.'],
    ['Corn and coconut', 'Roasted corn and fresh coconut by the roadside.'],
  ],
  park: { name: 'Yaba Motor Park', vehicles: 'danfo', line: 'Danfos load here: "Oshodi! Obalende! CMS!" Pay the conductor, sit tight.' },
  police: { name: 'Yaba Police Division', force: 'NIGERIA POLICE FORCE', sub: 'Lagos State Command · Yaba Division', color: '#1f3d7a', line: 'Good day. If you see something, tell us. And no climbing estate walls.' },
  bikes: 'Yaba Bikes',
  streetSign: { bg: '#1f6b45', fg: '#ffffff' },
  greet: ['Bawo ni!', 'How far?', 'E kaaro!', 'Welcome o!'],
  board: { jobs: 'Product designer at a fintech, React Native at a logistics startup, Rust contractor', week: 'Demo night Thursday 7pm. Rust study group, room 2. Design crit at Eko on Saturday.' },
  landmarks: null, // modelled one by one (landmarks.js)
};

const ABUJA = {
  // the residents: the same lives as Yaba's, lived by this city's people (lives.js)
  cast: [
    {name: "Ibrahim Danjuma", spouse: "Zainab", kids: [], dream: "Ship a fintech app his mum in Kano can use without calling him"},
    {name: "Aisha Mohammed", spouse: "Kabir", kids: ["Maryam"], dream: "Open a design school in Wuse for girls"},
    {name: "Tunde Bakare", spouse: "Bisi", kids: ["Tobi", "Kemi"]},
    {name: "Ngozi Eze", spouse: null, kids: []},
    {name: "Usman Garba", spouse: "Hadiza", kids: ["Ahmad"], dream: "Three suya spots, one in Maitama"},
    {name: "Blessing Okoro", spouse: null, kids: ["Chinedu", "Ada", "Obi"]},
    {name: "Yakubu Sani", spouse: null, kids: [], job: "University of Abuja student"},
    {name: "Grace Adeyemi", spouse: "Femi", kids: []},
    {name: "Musa Ibrahim", spouse: "Hauwa", kids: ["Aisha", "Umar", "Sani"]},
    {name: "Hauwa Abdullahi", spouse: null, kids: [], dream: "A playground on every street in Wuse"},
    {name: "Emeka Nwosu", spouse: "Adaeze", kids: ["Chuka"], job: "Taxi driver", dream: "Own the taxi instead of renting it"},
    {name: "Halima Yusuf", spouse: null, kids: ["Rukayya", "Bilal"]},
  ],
  babies: ["Fatima", "Maryam", "Ahmad", "Zara", "Hauwa", "David", "Amina", "Yusuf"],
  city: 'Abuja', district: 'Wuse', country: 'Nigeria',
  // Wuse II's side streets are named after African cities
  estates: ['Aminu Kano Court', 'Embu Gardens', 'Monrovia Close', 'Parakou Court', 'Banjul Gardens', 'Dar es Salaam Mews', 'Conakry Court', 'Sokode Gardens', 'Oda Close', 'Kumasi Court', 'Malabo Gardens', 'Ahmadu Bello Mews', 'Blantyre Court', 'Atbara Gardens', 'Ladi Kwali Close', 'Adetokunbo Court'],
  rides: { danfo: { name: 'City bus', sign: 'BUS', sub: 'STOP', color: '#2c7a3f', paint: 0x2c7a3f }, keke: null }, // no kekes in the city centre
  places: {
    hub: 'Wuse Creative Hub', loft: 'Abuja Builders Loft', studio: 'Wuse Design Studio', cafe: 'Aminu Kano Cafe', gym: 'Wuse II Fitness',
    bank: 'Capital Builders Bank', immigration: 'Wuse Immigration Centre',
  },
  wifi: { cafe: ['AKCafe-Guest', 'crescent2'], gym: ['WuseFitness', 'liftheavy'], loft: ['AbujaLoft', 'shipabuja'], bank: ['CBB-Customer', 'buildersbank'] },
  shops: [
    ['Banex Phone Doctor', 'Screens and batteries done while you wait, the Banex way.'],
    ['Zone 4 Provisions', 'Bread, sachet water and Indomie for a long night of shipping.'],
    ['Wuse Print and Bind', 'Pitch decks and proposals, bound before your meeting at the ministry.'],
    ['Mama Ngozi Kitchen', 'Pounded yam, egusi and a long bench where builders argue about frameworks.'],
    ['Crescent Gadgets', 'Chargers, power banks and laptop bags for every budget.'],
    ['Aminu Kano Cafe', 'Coffee on the Crescent, and the best people-watching in Wuse 2.'],
  ],
  stalls: [
    ['Suya and masa', 'Suya with yaji and masa off the griddle. Abuja does it best.'],
    ['Boli stand', 'Roast plantain with groundnut, hot from the coals.'],
    ['Zobo and kunu', 'Cold zobo and kunu in bottles, for the Abuja heat.'],
    ['Recharge and POS', 'Airtime, data and a POS for when the bank app is down.'],
  ],
  park: { name: 'Banex Junction Taxi Park', kind: 'taxi', word: 'taxi', sub: 'Berger · Garki · Wuse Market · CBD · Maitama', crew: ['Driver', 'Dispatcher', 'Taxi union'],
    calls: ['Berger! Berger! One person!', 'Garki, Area 1, drop!', 'Wuse Market, Wuse Market!', 'CBD, Secretariat!', 'Maitama, who dey go?'],
    line: 'Green and white Abuja taxis wait here, and the big AUMTCO buses stop by the footbridge. No kekes in the city centre.' },
  traffic: { mix: ['saloon', 'saloon', 'saloon', 'hatch', 'suv', 'suv', 'pickup', 'taxi', 'taxi', 'taxi', 'brt', 'saloon', 'suv'],
    paint: { taxi: [0x2e8b57, 0x2e8b57, 0x3a9a64], brt: [0x2c7a3f] }, brt: 'AUMTCO  WUSE - BERGER' },
  police: { name: 'Wuse Police Division', force: 'NIGERIA POLICE FORCE', sub: 'FCT Police Command · Wuse Division', color: '#1f3d7a', line: 'Good day. Keep to the walkways, and use the footbridge at Banex.' },
  bikes: 'Wuse Bikes',
  streetSign: { bg: '#1f6b45', fg: '#ffffff' },
  greet: ['Sannu!', 'Ina kwana?', 'How far?', 'Barka da yamma!'],
  board: { jobs: 'Govtech product manager, Flutter developer at a fintech, data analyst for an NGO', week: 'Demo night at SeedBuilders Thursday 6pm. Python study group, room 2. Design crit Saturday.' },
  landmarks: [
    { key: 'wuse_market', name: 'Wuse Market', lat: 9.0686, lon: 7.4660, kind: 'market', sub: 'Wuse Zone 5', accent2: '#2f7d4f', fact: "Abuja's biggest open market, in Wuse Zone 5: fabrics, foodstuff, electronics and serious haggling." },
    { key: 'national_mosque', name: 'Abuja National Mosque', lat: 9.0604, lon: 7.4894, kind: 'mosque', dome: 0xd4a52a, minarets: 4, minaretH: 30, sub: 'Since 1984', fact: 'Built in 1984: its golden dome is one of the most recognisable sights in Abuja.' },
    { key: 'banex', name: 'Banex Plaza', lat: 9.0839, lon: 7.4689, kind: 'mall', storeys: 3, color: 0xe7dfcf, accent: 0xc0392b, sub: 'Phones · Laptops · Repairs', fact: "Wuse 2's go-to spot for phones, laptops and repairs: around 500 shops on Aminu Kano Crescent." },
    { key: 'wuse_hospital', name: 'Wuse General Hospital', lat: 9.0628, lon: 7.4690, kind: 'hospital', storeys: 3, accent: 0x2f7d4f, sub: 'FCT Health · Open 24 hours', fact: 'Public general hospital in Wuse Zone 3, open 24 hours and running since 1990.' },
    { key: 'silverbird', name: 'Silverbird Entertainment Centre', sign: 'Silverbird', lat: 9.0676, lon: 7.4855, kind: 'mall', storeys: 4, color: 0xd9dde2, accent: 0x6d2077, sub: 'Cinemas · Shops', fact: 'Shops downstairs and a 12-screen Silverbird cinema upstairs: a classic Abuja Friday night out.' },
    { key: 'continental', name: 'Abuja Continental Hotel', lat: 9.0633, lon: 7.4843, kind: 'hotel', storeys: 14, accent: 0x3a3a3a, sub: 'Wuse Zone 4 · formerly the Sheraton', fact: 'Locals still call it Sheraton: renamed Abuja Continental Hotel in 2023, at 1 Ladi Kwali Street.' },
    { key: 'hilton', name: 'Transcorp Hilton', lat: 9.0750, lon: 7.4949, kind: 'hotel', storeys: 10, w: 30, color: 0xeee9df, accent: 0x1b365d, sub: 'Abuja · Since 1987', fact: "Opened in 1987 as the NICON Hilton: about 670 rooms and many of Abuja's biggest events." },
    { key: 'nnpc', name: 'NNPC Towers', lat: 9.0546, lon: 7.4855, kind: 'office', storeys: 16, glass: 0x5c8fb0, accent: 0x0b6b3a, sub: 'Herbert Macaulay Way', fact: "Four matching towers on Herbert Macaulay Way: the national oil company's headquarters." },
    { key: 'millennium_park', name: 'Millennium Park', lat: 9.0716, lon: 7.5001, kind: 'park', sub: 'Opened 2003', fact: "Abuja's largest public park, opened by Queen Elizabeth II in December 2003." },
    { key: 'christian_centre', name: 'National Christian Centre', lat: 9.0518, lon: 7.4951, kind: 'church', towerH: 26, accent: 0xe9e4d8, sub: 'Dedicated 2005', fact: 'White arches and one tall central spire, dedicated in October 2005.' },
  ],
  skyline: [
    { key: 'aso_rock', name: 'Aso Rock', lat: 9.0833, lon: 7.5341, kind: 'rock', r: 700, h: 400, color: 0x77726a },
    { key: 'wtc', name: 'World Trade Center Abuja', lat: 9.0494, lon: 7.4734, kind: 'twin', h: 120, color: 0x8fa6b8 },
  ],
};


const ACCRA = {
  // the residents: the same lives as Yaba's, lived by this city's people (lives.js)
  cast: [
    {name: "Kwame Mensah", spouse: "Akosua", kids: [], dream: "Ship a MoMo app his mum can use without calling him"},
    {name: "Ama Owusu", spouse: "Kojo", kids: ["Esi"], dream: "Open a design school in Osu for girls"},
    {name: "Kofi Asante", spouse: "Abena", kids: ["Yaw", "Afia"], dream: "Roast his own Ghanaian-grown coffee"},
    {name: "Efua Boateng", spouse: null, kids: []},
    {name: "Nii Armah", spouse: "Naa", kids: ["Nii Kpakpo"], job: "Kelewele seller", dream: "Three kelewele spots, one at Labadi"},
    {name: "Comfort Addo", spouse: null, kids: ["Kweku", "Adwoa", "Kwabena"]},
    {name: "Yaw Darko", spouse: null, kids: [], job: "University of Ghana student"},
    {name: "Grace Ansah", spouse: "Kwesi", kids: []},
    {name: "Ibrahim Issah", spouse: "Fati", kids: ["Amina", "Abdul", "Rashid"], dream: "Send Amina to medical school"},
    {name: "Naa Adjeley Quaye", spouse: null, kids: [], dream: "A playground on every street in Osu"},
    {name: "Kojo Antwi", spouse: "Adjoa", kids: ["Kwaku"], job: "Trotro mate", dream: "Own the trotro instead of renting it"},
    {name: "Ama Sarpong", spouse: null, kids: ["Akua", "Kofi"]},
  ],
  babies: ["Kofi", "Ama", "Esi", "Kwame", "Akosua", "Yaw", "Afia", "Naa"],
  city: 'Accra', district: 'Osu', country: 'Ghana',
  estates: ['Salem Court', 'Mission Street Gardens', 'Lokko Close', 'Basel Court', 'Kuku Hill Gardens', 'Nmetsobu Close', 'Abebrese Court', 'Clark Street Mews', 'Harry Sawyer Gardens', 'Asafoatse Court', 'Castle Road Villas', 'Danquah Gardens', 'Ojeine Close', 'Awuletey Court', 'Esther Ocloo Gardens', 'Annie Jiagge Court'],
  rides: { danfo: { name: 'Trotro', sign: 'TROTRO', sub: 'STOP', color: '#2b5aa8', paint: 0xf2f2ee }, keke: null },
  places: {
    hub: 'Osu Creative Hub', loft: 'Accra Builders Loft', studio: 'Osu Design Studio', cafe: "Auntie Ama's Cafe", gym: 'Osu Fitness',
    bank: 'Gold Coast Builders Bank', immigration: 'Osu Immigration Centre',
  },
  wifi: { cafe: ['AuntieAma-Guest', 'sobolo'], gym: ['OsuFitness', 'nopainnogain'], loft: ['AccraLoft', 'shipaccra'], bank: ['GCBB-Customer', 'buildersbank'] },
  shops: [
    ['God Is Able Provisions', 'Bread, Milo, sachet water and a cold Malta for a long night of shipping.'],
    ['Blessed Hands Phone Repairs', 'Screens, batteries and charging ports, fixed while you wait.'],
    ['Osu Print and Bind', 'Pitch decks and CVs printed before the lights go off.'],
    ['Auntie Akos Chop Bar', 'Fufu, light soup and a long bench where builders argue about frameworks.'],
    ['MoMo Corner', 'Mobile money in and out, airtime and data. The yellow umbrella on every block.'],
    ["Auntie Ama's Cafe", 'Good coffee, slow wifi, and the best people-watching on Oxford Street.'],
  ],
  stalls: [
    ['Kelewele', 'Spiced fried plantain, hot from the pan. Better after dark.'],
    ['Waakye', 'Rice and beans with shito, gari, spaghetti and an egg.'],
    ['FanIce bicycle', 'FanMilk, FanIce and FanYogo from the cool box on the back.'],
    ['MoMo and recharge', 'Mobile money and airtime, under the yellow umbrella.'],
  ],
  cafeMenu: ['Sobolo 300', 'Kelewele 350', 'Meat pie 400', 'Bofrot 150'],
  park: { name: 'Osu Trotro Station', kind: 'danfo', word: 'trotro', sub: 'Circle · Kaneshie · Madina · Labadi · 37', crew: ['Mate', 'Driver', 'Station master'],
    calls: ['Circle! Circle! Circle!', 'Kaneshie! Kaneshie!', 'Madina, Madina, we dey go!', 'Labadi! Teshie! Nungua!', '37! 37! One more!'],
    line: 'Trotros load here. The mate calls the stop; draw a circle in the air if you want Circle.' },
  police: { name: 'Osu Police Station', force: 'GHANA POLICE SERVICE', sub: 'Accra Region · Osu Station', color: '#1b2f5c', flag: 0xce1126, line: 'Good day. Mind the gutters, and enjoy Oxford Street.' },
  bikes: 'Osu Bikes',
  streetSign: { bg: '#1b4f8a', fg: '#ffffff' }, // design choice: no source on Accra's plate colours
  greet: ['Ɛte sɛn?', 'Akwaaba!', 'Ojekoo!', 'Charley, how far?'],
  board: { jobs: 'Mobile money engineer, Django developer at a fintech, product designer at an agritech', week: 'Demo night at Impact Hub Thursday 6pm. JavaScript study group, room 2. Design crit at Kukun on Saturday.' },
  traffic: { mix: ['saloon', 'saloon', 'hatch', 'suv', 'pickup', 'taxi', 'taxi', 'taxi', 'danfo', 'danfo', 'danfo', 'saloon', 'hatch', 'suv'],
    paint: { taxi: [0xf0a030, 0xf2b33d], danfo: [0xf2f2ee, 0xdadad4, 0x2b5aa8, 0xf2f2ee, 0xc0392b] },
    routes: ['CIRCLE', 'KANESHIE', 'MADINA', 'LABADI - TESHIE', '37 - OSU', 'TEMA STATION', 'NUNGUA', 'ACCRA CENTRAL'] },
  landmarks: [
    { key: 'osu_castle', name: 'Osu Castle', sub: 'Christiansborg · 1661', lat: 5.5474, lon: -0.1833, kind: 'castle', fact: 'Danes bought the land from the Ga king in 1661 and built Christiansborg. Later, the seat of government.' },
    { key: 'black_star_gate', name: 'Black Star Gate', sub: 'Independence Square', lat: 5.5490, lon: -0.1929, kind: 'arch', star: true, w: 22, h: 14, fact: 'Black Star Square, finished in 1961: its stands seat about 30,000 for the Independence Day parade.' },
    { key: 'ebenezer', name: 'Ebenezer Presbyterian Church', sub: 'Osu · since 1847', lat: 5.5542, lon: -0.1846, kind: 'church', color: 0xa5553a, accent: 0x7a3a2a, spire: false, towerH: 24, fact: 'Basel Mission congregation from 1847; the chapel and its 85 ft tower went up in 1898 to 1902.' },
    { key: 'oxford_mall', name: 'Oxford Street Mall', sub: 'Osu', lat: 5.5605, lon: -0.1826, kind: 'mall', storeys: 3, accent: 0xc0392b, fact: "Osu's modern multi-level mall, right on Oxford Street." },
    { key: 'frankies', name: "Frankie's", sub: 'Hotel · Restaurant · Oxford Street', lat: 5.5611, lon: -0.1821, kind: 'hotel', storeys: 5, w: 16, d: 12, accent: 0x8a1c1c, fact: "An Oxford Street landmark since the 1990s. 'Meet me at Frankie's.'" },
    { key: 'osu_police', name: 'Osu Police Station', sign: 'Ghana Police Service', sub: 'Osu Station · 28th February Road', lat: 5.5521, lon: -0.1778, kind: 'police', accent: 0x1b2f5c, flag: 0xce1126, fact: "Osu's 24-hour police station on 28th February Road, near the coast." },
    { key: 'koala', name: 'Koala Shopping Centre', sign: 'Koala', sub: 'Supermarket · Danquah Circle', lat: 5.5660, lon: -0.1807, kind: 'mall', storeys: 2, w: 24, accent: 0x2f7d4f, fact: "Osu's best-known imported-goods supermarket, at the top of Oxford Street." },
    { key: 'nkrumah_park', name: 'Kwame Nkrumah Memorial Park', sub: 'Mausoleum · 1992', lat: 5.5447, lon: -0.2030, kind: 'park', feature: 'statue', accent: 0x1f1f1f, fact: 'On the old Polo Grounds, where Nkrumah declared independence on 6 March 1957.' },
    { key: 'ridge_hospital', name: 'Ridge Hospital', sub: 'Greater Accra Regional Hospital', lat: 5.5621, lon: -0.1989, kind: 'hospital', storeys: 6, accent: 0x1b6f8a, fact: 'Began around 1928; the new 420-bed building has run since 2017.' },
    { key: 'national_theatre', name: 'National Theatre', sub: 'Ghana · 1992', lat: 5.5537, lon: -0.2006, kind: 'theatre', fact: 'Handed over on 30 December 1992: white sweeping wings and a 1,500-seat auditorium.' },
    { key: 'kempinski', name: 'Kempinski Gold Coast City', lat: 5.5538, lon: -0.1966, kind: 'hotel', storeys: 7, w: 30, accent: 0x6b5a3a, fact: 'Opened in late 2015 on Gamel Abdul Nasser Avenue: 269 rooms and suites.' },
  ],
  skyline: [
    { key: 'wtc_accra', name: 'World Trade Centre Accra', lat: 5.5562, lon: -0.2005, kind: 'tower', h: 60, w: 16, color: 0x8fa6b8 },
    { key: 'accra_stadium', name: 'Accra Sports Stadium', lat: 5.5515, lon: -0.1923, kind: 'stadium', r: 90 },
  ],
};

const NAIROBI = {
  // the residents: the same lives as Yaba's, lived by this city's people (lives.js)
  cast: [
    {name: "Kevin Otieno", spouse: "Achieng", kids: [], dream: "Ship an M-Pesa app his mum can use without calling him"},
    {name: "Wanjiru Kamau", spouse: "Brian", kids: ["Zawadi"], dream: "Open a design school in Kilimani for girls"},
    {name: "Juma Mwangi", spouse: "Njeri", kids: ["Baraka", "Imani"], dream: "Roast his own coffee from Kiambu"},
    {name: "Faith Chebet", spouse: null, kids: [], dream: "Speak at a conference in Lagos"},
    {name: "Peter Kiprop", spouse: "Mercy", kids: ["Kibet"], job: "Smokie and mutura vendor", dream: "Three snack carts, one at Yaya"},
    {name: "Esther Wairimu", spouse: null, kids: ["Wambui", "Kariuki", "Nyambura"], job: "Duka owner"},
    {name: "Dennis Ochieng", spouse: null, kids: [], job: "University of Nairobi student"},
    {name: "Grace Akinyi", spouse: "Collins", kids: []},
    {name: "Hassan Abdi", spouse: "Amina", kids: ["Fatuma", "Omar", "Ali"], dream: "Send Fatuma to medical school"},
    {name: "Akinyi Odhiambo", spouse: null, kids: [], dream: "A playground on every street in Kilimani"},
    {name: "Moses Kiptoo", spouse: "Joy", kids: ["Ian"], job: "Matatu makanga", dream: "Own the matatu instead of renting it"},
    {name: "Ruth Njoki", spouse: null, kids: ["Wanjiku", "Mwangi"]},
  ],
  babies: ["Zawadi", "Baraka", "Imani", "Neema", "Amani", "Wanjiku", "Otieno", "Achieng"],
  city: 'Nairobi', district: 'Kilimani', country: 'Kenya', drive: 'left', // Kenya keeps left
  estates: ['Lenana Court', 'Wood Avenue Gardens', 'Cotton Avenue Villas', 'Kirichwa Gardens', 'Rose Avenue Court', 'Dennis Pritt Mews', 'Kindaruma Court', 'Gitanga Gardens', 'Chania Villas', 'Galana Court', 'Ring Road Apartments', 'Jabavu Gardens', 'Elgeyo Marakwet Court', 'Menelik Gardens', 'Argwings Villas', 'Marcus Garvey Court'],
  rides: { danfo: { name: 'Matatu', sign: 'MATATU', sub: 'STAGE', color: '#6a2c91', paint: 0x6a2c91 }, keke: null },
  places: {
    hub: 'Kilimani Creative Hub', loft: 'Nairobi Builders Loft', studio: 'Kilimani Design Studio', cafe: "Mama Wanjiku's Cafe", gym: 'Kilimani Fitness',
    bank: 'Savannah Builders Bank', immigration: 'Kilimani Immigration Centre',
  },
  wifi: { cafe: ['MamaWanjiku-Guest', 'chaimasala'], gym: ['KilimaniFitness', 'nopainnogain'], loft: ['NairobiLoft', 'shipnairobi'], bank: ['SBB-Customer', 'buildersbank'] },
  shops: [
    ['Wanjiru Provisions', 'Bread, milk in a packet and a soda for a long night of shipping.'],
    ['Kim Phone Repairs', 'Screens, batteries and charging ports, sorted while you wait.'],
    ['Kilimani Print and Bind', 'Pitch decks and CVs printed and bound before your meeting.'],
    ['Mama Atieno Kibanda', 'Ugali, sukuma wiki and nyama choma, and a bench where builders argue about frameworks.'],
    ['Mobile Money Agent', 'Deposit, withdraw, airtime and bundles. The green sign on every block.'],
    ["Mama Wanjiku's Cafe", 'Kenyan coffee, slow wifi, and the best people-watching on Argwings Kodhek.'],
  ],
  stalls: [
    ['Smokie pasua', 'A smokie split and filled with kachumbari. The Nairobi snack.'],
    ['Mahindi choma', 'Maize roasted on a jiko, rubbed with lemon and chilli.'],
    ['Fruit cart', 'Mango and pineapple, cut while you wait.'],
    ['Mobile money and bundles', 'Airtime, bundles and mobile money, under the green umbrella.'],
  ],
  cafeMenu: ['Kenya AA coffee 300', 'Chai 150', 'Mandazi 100', 'Samosa 120'],
  park: { name: 'Yaya Centre Stage', kind: 'danfo', word: 'matatu', sub: 'Route 46 · Town · Kawangware · Ngong Road', crew: ['Makanga', 'Dere', 'Stage manager'],
    calls: ['Town, town! Kencom!', 'Kawangware, 46! Panda!', 'Yaya, Yaya, tunaenda!', 'Ngong Road: Adams, Prestige!', 'Fifty bob, fifty bob, panda!'],
    line: 'Matatus load at the stage: route 46 to town and Kawangware, Ngong Road matatus at Prestige and Adams.' },
  police: { name: 'Kilimani Police Station', force: 'NATIONAL POLICE SERVICE', sub: 'Kenya Police Service · Kilimani Division', color: '#14306b', flag: 0xbb0000, line: 'Habari. Walk safe, and keep your phone in your pocket at the stage.' },
  bikes: 'Kilimani Bikes',
  streetSign: { bg: '#f4f4f0', fg: '#111111' }, // black on white, as Kenya's road design manual has it
  greet: ['Sasa!', 'Niaje?', 'Mambo?', 'Karibu!'],
  board: { jobs: 'Mobile money API engineer, React developer at a logistics startup, product designer at a fintech', week: 'Demo night at Nairobi Garage Thursday 6pm. Go study group, room 2. Design crit on Saturday.' },
  traffic: { mix: ['saloon', 'saloon', 'hatch', 'suv', 'suv', 'pickup', 'taxi', 'danfo', 'danfo', 'danfo', 'danfo', 'saloon', 'hatch'],
    paint: { danfo: [0x1a1a1a, 0x6a2c91, 0xd62828, 0x1d7874, 0xf4a261, 0x2b2d42] },
    routes: ['46 · KAWANGWARE', '111 · NGONG', 'TOWN · KENCOM', '46 · YAYA', '111 · PRESTIGE', 'RAILWAYS', '46 · VALLEY RD'] },
  landmarks: [
    { key: 'yaya', name: 'Yaya Centre', sub: 'Argwings Kodhek Road · since 1992', lat: -1.2931, lon: 36.7878, kind: 'mall', storeys: 3, w: 32, accent: 0x7a1f2b, fact: "Opened in 1992: one of Kenya's first malls, and still 'meet me at Yaya'." },
    { key: 'kilimani_primary', name: 'Kilimani Primary School', lat: -1.2930, lon: 36.7833, kind: 'school', accent: 0x1f4f9a, flag: 0xbb0000, fact: 'A public primary on Argwings Kodhek, with special units for visually impaired and deaf-blind learners.' },
    { key: 'senteu', name: 'Senteu Plaza', sub: 'Lenana Road · the first home of iHub', lat: -1.2891, lon: 36.7834, kind: 'office', storeys: 5, w: 16, d: 12, accent: 0x2a6f6a, fact: 'iHub, Kenya\'s original tech hub, worked from here until 2024. Silicon Savannah started on these floors.' },
    { key: 'adams', name: 'Adams Arcade', sub: 'Ngong Road · since 1959', lat: -1.3007, lon: 36.7805, kind: 'mall', storeys: 2, w: 26, color: 0xece2cc, accent: 0x8a5a36, fact: "Open since 1959: one of Nairobi's oldest shopping centres, and the very first Java House opened here in 1999." },
    { key: 'prestige', name: 'Prestige Plaza', sub: 'Ngong Road', lat: -1.3009, lon: 36.7871, kind: 'mall', storeys: 2, w: 30, accent: 0x1d6f8a, fact: 'Groceries downstairs, the movies, and since the 2025 makeover, bowling.' },
    { key: 'adams_masjid', name: 'Adams Masjid', sub: 'Islamic Centre · Ngong Road', lat: -1.3003, lon: 36.7811, kind: 'mosque', w: 16, d: 16, dome: 0x2f7d4f, minarets: 2, minaretH: 18, fact: 'The mosque beside Adams Arcade has served the Ngong Road neighbourhood for about 70 years.' },
    { key: 'kilimani_police', name: 'Kilimani Police Station', sign: 'National Police Service', sub: 'Kilimani Division · Jabavu Road', lat: -1.2918, lon: 36.7951, kind: 'police', accent: 0x14306b, flag: 0xbb0000, fact: "Kilimani's divisional police station, on Jabavu Road off Argwings Kodhek." },
    { key: 'nairobi_hospital', name: 'The Nairobi Hospital', sub: 'Argwings Kodhek Road · since 1954', lat: -1.2967, lon: 36.8044, kind: 'hospital', storeys: 5, accent: 0x1f5e8a, fact: "Opened in 1954 and became The Nairobi Hospital in 1961, when it opened to all Kenyans." },
    { key: 'knh', name: 'Kenyatta National Hospital', sub: 'Hospital Road', lat: -1.3008, lon: 36.8072, kind: 'hospital', storeys: 10, w: 34, accent: 0x2f6b4f, fact: 'Began in 1901 as the Native Civil Hospital; now the biggest hospital in East Africa.' },
    { key: 'state_house', name: 'State House', sub: 'Nairobi', lat: -1.2829, lon: 36.8021, kind: 'compound', w: 34, d: 24, color: 0xf3efe6, accent: 0x2f2f2f, flag: 0xbb0000, fact: "Built as Government House and designed by Sir Herbert Baker: the President's official residence." },
    { key: 'ihub', name: 'iHub', sub: 'Jahazi Building · James Gichuru Road', lat: -1.2853, lon: 36.7629, kind: 'hub', storeys: 2, w: 20, accent: 0x2a9d94, fact: "Kenya's original tech hub moved in 2024 from Senteu Plaza in Kilimani to the Jahazi Building in Lavington." },
  ],
  skyline: [
    { key: 'kicc', name: 'KICC', lat: -1.2886, lon: 36.8231, kind: 'tower', round: true, crown: true, cone: true, h: 105, w: 20, color: 0xc08a62, accent: 0xa47055 },
    { key: 'britam', name: 'Britam Tower', lat: -1.3000, lon: 36.8132, kind: 'tower', h: 200, w: 22, color: 0x6f97c4 },
  ],
};

const PORT_HARCOURT = {
  // the residents: the same lives as Yaba's, lived by this city's people (lives.js)
  cast: [
    {name: "Tamuno Briggs", spouse: "Ibinabo", kids: []},
    {name: "Ibiere Dagogo", spouse: "Tonye", kids: ["Soba"], dream: "Open a design school in Old GRA for girls"},
    {name: "Boma George", spouse: "Data", kids: ["Alabo", "Ineba"]},
    {name: "Preye Amadi", spouse: null, kids: []},
    {name: "Opuene Wokoma", spouse: "Ebiere", kids: ["Ebi"], job: "Bole and fish seller", dream: "Three bole spots, one at Mile One"},
    {name: "Ngozi Wobo", spouse: null, kids: ["Kelechi", "Chioma", "Nnamdi"]},
    {name: "Ebi Fubara", spouse: null, kids: [], job: "University of Port Harcourt student"},
    {name: "Grace Nwala", spouse: "Ikechi", kids: []},
    {name: "Musa Ibrahim", spouse: "Hauwa", kids: ["Aisha", "Umar", "Sani"]},
    {name: "Tonye Princewill", spouse: null, kids: [], dream: "A playground on every street in Old GRA"},
    {name: "Sotonye Harry", spouse: "Ibinye", kids: ["Daba"], job: "Bus conductor", dream: "Own the bus instead of renting it"},
    {name: "Atisi Kpakol", spouse: null, kids: ["Barine", "Ledum"]},
  ],
  babies: ["Tamuno", "Ibinabo", "Soba", "Preye", "Alabo", "Ebi", "Ineba", "Boma"],
  city: 'Port Harcourt', district: 'Old GRA', country: 'Nigeria',
  estates: ['Forces Avenue Court', 'Harley Street Gardens', 'Moscow Road Mews', 'Azikiwe Court', 'Isaac Boro Gardens', 'Industry Road Close', 'Ernest Ikoli Court', 'Ohia Gardens', 'Bauchi Close', 'Herbert Macaulay Court', 'Golf Club Villas', 'Garden City Court', 'Wharf Road Mews', 'Brick House Close', 'Pitakwa Gardens', 'Kolabi Court'],
  places: {
    hub: 'Old GRA Creative Hub', loft: 'Port Harcourt Builders Loft', studio: 'Garden City Design Studio', cafe: "Mama Tamuno's Cafe", gym: 'Old GRA Fitness',
    bank: 'Garden City Builders Bank', immigration: 'Old GRA Immigration Centre',
  },
  wifi: { cafe: ['MamaTamuno-Guest', 'boleandfish'], gym: ['OldGRAFitness', 'nopainnogain'], loft: ['PHLoft', 'shipph'], bank: ['GCBB-Customer', 'buildersbank'] },
  shops: [
    ['Ibiere Provisions', 'Bread, Malta and sachet water for a long night of shipping.'],
    ['Tonye Phone Repairs', 'Screens, batteries and charging ports, fixed while you wait.'],
    ['Old GRA Print and Bind', 'Proposals for the oil company, printed and bound before your meeting.'],
    ['Mama Boma Kitchen', 'Native soup, fisherman soup and a bench where builders argue about frameworks.'],
    ['Pitakwa Gadgets', 'Chargers, power banks and a generator-proof surge protector.'],
    ["Mama Tamuno's Cafe", 'Good coffee, slow wifi, and the best people-watching off Azikiwe Road.'],
  ],
  stalls: [
    ['Bole and fish', 'Roast plantain, grilled fish and that hot palm-oil pepper sauce. Port Harcourt on a plate.'],
    ['Corn and ube', 'Roasted corn with soft ube, the Garden City snack.'],
    ['Suya spot', 'The grill is on. Suya is better after a deploy.'],
    ['Recharge and POS', 'Airtime, data and a POS for when the bank app is down.'],
  ],
  park: { name: 'Old GRA Bus Stop', kind: 'danfo', word: 'bus', sub: 'Waterlines · Garrison · Mile One · Rumuola', crew: ['Conductor', 'Driver', 'Loader'],
    calls: ['Waterlines! Waterlines!', 'Garrison, Garrison, enter!', 'Mile One, Mile One!', 'Rumuola, Rumuokoro, two more!'],
    line: 'Buses and drop taxis load here for Aba Road. Kekes keep to the side streets: they have been off the major roads since 2013.' },
  police: { name: 'Old GRA Police Division', force: 'NIGERIA POLICE FORCE', sub: 'Rivers State Command · Old GRA Division', color: '#1f3d7a', line: 'Good day. Welcome to the Garden City.' },
  bikes: 'Garden City Bikes',
  streetSign: { bg: '#1f6b45', fg: '#ffffff' },
  greet: ['How far?', 'Wetin dey happen?', 'I dey o!', 'Welcome to PH!'],
  board: { jobs: 'Oil and gas data engineer, Flutter developer at a logistics startup, UI designer at an agency', week: 'Demo night at OlotuSquare Thursday 6pm. Python study group, room 2. Design crit on Saturday.' },
  rides: { danfo: { name: 'Bus', sign: 'BUS', sub: 'STOP', color: '#1f5fa8', paint: 0xf2f2ee } },
  traffic: { mix: ['saloon', 'saloon', 'hatch', 'suv', 'suv', 'pickup', 'pickup', 'taxi', 'taxi', 'danfo', 'danfo', 'keke', 'saloon', 'suv'],
    paint: { danfo: [0xf2f2ee, 0xdadad4, 0x1f5fa8] }, routes: ['WATERLINES', 'GARRISON', 'MILE ONE', 'RUMUOLA', 'RUMUOKORO', 'TRANS-AMADI', 'D-LINE', 'ABA ROAD'] },
  landmarks: [
    { key: 'ph_mall', name: 'Port Harcourt Mall', sub: '1 Azikiwe Road · since 2014', lat: 4.7754, lon: 7.0134, kind: 'mall', storeys: 2, w: 34, accent: 0x1f5fa8, fact: 'Opened in 2014 at 1 Azikiwe Road: about 16,000 m² of shops, a supermarket and a cinema.' },
    { key: 'government_house', name: 'Government House', sub: 'The Brick House · 1928', lat: 4.7767, lon: 7.0164, kind: 'compound', color: 0xa5553a, accent: 0x2f6b4f, flag: 0x008751, fact: 'The Brick House was built in 1928 for British administrators and became the governor\'s office in 1967.' },
    { key: 'monorail', name: 'Azikiwe Station', sub: 'Rivers State Monorail', lat: 4.7756, lon: 7.0110, kind: 'monorail', fact: 'Work on the monorail began in 2012 and one train arrived, but the line never opened.' },
    { key: 'bmsh', name: 'Braithwaite Memorial Hospital', sign: 'BMSH', sub: 'Rivers State University Teaching Hospital', lat: 4.7801, lon: 7.0139, kind: 'hospital', storeys: 3, accent: 0x1f5e8a, fact: 'Opened in 1925; renamed Rivers State University Teaching Hospital in 2018, but everyone still says BMSH.' },
    { key: 'golf', name: 'Port Harcourt Golf Club', sub: 'Since 1928 · Forces Avenue', lat: 4.7828, lon: 7.0142, kind: 'park', accent: 0x2f6b4f, fact: "Founded in 1928: one of Nigeria's oldest golf clubs, 18 holes, par 70." },
    { key: 'isaac_boro', name: 'Isaac Boro Park', lat: 4.7880, lon: 7.0053, kind: 'park', feature: 'statue', fact: "Named after minority-rights pioneer Isaac Boro; Workers' Day and Remembrance Day are held here." },
    { key: 'holy_rosary', name: 'Holy Rosary College', sub: 'Since 1956', lat: 4.7914, lon: 7.0053, kind: 'school', accent: 0x1f4f9a, flag: 0x008751, fact: "A Catholic girls' secondary school founded in 1956 at 1 Isaac Boro Street, Old GRA." },
    { key: 'mile_one', name: 'Mile One Market', sub: 'Ikwerre Road', lat: 4.7925, lon: 6.9979, kind: 'market', fact: 'Rebuilt after the 2013 fire, with its top floor walled to the roof so a fire cannot spread.' },
    { key: 'radio_rivers', name: 'Radio Rivers 99.1', sub: 'Degema Street · since 1981', lat: 4.7632, lon: 7.0201, kind: 'office', storeys: 3, w: 16, d: 12, accent: 0x1f5fa8, fact: 'On air since 2 May 1981: the second FM station in Nigeria.' },
    { key: 'tourist_beach', name: 'Port Harcourt Tourist Beach', sub: 'Kolabi Creek', lat: 4.7594, lon: 7.0122, kind: 'park', fact: 'A man-made beach on Kolabi Creek, opened in 1988.' },
  ],
  skyline: [
    { key: 'refinery', name: 'Port Harcourt Refinery flares', lat: 4.7606, lon: 7.1063, kind: 'flare' },
  ],
};

const UYO = {
  // the residents: the same lives as Yaba's, lived by this city's people (lives.js)
  cast: [
    {name: "Ubong Udoh", spouse: "Imaobong", kids: []},
    {name: "Ekaette Essien", spouse: "Aniekan", kids: ["Nsikak"], dream: "Open a design school in Uyo for girls"},
    {name: "Ime Akpan", spouse: "Arit", kids: ["Edidiong", "Mfon"]},
    {name: "Utibe Etim", spouse: null, kids: []},
    {name: "Etim Bassey", spouse: "Iniobong", kids: ["Ubong"], job: "Akara seller", dream: "Three akara spots, one by the plaza"},
    {name: "Arit Okon", spouse: null, kids: ["Emem", "Itoro", "Uduak"]},
    {name: "Aniekan Udo", spouse: null, kids: [], job: "University of Uyo student"},
    {name: "Grace Effiong", spouse: "Idorenyin", kids: []},
    {name: "Musa Ibrahim", spouse: "Hauwa", kids: ["Aisha", "Umar", "Sani"]},
    {name: "Mfon Ekpo", spouse: null, kids: [], dream: "A playground on every street in Uyo"},
    {name: "Itoro Umoh", spouse: "Ekemini", kids: ["Kufre"], job: "Keke rider", dream: "Own the keke instead of renting it"},
    {name: "Nkoyo Inyang", spouse: null, kids: ["Eno", "Ekong"]},
  ],
  babies: ["Emem", "Ubong", "Mfon", "Itoro", "Nsikak", "Eno", "Uduak", "Kufre"],
  city: 'Uyo', district: 'Uyo', country: 'Nigeria',
  estates: ['Etuk Street Court', 'Nsentip Gardens', 'Iman Close', 'Nsasak Court', 'Enwe Gardens', 'Nyong Essien Mews', 'Udosen Nkanta Court', 'Udoedok Close', 'Nsit Gardens', 'Udo Otung Ubo Court', 'Paul Bassey Gardens', 'Obio Imo Court', 'Ikpa Road Villas', 'Barracks Road Mews', 'Dakkada Gardens', 'Ibom Court'],
  places: {
    hub: 'Uyo Creative Hub', loft: 'Akwa Ibom Builders Loft', studio: 'Ibom Design Studio', cafe: "Mma Ekaette's Cafe", gym: 'Uyo Fitness',
    bank: 'Dakkada Builders Bank', immigration: 'Uyo Immigration Centre',
  },
  wifi: { cafe: ['MmaEkaette-Guest', 'afangsoup'], gym: ['UyoFitness', 'nopainnogain'], loft: ['IbomLoft', 'shipuyo'], bank: ['DBB-Customer', 'buildersbank'] },
  shops: [
    ['Mma Arit Provisions', 'Bread, Malta and sachet water for a long night of shipping.'],
    ['Uduak Phone Repairs', 'Screens, batteries and charging ports, fixed while you wait.'],
    ['Uyo Print and Bind', 'Pitch decks and CVs printed before the lights go off.'],
    ['Afang Kitchen', 'Afang and edikang ikong with fufu, and a bench where builders argue about frameworks.'],
    ['Ibom Gadgets', 'Chargers, power banks and a solar lamp for every budget.'],
    ["Mma Ekaette's Cafe", 'Good coffee, slow wifi, and the best people-watching by the plaza.'],
  ],
  stalls: [
    ['Plantain and groundnut', 'Roast plantain and groundnuts under the umbrella by the road.'],
    ['Akara spot', 'Akara fresh from the oil, for the evening.'],
    ['Suya spot', 'The grill is on. Suya is better after a deploy.'],
    ['Recharge and POS', 'Airtime, data and a POS for when the bank app is down.'],
  ],
  park: { name: 'Etuk Street Keke Park', kind: 'keke', word: 'keke', sub: 'Ikpa Road · Itam · Oron Road · Aka Road', crew: ['Keke rider', 'Dispatcher', 'Union man'],
    calls: ['Itam! Itam!', 'Ikpa Road, Uniuyo!', 'Oron Road, enter!', 'Aka Road, two more!'],
    line: 'Kekes load on the side streets: since 2025 they are off the main roads into the plaza. No okadas in the city.' },
  police: { name: "Uyo 'A' Division", force: 'NIGERIA POLICE FORCE', sub: "Akwa Ibom State Command · 'A' Division", color: '#1f3d7a', line: 'Mesiere. Keep the city clean.' },
  bikes: 'Ibom Bikes',
  streetSign: { bg: '#1f6b45', fg: '#ffffff' }, // deep green with white capitals, like the state's own signs
  greet: ['Mesiere!', 'Amedi!', 'Idem mfo?', 'Sosongo!'],
  board: { jobs: 'Govtech developer, Android developer at an agritech, product designer at a startup', week: 'Demo night at Start Innovation Hub Thursday 6pm. JavaScript study group, room 2. Design crit on Saturday.' },
  rides: { danfo: { name: 'City bus', sign: 'BUS', sub: 'STOP', color: '#e07b1f', paint: 0xe07b1f } }, // design choice: the state's orange
  traffic: { mix: ['saloon', 'saloon', 'saloon', 'hatch', 'suv', 'pickup', 'taxi', 'taxi', 'taxi', 'keke', 'keke', 'keke', 'suv'] },
  landmarks: [
    { key: 'ibom_plaza', name: 'Ibom Plaza', sub: 'Since 2002 · refurbished 2025', lat: 5.0340, lon: 7.9284, kind: 'plaza', accent: 0xe07b1f, fact: 'Opened on 26 December 2002 on the old Independence Square, and reopened after a refurbishment in December 2025.' },
    { key: 'qua_iboe', name: 'Qua Iboe Church', sub: '2 Olu Obasanjo Way', lat: 5.0339, lon: 7.9263, kind: 'church', color: 0xf0e6cf, accent: 0x7a1f2b, towerH: 18, fact: 'Qua Iboe began in 1887 with Irish missionary Samuel Bill at Ibeno; today, the United Evangelical Church.' },
    { key: 'uniuyo', name: 'University of Uyo', sub: 'Town Campus · Ikpa Road', lat: 5.0414, lon: 7.9250, kind: 'campus', accent: 0x1f4f9a, fact: "UniUyo's main campus is out at Nwaniba; the town campus on Ikpa Road is a short walk from the plaza." },
    { key: 'township_stadium', name: 'Uyo Township Stadium', sub: 'Akwa United FC', lat: 5.0190, lon: 7.9253, kind: 'stadium', accent: 0xc0392b, fact: 'A 5,000-seat ground and the home of Akwa United FC, beside Akpan Andem Market.' },
    { key: 'akpan_andem', name: 'Akpan Andem Market', lat: 5.0157, lon: 7.9246, kind: 'market', fact: "Uyo's main central market, beside Township Stadium." },
    { key: 'e_library', name: 'Ibom e-Library', sub: 'IBB Avenue', lat: 5.0154, lon: 7.9134, kind: 'hub', storeys: 4, accent: 0x3a6ea5, color: 0xc9ccd1, fact: "Billed as West Africa's first digital library; Start Innovation Hub works from its third floor." },
    { key: 'st_lukes', name: "St. Luke's Hospital", sub: 'Anua · since 1937', lat: 5.0287, lon: 7.9427, kind: 'hospital', storeys: 2, w: 28, accent: 0x2f6b4f, fact: 'Founded in 1937 by the Medical Missionaries of Mary with 12 beds; about 400 beds now.' },
    { key: 'ibom_hall', name: 'Ibom Hall', sub: 'IBB Avenue', lat: 5.0129, lon: 7.9167, kind: 'compound', color: 0xf0dc9a, accent: 0xc0392b, flag: 0x008751, fact: "The state's main events venue: conferences, and the Orange September festival." },
    { key: 'tropicana', name: 'Ibom Tropicana', sub: 'Mall · Cinema · Udo Udoma Avenue', lat: 4.9990, lon: 7.9405, kind: 'mall', storeys: 2, w: 34, accent: 0x9acd32, fact: "Modelled on South Africa's Sun City: a mall and a cinema on Udo Udoma Avenue." },
    { key: 'itam', name: 'Itam Market', sub: 'Itu Road', lat: 5.0464, lon: 7.8987, kind: 'market', fact: "One of Uyo's busiest markets: food, thrift clothes and building materials by the Itam flyover." },
  ],
  skyline: [
    { key: 'dakkada', name: 'Dakkada Towers', lat: 4.9985, lon: 7.9290, kind: 'tower', h: 109, w: 16, color: 0x2b3a4a },
    { key: 'akpabio_stadium', name: 'Godswill Akpabio International Stadium', lat: 5.0067, lon: 7.8848, kind: 'stadium', r: 120, color: 0xf2f2ee },
  ],
};

export const CITY_INFO = { Lagos: LAGOS, Abuja: ABUJA, Accra: ACCRA, Nairobi: NAIROBI, 'Port Harcourt': PORT_HARCOURT, Uyo: UYO };
let here = LAGOS;
/** Set the city the page is showing (look/index.js, at start-up). */
export function setCity(city, district = city) {
  // a city without its own entry gets places named after itself, never Lagos's
  here = CITY_INFO[city] || { ...LAGOS, city, district, landmarks: [], skyline: [], traffic: null,
    places: { hub: `${district} Creative Hub`, loft: `${city} Builders Loft`, studio: `${district} Design Studio`, cafe: `${district} Cafe`, gym: `${district} Fitness`, bank: `${city} Builders Bank`, immigration: `${district} Immigration Centre` },
    shops: LAGOS.shops.map(([n, l], i) => (i === 2 ? [`${district} Print and Bind`, l] : i === 5 ? [`${district} Cafe`, l] : [n, l])),
    park: { ...LAGOS.park, name: `${district} Motor Park` }, police: { ...LAGOS.police, name: `${district} Police Station`, sub: city }, bikes: `${district} Bikes` };
  return here;
}
/** The city the page is showing. */
export const cityInfo = () => here;
