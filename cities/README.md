# Cities

Every country and city in Builders World, one folder each: `cities/<country>/<city>/`. There are 84 countries and 135 cities: the
cities that attract tech talent in each country. Six are **live** (you can play them today); the rest are **planned**, and
show on the world map as "coming later" with a line on why tech people go there.

```
cities/
  nigeria/
    country.json        the country: name, region, which side of the road, currency
    lagos/
      city.json         the city: name, live or planned, where it is, why tech people go there
    abuja/
    ...
  kenya/
    nairobi/
```

## country.json

| Field | What it is |
|---|---|
| `name` | The country's name as players see it |
| `mapName` | Its name on the world map's outlines (`apps/game/src/look/world.json`), when that differs or exists. Leave it out for countries too small for the outlines (Singapore, Mauritius) |
| `region` | Africa, Europe, Middle East, Asia, North America, South America or Oceania |
| `drive` | `left` or `right`: the side traffic keeps to |
| `currency` | ISO 4217 code (NGN, KES, GHS...) |

## city.json

| Field | What it is |
|---|---|
| `name` | The city's name |
| `status` | `live` (playable) or `planned` |
| `lat`, `lon` | Where the city centre is, in degrees |
| `tech` | One plain sentence on why tech people go there. No em dashes |
| `key`, `label`, `state` | Live cities only: the game's own name for the city, how it is labelled, and its state or county |

## Adding a city

1. Make the folder: `cities/<country>/<city>/`, lower case with hyphens (`cities/south-africa/cape-town/`). If the
   country is new, add its `country.json` too.
2. Add `city.json` with `"status": "planned"`.
3. Run the checks: `cd apps/game && npm test`. `tests/cities.test.js` checks every file.
4. Open a pull request. The city appears on the world map as soon as it merges.

Making a city **live** takes more than its folder: its areas baked from OpenStreetMap (`apps/game/scripts/fetch-osm.mjs`),
and its look and life (landmarks, traffic, food, radio, signs). Those still live in the game's code
(`apps/game/src/look/areas.js`, `cityinfo.js` and others) and are moving into each city's folder next, so a city's
maintainers can look after all of it in one place. See the [world bible](../docs/design/world-bible.md) first.

## Who looks after what

Each live city can have its own maintainers, named in [`.github/CODEOWNERS`](../.github/CODEOWNERS). A pull request that
touches their city's folder asks them for a review.

## The directory


### Africa

| Country | Cities |
|---|---|
| [Algeria](algeria) | Algiers |
| [Angola](angola) | Luanda |
| [Benin](benin) | Cotonou |
| [Botswana](botswana) | Gaborone |
| [Burkina Faso](burkina-faso) | Ouagadougou |
| [Cameroon](cameroon) | Buea, Douala, Yaoundé |
| [Côte d'Ivoire](cote-d-ivoire) | Abidjan |
| [Democratic Republic of the Congo](democratic-republic-of-the-congo) | Kinshasa |
| [Egypt](egypt) | Alexandria, Cairo |
| [Ethiopia](ethiopia) | Addis Ababa |
| [Ghana](ghana) | **Accra** (live), Kumasi |
| [Kenya](kenya) | Kisumu, Mombasa, **Nairobi** (live) |
| [Madagascar](madagascar) | Antananarivo |
| [Malawi](malawi) | Lilongwe |
| [Mali](mali) | Bamako |
| [Mauritius](mauritius) | Ebène |
| [Morocco](morocco) | Casablanca, Rabat |
| [Mozambique](mozambique) | Maputo |
| [Namibia](namibia) | Windhoek |
| [Nigeria](nigeria) | **Abuja** (live), Enugu, Ibadan, **Lagos** (live), **Port Harcourt** (live), **Uyo** (live) |
| [Rwanda](rwanda) | Kigali |
| [Senegal](senegal) | Dakar |
| [Sierra Leone](sierra-leone) | Freetown |
| [South Africa](south-africa) | Cape Town, Durban, Johannesburg, Pretoria |
| [Tanzania](tanzania) | Arusha, Dar es Salaam |
| [Togo](togo) | Lomé |
| [Tunisia](tunisia) | Tunis |
| [Uganda](uganda) | Kampala |
| [Zambia](zambia) | Lusaka |
| [Zimbabwe](zimbabwe) | Harare |

### Europe

| Country | Cities |
|---|---|
| [Austria](austria) | Vienna |
| [Belgium](belgium) | Brussels |
| [Czechia](czechia) | Prague |
| [Denmark](denmark) | Copenhagen |
| [Estonia](estonia) | Tallinn |
| [Finland](finland) | Helsinki |
| [France](france) | Lyon, Paris |
| [Germany](germany) | Berlin, Hamburg, Munich |
| [Greece](greece) | Athens |
| [Ireland](ireland) | Dublin |
| [Italy](italy) | Milan |
| [Lithuania](lithuania) | Vilnius |
| [Netherlands](netherlands) | Amsterdam, Eindhoven |
| [Norway](norway) | Oslo |
| [Poland](poland) | Kraków, Warsaw |
| [Portugal](portugal) | Lisbon, Porto |
| [Romania](romania) | Bucharest |
| [Spain](spain) | Barcelona, Madrid |
| [Sweden](sweden) | Stockholm |
| [Switzerland](switzerland) | Zurich |
| [Turkey](turkey) | Istanbul |
| [Ukraine](ukraine) | Kyiv |
| [United Kingdom](united-kingdom) | Cambridge, Edinburgh, London, Manchester |

### Middle East

| Country | Cities |
|---|---|
| [Israel](israel) | Tel Aviv |
| [Jordan](jordan) | Amman |
| [Qatar](qatar) | Doha |
| [Saudi Arabia](saudi-arabia) | Riyadh |
| [United Arab Emirates](united-arab-emirates) | Abu Dhabi, Dubai |

### Asia

| Country | Cities |
|---|---|
| [Bangladesh](bangladesh) | Dhaka |
| [China](china) | Beijing, Hangzhou, Shanghai, Shenzhen |
| [India](india) | Bengaluru, Chennai, Hyderabad, Mumbai, New Delhi, Pune |
| [Indonesia](indonesia) | Jakarta |
| [Japan](japan) | Fukuoka, Tokyo |
| [Kazakhstan](kazakhstan) | Almaty |
| [Malaysia](malaysia) | Kuala Lumpur |
| [Pakistan](pakistan) | Karachi, Lahore |
| [Philippines](philippines) | Manila |
| [Singapore](singapore) | Singapore |
| [South Korea](south-korea) | Seoul |
| [Sri Lanka](sri-lanka) | Colombo |
| [Taiwan](taiwan) | Taipei |
| [Thailand](thailand) | Bangkok |
| [Vietnam](vietnam) | Hanoi, Ho Chi Minh City |

### North America

| Country | Cities |
|---|---|
| [Canada](canada) | Montreal, Toronto, Vancouver, Waterloo |
| [Mexico](mexico) | Guadalajara, Mexico City |
| [United States](united-states) | Atlanta, Austin, Boston, Los Angeles, New York, San Francisco, Seattle |

### South America

| Country | Cities |
|---|---|
| [Argentina](argentina) | Buenos Aires |
| [Brazil](brazil) | Florianópolis, São Paulo |
| [Chile](chile) | Santiago |
| [Colombia](colombia) | Bogotá, Medellín |
| [Peru](peru) | Lima |
| [Uruguay](uruguay) | Montevideo |

### Oceania

| Country | Cities |
|---|---|
| [Australia](australia) | Melbourne, Sydney |
| [New Zealand](new-zealand) | Auckland |
