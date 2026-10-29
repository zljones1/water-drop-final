# Water Drop

A little girl runs the bottom of the field and catches clean rain. Dirty drops cost a life. Clear a round and she gets a breath, then the sky gets meaner.

Play it: https://zljones1.github.io/ZaXX-Tech-Hub/water-drop/

The source in this repo is the same game. Arrow keys or the on-screen buttons move her. Hold Fast run to sprint. Space pauses.

## charity: water tie-in

The start screen carries the charity: water name in their brand yellow (#FFC907), a short mission line ("Every drop counts — charity: water brings clean water to people in need") and a **Learn more** link to https://www.charitywater.org. Every clean drop you catch is a reminder that clean water isn't a given for everyone.

## Bad drops

Each bad drop picks one of three types at random when it spawns. Every one costs a life and 3 points:

- **Muddy water** (brown) — "Muddy water. Yuck."
- **Acid rain** (glowing green) — "Acid rain! That burns."
- **Oil drop** (glossy black) — "Oil spill! Not drinkable."

## Building

`source/` holds the TypeScript/React code. `game.js` is an esbuild bundle of it (React 19 + lucide-react, `@` aliased to `source/`); `game.css` is the prebuilt stylesheet.
