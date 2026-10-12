# Builders World

A living, browser-based world for developers and designers, set in real African cities. You arrive, get a home, and live a builder's life: work from hubs, cafés and studios, meet other builders who are online at the same time, and help improve your neighbourhood. Your real work is your currency. Every commit you push on GitHub turns into **Efforts**, the money you spend in the world.

**Play it:** [buildersworld.vercel.app](https://buildersworld.vercel.app/) (the onboarding), or [go straight into the world](https://buildersworld.vercel.app/?world=1).

Built with three.js and Vite. There are no game engines, downloads or plug-ins: everything runs in the browser, and almost everything you see is generated from real map data at load.

## The idea

- **Real places.** Streets, buildings, railways and landmarks come from OpenStreetMap. Yaba looks like Yaba and Kilimani looks like Kilimani. Each city has its own landmarks, traffic, shops, food, radio stations, signs and accents.
- **Real time and weather.** The sun rises and sets when it does outside, and if it's raining in Lagos right now, it's raining in Lagos in the game.
- **Real work, real people.** Sign in with GitHub. Your commits become Efforts. Other builders who are online appear on the street, and you can chat, emote and visit.
- **A builder's life, with real-life friction.** Wi-Fi passwords, membership cards, passports to fly, a driver's licence to drive, rent for a home, a phone that needs a connection.
- **A community, not just a map.** Pick up litter, fund bins together, build benches in the community build area, pin notes on the board.
- **Paper and ink.** A warm, illustrated look for the world and every panel, instead of the usual dark glass.

## What's in it today

### The world
- **Six cities, 26 areas**, each rebuilt from OpenStreetMap:

  | City | Areas |
  |---|---|
  | Lagos | Yaba, Ikeja, Victoria Island, Lekki Phase 1, Surulere, Apapa, Lagos Island |
  | Abuja | Wuse, Central Business District, Jabi |
  | Port Harcourt | Old GRA, Rumuola, Trans-Amadi |
  | Akwa Ibom | Uyo, Ring Road Uyo, Eket, Ikot Ekpene |
  | Nairobi | Kilimani, City Centre, Westlands |
  | Accra | Osu, Accra Central, Airport City |

- **Nairobi is an open world.** Each area is built in full. Around it, the whole of central Nairobi (about 9 by 7 km) stretches to the horizon on its real street grid: every building from OpenStreetMap at its real height, the parks, the river, and the expressway on its viaduct. You can walk out of the area and keep going, or look over all of it from the aerial view. Nearby streets have:
  - traffic, keeping left in lanes, with lights after dark;
  - people on the pavements;
  - cafés, restaurants, banks and gyms you can go into, under their real names.

  Only the streets near you are built, in 200 m pieces streamed in the background. Their detail scales with distance and with your device. Clay clouds drift overhead from the aerial view. The minimap follows you anywhere in the city, and the big map zooms out from the area to the whole city.
- **Planned estates** with gates, closes and numbered houses (1A, 2B...), garages and gardens. The serving-window shops along the main streets each have their attendant at the counter, with illustrated signs showing what they sell.
- **Real landmarks** in place, and the city's skyline on the horizon. These include Ikeja City Mall, Ibom Tropicana, the National Stadium, Lagos Port Complex and hospitals.
- **A road hierarchy.**
  - Highways, main roads, collector roads, residential streets, and estate lanes paved in interlocking blocks, each with its own speed limit.
  - Lane markings, zebra and pelican crossings with the hand and walking figure, and traffic lights.
  - STOP junctions, speed bumps, median barriers, roundabouts, flyovers and footbridges.
- **Railways** with trains, a station, and level crossings with lamps, bells and half barriers. Nothing is built on the tracks.
- **Airports in every city**, with the real process: check-in, security, passport control, the gate, the flight, then arrivals and customs.
- **Live time of day and weather** (sun, rain, fog, storms), with morning mist that burns off, wet streets that dry, and streetlights on at dusk.
- **Natural map edges**: the world greys out at the boundary, and signs say where the road leads.

### Life in the city
- **Residents with lives:** names, jobs, families, homes they go in and out of, moods, and greetings in English or pidgin.
- **Traffic that follows the lanes** and drives on each country's side (Nairobi keeps left). It gives way at crossings and junctions and keeps the speed limit. There are danfos, matatus, trotros, kekes, BRT buses and taxis, plus traffic officers (LASTMA, FRSC, NTSA).
- **Street food:** suya, corn and fruit stalls, kitchens, cafés, and food trucks with each city's own menu. You order face to face and watch it being made.
- **Animals:** pigeons that take off, chickens that run, dogs that bark or make friends, cats. Feed them corn or biscuits.
- **Digital billboards, radio** (each city's real FM stations) and a soundtrack generated in the browser.

### Your life
- **Your own home:** seven rooms, including a workspace, a lab and a studio. Sit, sleep, cook, shower and watch TV. New players start inside it.
- **A wardrobe:** body, skin, ten hairstyles including gele and fila, Ankara, Adire, kaftan and agbada, shoes and accessories.
- **The bag:** gadgets, wearables, badges, and a card holder with resident, membership and visitor passes, your passport and your driver's licence.
- **A phone with real apps:** Map, Camera, Wallet, Radio, Weather, Ride, Travel, Pets, Wardrobe, Sports, Wi-Fi and Settings. It needs Wi-Fi: public hotspots are at the community board, bus stops and parks.
- **A wallet:** Efforts from your GitHub work, spent on rides, food, gadgets, passes, fees and travel.
- **Getting around:**
  - on foot (click to walk, a GPS trail and a cinematic auto-travel), or by the city's rented bikes;
  - on your own bicycle, skateboard, roller skates, hoverboard or e-scooter;
  - by hired danfo, keke or taxi, as a passenger or driving yourself (with a licence);
  - by taxi to another area of the city, or by plane to another city.
- **Pets:** adopt a dog or a cat, name it, play fetch, or walk around as your dog.
- **The map:** your street, filling the screen, with the city's other areas named at the edges; zoom out to a world map you can drag round the globe, with every city in the [`cities/`](../../cities) folder: the live ones to travel to, the rest coming later.

### Work and community
- **Hubs, a co-working loft, a design studio, cafés, a gym and a bank**, each with its own interior. Sit at a desk and open your laptop.
- **Wi-Fi with passwords**, found on notice boards, menus and your cards. Eko Design Studio is members only.
- **The Immigration Centre** (passports, travel authorisations) and the **licensing office** (driver's licence: eye test and theory test).
- **The community board, the build area, litter and recycling for Efforts, and street bins** funded together.
- **Sport, played by the real rules:** tennis, padel, table tennis, basketball, swimming, and chess against regulars or anyone online.

### Online
- **GitHub sign-in.** The game reads your username and name only, never your code.
- **Other players live** on the street and on the map, with chat, emotes, name tags and profiles (what each person chooses to share).
- **Your profile and look** follow you between devices.

## Controls

| Key | Does | Key | Does |
|---|---|---|---|
| W A S D / arrows | Walk (click the street to walk there) | Tab | Phone |
| Shift | Run | M | Map |
| Space | Jump | I | Bag |
| E | Interact, enter, order, talk | V | Camera view |
| C | Cinematic travel along your route | B | Aerial view |
| Q | Play as your dog | F | Feed animals |
| 1 to 6, G | Emotes, all emotes | Enter | Chat |
| Z | Binoculars (when carried) | P | Look at someone's profile |
| N | Music on or off | Esc | Close, stand up |

You can also play with a gamepad (PlayStation or Xbox, with a mapping screen) or with touch controls on phones.

## Run it

You need Node 20 or newer.

    npm install
    npm run dev

Open the printed address for the onboarding, or add `?world=1` to go straight into the world.

### Useful switches

| Switch | What it does |
|---|---|
| `?world=1` | Skip onboarding, start in the world |
| `?city=Nairobi&area=Westlands` | Choose a city and area |
| `?quality=low\|medium\|high\|ultra` | Graphics tier (Auto by default; it adapts to your device) |
| `?hour=19.5` | Set the time of day |
| `?wx=clear\|cloudy\|drizzle\|rain\|storm\|fog\|haze` | Set the weather |
| `?offline=1` | Play without the server |
| `?hud=0` | Hide the interface |
| `?greenrey=0`, `?stream=0`, `?batch=0` | Turn off the ground layer, distance streaming or mesh batching, to compare |
| `?start=home` | Start inside your home (the tests start on the street) |
| `?open=0` | Nairobi without the open city round the area |
| `?no=citytraffic,citypeople` | The open city without its traffic or people, to compare |

## Checks

    npm test                          # unit tests (node:test)
    npx playwright install chromium   # once per machine
    npm run test:browser              # Playwright: onboarding, and nothing standing on the railways
    npm run build

## How it's built

- `src/world.js` turns a baked OpenStreetMap manifest into the district:
  - roads and pavements, estates and lots, the railway corridor;
  - the walkable map and colliders;
  - placement rules, so nothing stands in a road, on a pavement or on a track.
- `src/look/` holds the living world, one module per system:
  - `traffic.js` (lane graph, junctions, right of way, STOP and signals), `roadclass.js` (road kinds, limits, speeds);
  - `railway.js`, `airport.js` and `travel.js`, `rides.js`, `mobility.js`;
  - `lives.js` and `streetlife.js`, `food.js`, `shopfronts.js`, `foodtruck.js`, `passes.js` (cards and Wi-Fi), `licence.js`;
  - `menus.js` (phone, map, bag, wallet, settings), `hud.js`, `weather.js` and `sun.js`;
  - `quality.js`, `stream.js` and `batch.js` (performance).
- `src/onboarding/` is the arrivals journey.
- The countries and cities come from `cities/` at the top of the repository, through the `@cities` alias (`src/look/citydirectory.js`). `tests/cities.test.js` checks every file there.
- `public/data/` holds the baked city areas. `scripts/fetch-osm.mjs` bakes a new one.
- `src/city/` is the open world:
  - `roadnet.js` is the road network (after Cities: Skylines);
  - `openworld.js` streams the chunks, which `chunkworker.js` meshes in a worker (with `chunkmesh.js`);
  - `citytraffic.js` and `citypeople.js` are the life on the streets;
  - `clouds.js` and `facade.js` are the clouds and the window shader.

  `public/city/<city>/` holds a city baked into chunks, plus `map.json` for the big map. `scripts/city/bake.mjs` bakes one from an OpenStreetMap extract (the steps are at the top of the file).
- Shared rules for every city, its own look per city: anything systemic (traffic, zoning, physics, UI) applies to every city, while architecture and flavour are set per city in `src/look/cityinfo.js` and `areas.js`.

How the world is built, and why, is written down in the **world bible** (`docs/design/world-bible.md` in [builders-world/builders-world](https://github.com/builders-world/builders-world)). Read it before changing anything. Every request and where it stands is in `docs/collaboration/tracker.md` in the same repository.

## Online play (the server)

Sign-in, presence, street bins and the Efforts count come from the Rust gateway in [open-world-backend](https://github.com/builders-world/open-world-backend).

    # in the backend repo: Postgres and Redis up, then
    cargo run -p gateway        # :8080
    # here
    npm run dev                 # Vite proxies /api to :8080

Signed out, or without a reachable server, the game plays solo with a demo balance and shows no error.

In production, Vercel forwards `/api` to the gateway (`vercel.json`). The gateway's `ALLOWED_ORIGINS` must include the game's address.

## Deploying

The live site is the `main` branch on Vercel. The game reads `cities/` from the top of the repository, so Vercel builds
from the repository root with its Root Directory set to `apps/game` (Project Settings, Build and Deployment). Deploy from
the root:

    vercel deploy --prod --build-env VITE_API_URL=https://<gateway domain>

The root `.vercelignore` uploads only `apps/game` and `cities`.

`railway.json` and `server.mjs` also serve the build on Railway.

## Contributing

- Branch from `main` and open a pull request. Never push to `main`. Use conventional commits.
- Run `npm test`, `npm run test:browser` and `npm run build` before asking for review.
- Keep credentials out of Git. Secrets live in the hosting providers only.
- UI text: plain, warm English, no em dashes.

## Still to come

- Efforts kept on the server (a ledger), so balances can't be edited locally.
- Character models in the reference art style.
- Dribbble sign-in for designers.
- A browser on the in-game laptop.
- More countries.

The [tracker](https://github.com/builders-world/builders-world/blob/main/docs/collaboration/tracker.md) has the full list and the decisions still open.

## Credits and data

- Map data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, under the ODbL.
- Weather from [Open-Meteo](https://open-meteo.com/). The free API is for non-commercial use; a public launch needs their paid plan or another provider.
- Country boundaries from [Natural Earth](https://www.naturalearthdata.com/) (public domain), via `world-atlas`.
- Radio streams found through [Radio Browser](https://www.radio-browser.info/). Chess rules by [chess.js](https://github.com/jhlywa/chess.js).
- Sound and music are generated in the browser; nothing is licensed.
- Residents and builders in the world are invented.
