# Rare Hands

A Rare Friends garden with three stalls. Balances are simulated. Nothing is on-chain.

## Play

Open `index.html` on GitHub Pages: https://innocent677.github.io/rare-hands/

Tap once so the music can start. Mute is in the top bar.

- **Run** (left): one friend on a stone path. A/left and D/right change lanes. W or swipe up jumps. S or swipe down slides. Gold gems add $GAME. A block, beam, or gap ends the run.
- **Play** (center): rock-paper-scissors. Bet $RAREFRIENDS and pick a multiplier from 1.5x to 10x. Win 2-1 for half the multiplier. Sweep 3-0 for the full multiplier. Fewer than 2 wins and the bet is gone.
- **Shop** (right): burn 1,000 $GAME to add 1 $RAREFRIENDS. $GAME is deducted.

You start with 50 $RAREFRIENDS. The balance stays in this browser.

## Source

Readable game source is in `src/` (`RareHands.tsx`, `audio.ts`, `save.ts`). `app.js` is the built file the page loads.

FriendSDK is not required for this version.
