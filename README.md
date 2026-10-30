# Distro Derby

An overhead, single-player arcade racing prototype built with Phaser 3, TypeScript, and Vite. Race three AI cars through a tile-based course, avoid wall damage, and compare finish times.

## Development

Use Node.js 22 LTS or newer and npm.

```sh
npm ci
npm run dev
npm run typecheck
npm run build
npm run preview
```

Open the development URL printed by Vite (port 8080). Arrow keys steer, accelerate, brake, and reverse. Press R to reset the race. The race starts when you first accelerate or reverse. Best time lasts for the current page session. Keyboard controls are required; touch controls are not implemented.

`build` runs strict TypeScript checks before producing `dist/`. Deploy `dist/` to a static host. The legacy `dev-nolog` and `build-nolog` aliases remain available; no scripts send template usage telemetry.

## Code layout

- `src/main.ts`: application entry point.
- `src/game/config.ts`: renderer, scaling, and Arcade Physics setup.
- `src/game/MainScene.ts`: race lifecycle, cars, AI, collisions, effects, and HUD.
- `src/game/level1.ts`: track tiles and AI waypoints.

## Current limits and development direction

This is a playable prototype, not yet a realistic vehicle simulation. Arcade Physics uses axis-aligned car bodies. Corner walls use rectangular bodies with a center-point triangle filter; this can disagree with visible edges. Player velocity is aligned directly with its heading, so sideways grip and drifting are not modeled. Cars do not collide with one another. AI follows fixed waypoints and can become stuck; there is no race timeout or recovery system. Finish overlaps do not enforce checkpoints, direction, or laps. The HUD shares space with the track.

Before adding realistic art or online accounts:

1. Extract race state and vehicle tuning from `MainScene`, with repeatable tests for start, finish, DNF, restart, checkpoint order, and timeout.
2. Establish a vehicle model with longitudinal acceleration, lateral grip, drag, speed-dependent steering, and a fixed simulation step. Evaluate polygon collision support with a small Matter Physics prototype before replacing the existing physics.
3. Replace tile collision approximations with track boundaries and a continuous racing line; add checkpoints, laps, and AI recovery.
4. Separate the HUD from the world camera, expand the track beyond the viewport, and add camera follow and responsive input.
5. Add road textures, verges, curbs, shadows, skid marks, and scenery after handling and collision behavior are verified.
6. Add saved records and hosting, then decide whether multiplayer is actually required. Multiplayer would need server-authoritative race state and additional architecture.

## Cleanup review

The foundation pass fixes strict TypeScript errors, keeps the shared clock running after a player wreck, places AI cars on the starting straight instead of inside the left wall, resets physics bodies along with sprites, and makes coasting and AI traction depend on elapsed time. AI steering no longer allocates temporary velocity vectors each frame, and fire emitters update once per frame. The canvas scales to fit its container. Unused template scenes and usage telemetry were removed.

Validation: strict TypeScript and a production build. Browser driving, corner collision behavior, and AI race completion still need interactive playtesting; these checks do not certify the prototype as production-ready.

The original Phaser template and dependency licenses remain applicable; see LICENSE.
