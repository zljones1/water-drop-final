# charity: water Water Drop — Final Version

A browser game made for charity: water. Catch clean water drops in your jerry can and dodge the polluted ones. This is the final version of the game, built on top of the original prototype.

**Play it live:** https://zljones1.github.io/water-drop-final/
**Original prototype:** https://zljones1.github.io/ZaXX-Tech-Hub/water-drop/

## Features
- A start screen with charity: water branding, falling-drop animation, and a big **Start Your Charity** button
- Random bad drops: the game picks one of three each time
  - Muddy water (brown)
  - Acid rain (green)
  - Oil drops (black)
- Bad drops cost you lives and points (-3 and a heart), with screen shake and splash particles
- Difficulty modes: Easy (5 lives, goal 40), Normal (3 lives, goal 75), Hard (2 lives, goal 120, faster drops, more bad drops)
- Reach the goal to win, with a confetti celebration
- Reset button during play, plus pause
- Sound effects made with the Web Audio API, with a mute toggle
- High score saved in your browser (localStorage)
- charity: water colors and branding, with links to charitywater.org and its donate page
- Respects reduced-motion settings
- charity: water milestone messages at 25, 50, and 100 points
- A game-over card with your score and **Again** / **Back to start** buttons
- Responsive layout that works with touch on phones and tablets

## How to play
1. Pick a difficulty, then click **Start Your Charity**.
2. Move the can with the arrow keys, the mouse, or touch.
3. Catch clean blue drops to score points.
4. Avoid muddy, acid rain, and oil drops. They take away lives and points.
5. Reach the goal score to win. When you run out of lives, hit **Again** to play another round.
