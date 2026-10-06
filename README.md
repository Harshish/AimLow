# AimLow

A SvelteKit game using Three.js WebGPU rendering and Rapier physics.

## Development

Use Node.js 22.12+ and pnpm.

```sh
pnpm install
pnpm dev
pnpm test
pnpm check
pnpm build
```

`pnpm test` uses Node's built-in test runner and the existing esbuild dependency.
It covers timing, input, collisions, resource disposal, asset loading, and real
Rapier particle simulation. No browser or additional test framework is required.

## Runtime design

```text
+page.svelte          UI state, canvas ownership, mount/unmount
  App                composition, startup, shutdown
    AssetLoader      concurrent loading, progress, resource ownership
    Camera           camera and OrbitControls
    Renderer         GPU initialization, resize, render
    Resize           viewport listener
    InputController  keyboard state and focus-loss reset
    Loop             cancellable animation frame scheduling
    Physics          Rapier world, colliders, collision routing
    World            fixed-step gameplay coordination
      Environment    level geometry and actors
      WaterJet       particle emission, scoring, instanced drawing
```

- Dependencies are constructor arguments. Runtime components do not import or
  construct `App`; there is no application singleton or service locator.
- `App.init()` waits for assets, physics, and the renderer before creating the
  world. The start button appears only after all three are ready. Loading errors
  are displayed instead of leaving the page stuck.
- Physics and emission run at 60 Hz. Catch-up is capped at 100 ms per frame to
  avoid large bursts after backgrounding. Particle matrices upload once per
  rendered frame, after physics steps. Static meshes are not synchronized each step.
- Svelte owns the loading/start overlay. Shared stores contain only keyboard
  input and score, not services or initialization signals.
- `App.dispose()` stops the loop, detaches listeners, disposes controls and
  particles, frees Rapier memory, and releases shared GPU resources. Async work
  that finishes after unmount is discarded and cleaned up.

## Working on the code

Read `AGENTS.md` and use `graphify-out/graph.json` for navigation when available.
Application code is under `src/`; `static/draco/` is bundled vendor code.

After changing rendering or lifecycle code, also check in a browser:

1. Loading completes and START begins the simulation.
2. Pointer movement aims the jet and collisions change the score.
3. Window resizing updates the canvas and camera.
4. Unmounting during loading and mounting a fresh instance leave no stale loop
   or event listeners.

Three.js and Rapier still produce large production chunks. Rendering performance
needs browser profiling before adding pooling, workers, or further abstractions.
