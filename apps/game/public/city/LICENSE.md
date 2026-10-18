# City data licence

The files in this folder are a database built from OpenStreetMap. They are made available under the
[Open Database Licence (ODbL) 1.0](https://opendatacommons.org/licenses/odbl/1-0/). Any rights in individual
contents of the database are licensed under the
[Database Contents Licence](https://opendatacommons.org/licenses/dbcl/1-0/).

The Apache licence that covers the rest of this repository does not apply here.

**Sources**

- Streets, buildings, places and paths: © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, ODbL.
- Building heights (`t_*.json`): GHS-BUILT-H R2023A, 2018 epoch, European Commission, Joint Research Centre,
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- Terrain (`hills.json`): [Terrain Tiles on AWS Open Data](https://registry.opendata.aws/terrain-tiles/)
  (Mapzen/Tilezen; SRTM, NASA).

If you share these files, or a database you made from them, keep this notice with them and share your version
under the ODbL too. Pictures and videos of the game only need the credit "© OpenStreetMap contributors".

The scripts that build these files are in `apps/game/scripts/city/` and are under the Apache licence.
