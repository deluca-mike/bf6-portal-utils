# Battlefield Portal Utils

This repository hosts and maintains custom libraries, tools, examples, and documentation for use with Battlefield 6's
Portal. Whether you're building a new Portal experience or enhancing an existing one, these utilities aim to simplify
common development tasks and provide robust, well-tested solutions for UI creation, debugging, and more.

## Contents

This repository is organized into focused modules, each addressing specific development needs:

- **[Logger Module](./logger/)** – A powerful logging system that displays runtime text directly on-screen, solving
  Battlefield Portal's debugging limitations. Works on all platforms, including console builds.

- **[UI Helper Module](./ui/)** – Object-oriented TypeScript wrappers around Battlefield Portal's UI APIs, providing
  strongly typed helpers, convenient defaults, and ergonomic interfaces for building complex HUDs, panels, and
  interactive buttons.

- **[FFA Spawning Module](./ffa-spawning/)** – Enables Free For All (FFA) spawning for custom Battlefield Portal
  experiences by short-circuiting the normal deploy process in favor of a custom UI prompt. Uses an intelligent
  algorithm to find safe spawn points that are appropriately distanced from other players, reducing the chance of
  spawning directly into combat. It also handles AI players.

- **[Interact Multi-Click Detector Module](./interact-multi-click-detector/)** – Detects when a player has multi-clicked
  the interact key, even when there is no object that can be interacted with nearby. This utility enables custom UI
  triggers and special actions without relying on in-world physical interaction points or awkward movement combinations.

- **[Map Detector Module](./map-detector/)** – Detects the current map by analyzing the coordinates of Team 1's
  Headquarters (HQ), providing a reliable alternative to the broken `mod.IsCurrentMap` API. Supports detection of all
  available maps with fast, coordinate-based identification.

- **[Performance Stats Module](./performance-stats/)** – Monitors and tracks the estimated runtime tick rate of the
  server, providing real-time performance metrics that help identify when the server is under stress or when script
  callbacks are being deprioritized by the game engine.

- **[Sounds Module](./sounds/)** – Abstracts away the nuance, oddities, and pitfalls of playing sounds at runtime in
  Battlefield Portal experiences. Provides efficient sound object management through automatic pooling and reuse,
  handles different playback scenarios (2D global, 2D per-player/squad/team, and 3D positional), and manages sound
  durations automatically.

- **[Timers Module](./timers/)** – Provides `setTimeout` and `setInterval` functionality since Battlefield Portal runs
  in a QuickJS runtime that does not natively include these standard JavaScript timing functions.

- **[Type Definitions](./mod/)** – Complete TypeScript type declarations for Battlefield Portal's `mod` namespace,
  essential for type-safe development. Additional unofficial comments and documentation are added.

## Getting Started

Each module includes its own comprehensive README with:

- Prerequisites and setup instructions
- Usage examples and code snippets
- Complete API reference documentation
- Best practices and common patterns

Browse the module directories above to get started with any specific tool, or explore the repository to discover what's
available.

## Contributing

**Questions, feature requests, and bug reports are very welcome!**

We're actively maintaining these utilities and rely on community feedback to prioritize improvements and fix issues.
Whether you've found a bug, have an idea for a new feature, or just need help getting started, please don't hesitate to
reach out.

- Open an issue for bug reports or feature requests
- Ask questions in discussions or issues
- Share your use cases and success stories—they help shape the roadmap
