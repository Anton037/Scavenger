# Scavenger

An atmospheric 3D horror game set in an abandoned tidal pumping station. Descend into the Drowned Works, recover three maintenance records, and call the lift. The Listener patrols the works and follows what it can see or hear. Close the lamp shutter, skirt standing water, and spend your brass clappers to draw it away from your route.

## Play locally

Use Node.js 20.19+ or 22.12+ and a browser with WebGL 2.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. `npm run check` tests the level and simulation and builds the production site. `npm run preview` serves that build locally.

| Action | Keyboard and mouse | Touch |
| --- | --- | --- |
| Move | WASD or arrow keys | Left stick |
| Aim the lamp | Mouse | Touch or drag the scene |
| Open or shutter the lamp | Q | Lamp |
| Dash | Space | Dash |
| Throw a clapper | F | Clapper |
| Recover a record or use the lift | E | Use |
| Open the survey chart | M | Chart |
| Pause | Escape | Pause |

The chart marks all three record sites and the lift. Dashing and wading carry farther than ordinary footsteps. Once the lift is called, it needs five seconds to arrive. Sound is optional. The HUD shows when your footsteps are loud, when the lamp is open, and when an action is available.

## Art direction

The [Riftline art style overview](docs/Riftline%20Art%20Style%20Overview.pdf) is the reference for glazed surfaces, brass-and-ivory details, high-angle framing, and readable cues. Scavenger uses those treatments for its own flooded setting, original models, and stealth loop. The runtime builds the tiles and machinery procedurally and synthesizes its soundscape locally. The title illustration was generated for Scavenger. Baskervville and Instrument Sans are bundled under their respective [Baskervville](public/fonts/Baskervville-OFL.txt) and [Instrument Sans](public/fonts/Instrument-Sans-OFL.txt) SIL Open Font Licenses.
