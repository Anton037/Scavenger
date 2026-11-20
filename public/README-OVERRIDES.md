# Optional Asset Overrides (`public/overrides.json`)

*Five Nights at Torge's v2.0* runs **100% out of the box** using procedural PS1/VHS UV canvas textures and procedural WebAudio foley/cassette synthesis — no external binary files are required, and no 404 requests are fired when `overrides.json` is left empty.

If you want to drop in real friend-group photos for character faces or custom recorded voice calls / jumpscare audio, place your files inside `public/faces/` or `public/sfx/` and register them in `public/overrides.json`:

```json
{
  "faces": {
    "torge": "./faces/torge.png",
    "anton": "./faces/anton.png",
    "tom": "./faces/tom.png",
    "hauke": "./faces/hauke.png",
    "duck": "./faces/duck.png"
  },
  "sfx": {
    "call_night1": "./sfx/call_night1.ogg",
    "call_night2": "./sfx/call_night2.ogg",
    "call_night3": "./sfx/call_night3.ogg",
    "call_night4": "./sfx/call_night4.ogg",
    "call_night5": "./sfx/call_night5.ogg",
    "jumpscare_torge": "./sfx/jumpscare_torge.ogg",
    "jumpscare_anton": "./sfx/jumpscare_anton.ogg",
    "jumpscare_tom": "./sfx/jumpscare_tom.ogg",
    "jumpscare_hauke": "./sfx/jumpscare_hauke.ogg",
    "jumpscare_duck": "./sfx/jumpscare_duck.ogg"
  }
}
```

## Notes
- **Faces (`faces.<charId>`):** Square (`256x256` or `512x512`) `.png`, `.jpg`, or `.webp` images cropped around the front face. The renderer automatically color-quantizes and composites them onto the sculpted PS1 head UVs and Personalakte portraits while keeping 3D eye-shine pinpoints intact.
- **Audio (`sfx.<cueId>`):** `.ogg`, `.wav`, or `.mp3` files. Unmapped cues continue using the built-in procedural cassette/foley engine seamlessly.
