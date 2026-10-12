# The city knowledge base

Every country and city in Builders World has a knowledge base: how people there are named, which languages they speak
on the street, how they greet each other, what they eat, how they get around, the neighbourhoods and streets they talk
about. The game reads it for every person you meet, every line they say, every stall and every sign, so a city feels
like itself and people from there recognise it (Elvis, 12 October 2026: "in Nairobi, people shouldn't be speaking
Pidgin. They should either speak Swahili or English ... so that everything feels unique to each city and players can
relate better, especially natives from those cities").

Two files:

- `cities/<country>/knowledge.json`: the country: its languages, how names are formed, the communities and their
  names, greetings and everyday phrases in each language, money.
- `cities/<country>/<city>/knowledge.json`: the city: the mix of languages on its streets, its own slang, how its people
  talk (chat lines by register), transport words, street food, neighbourhoods, streets and landmarks, small talk.

**Natives: please correct us.** If a name, a phrase or a spelling is off for your city, change it in a pull request.
`apps/game/tests/knowledge.test.js` checks the files' shape; people who live there check that it is right.

Write plainly. No em dashes. Phrases in their usual spelling, with an English gloss.

## country `knowledge.json`

```json
{
  "languages": [
    { "code": "sw", "name": "Swahili", "official": true, "spoken": "widely" },
    { "code": "en", "name": "English", "official": true, "spoken": "widely" }
  ],
  "names": {
    "order": "given family",
    "conventions": "How names are formed, in a few sentences: Christian or Muslim first names with a family name from the father's community; a Kikuyu name like Wanjiru given after a grandparent; Luo names after the time of birth (Otieno, at night) ...",
    "groups": {
      "kikuyu": {
        "given": { "m": ["Kamau", "Mwangi", "..."], "f": ["Wanjiru", "Njeri", "..."] },
        "family": ["Kamau", "Mwangi", "Njoroge", "..."],
        "also": { "m": ["Brian", "Kevin", "..."], "f": ["Faith", "Mercy", "..."] }
      }
    },
    "weights": { "kikuyu": 0.3, "luo": 0.2, "...": 0.1 }
  },
  "honorifics": { "elder_m": "Mzee", "elder_f": "Mama", "peer_m": "Bro", "peer_f": "Sis", "boss": "Boss" },
  "phrases": {
    "sw": {
      "hello": [["Habari?", "Hello, how are things?"]],
      "morning": [["Habari ya asubuhi?", "Good morning"]],
      "evening": [["Habari ya jioni?", "Good evening"]],
      "how_are_you": [["Uko aje?", "How are you?"]],
      "fine": [["Nzuri", "Fine"], ["Poa", "Cool"]],
      "thanks": [["Asante", "Thank you"]],
      "bye": [["Kwaheri", "Goodbye"]],
      "welcome": [["Karibu", "Welcome"]],
      "sorry": [["Pole", "Sorry"]],
      "excuse": [["Samahani", "Excuse me"]],
      "yes": [["Ndiyo", "Yes"]],
      "no": [["Hapana", "No"]]
    }
  },
  "money": { "currency": "KES", "symbol": "KSh", "words": [["bob", "a shilling, in slang"], ["ngiri", "a thousand shillings"]] },
  "sources": ["https://...", "..."]
}
```

- `names.groups`: one entry per community whose names you meet in this country's cities. `given.m` and `given.f`:
  at least 12 each where you can. `family`: at least 12. `also`: the English, French, Portuguese, Christian or Muslim
  first names people there commonly carry with their own (optional).
- `family_f` (optional): what women carry where it differs from men. Where the surname changes form (Kowalski and
  Kowalska, Novák and Nováková, Akhmetov and Akhmetova), list the women's forms in the same order as `family`. Where
  women's second names are their own (Javanese Lestari, Wulandari), list them; the order then does not matter.
- `names.order`: `"given family"`, `"family given"` (China, Japan, Korea, Vietnam) or `"given family family"` where people
  carry two family names (Mexico, Colombia: Juan García López).
- `order` on a group (optional): a group whose names run differently from its country's, such as `"family given"` for
  Chinese names in Singapore and Malaysia.
- `honorifics`: what people call an elder, a peer or a boss. A title that starts with a hyphen (`"-san"`) goes after
  the family name (Tanaka-san); every other one goes before the first name (Mzee Otieno). Where those words are said to
  someone but not put on a name ("Yes, sir"), add `titles`: `{ "elder_m": "Herr", "elder_f": "Frau", "with": "family" }`
  for Herr Müller, `"with": "first"` for Don Manuel, or `{ "with": "none" }` where people use no title at all.
- `names.weights`: roughly how the country's urban population divides between the groups (they sum to about 1).
- `phrases`: one block per language in `languages` that people use day to day. Each entry is `[phrase, English]`.

## city `knowledge.json`

```json
{
  "street": { "en": 0.45, "sw": 0.2, "sheng": 0.35 },
  "registers": {
    "sheng": { "name": "Sheng", "about": "Nairobi's street mix of Swahili and English, the young city's own talk." }
  },
  "names": { "weights": { "kikuyu": 0.35, "luo": 0.2, "luhya": 0.15, "kamba": 0.12, "kalenjin": 0.08, "somali": 0.1 } },
  "phrases": { "sheng": { "hello": [["Sasa!", "Hi!"], ["Niaje?", "What's up?"]], "fine": [["Poa", "Cool"], ["Fiti", "All good"]] } },
  "chat": {
    "en": {
      "greet": ["Morning! How's the day?"],
      "reply": ["All good, thanks!"],
      "sunny": ["Lovely day out."],
      "rain": ["Carry an umbrella, it is coming down."],
      "bye": ["Have a good one!"],
      "busy": ["Running late for a meeting, catch you later!"]
    },
    "sheng": { "greet": ["Niaje msee!"], "reply": ["Poa sana!"], "sunny": ["..."], "rain": ["..."], "bye": ["Tutaonana!"], "busy": ["..."] }
  },
  "transport": { "bus": "matatu", "moto_taxi": "boda boda", "tricycle": "tuktuk", "taxi": "taxi", "conductor": "makanga", "stage": "stage" },
  "touts": ["Town, town! Kencom!", "..."],
  "hawkers": [["Maji baridi!", "Cold water!"], ["..."]],
  "food": { "street": ["smokie pasua", "mahindi choma", "..."], "dishes": ["nyama choma", "ugali", "..."], "drinks": ["chai", "..."] },
  "places": { "neighbourhoods": ["Kilimani", "Westlands", "..."], "streets": ["Ngong Road", "..."], "landmarks": ["KICC", "..."] },
  "small_talk": ["Traffic on Ngong Road was mad this morning.", "..."],
  "sources": ["https://...", "..."]
}
```

- `street`: how often each register is heard on this city's streets (sums to about 1). A register is a language code
  from the country file, or a city register defined in `registers` (Sheng, Lagos Pidgin, Ghanaian Pidgin).
  Well-off people lean to English, hustlers to the street register (the game does the leaning).
- `chat`: lines per register, for each kind: `greet`, `reply`, `sunny`, `rain`, `bye`, `busy` (at least 5 each in
  English, at least 4 each in the street register). Natural, warm, local; nothing offensive or political.
- `transport`: what people call each kind of ride. An empty string means the city has no such thing (the game then
  uses its own word). Cities can add keys of their own (tram, ferry, jeepney, marshrutka).
- `touts` and `hawkers`: what you hear at the bus stop and from people selling on the street (hawkers with a gloss).
- `places`: real neighbourhoods, streets and landmarks people mention. `small_talk`: everyday remarks in English
  that only make sense in this city.
