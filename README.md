# Battlefield Portal Utils

This repository hosts and maintains custom libraries, tools, examples, and documentation for use with Battlefield 6's Portal. Whether you're building a new Portal experience or enhancing an existing one, these utilities aim to simplify common development tasks and provide robust, well-tested solutions for UI creation, debugging, and more.

## Contents

This repository is organized into focused modules, each addressing specific development needs:

- **[Callback Handler Module](./callback-handler/)** – A small utility for safely invoking callbacks (sync or async). Catches synchronous throws and asynchronous promise rejections, logs them via a passed-in `Logging` instance, and does not rethrow—so a failing callback cannot kill the calling logic. Used internally by Timers, Events, UI, Raycast, and Clocks; use it in your own modules when invoking optional or user-provided callbacks.

- **[Clocks Module](./clocks/)** – Provides **CountUpClock** (stopwatch) and **CountDownClock** (timer) classes for match timers, round timers, or bomb fuse countdowns. Both are efficient and drift-resistant, with callbacks for `onSecond`, `onMinute`, and `onComplete`. Time is tracked at whole-second boundaries to minimize drift; callback errors are caught and logged so they cannot break the clock.

- **[Events Module](./events/)** – A centralized event subscription system that allows multiple handlers to subscribe to the same Battlefield Portal event. This module implements all handlers once and exposes a subscription API, enabling modular code organization, clean separation of concerns, and ensures various handlers execute asynchronously without blocking each other.

- **[FFA Drop-Ins Module](./ffa-drop-ins/)** – Enables Free For All (FFA) spawning with a custom UI prompt and developer-curated drop-in spawn points. You define rectangular regions and an altitude; players spawn in the air and skydive or parachute down. Supports "spawn now" or "ask again after a delay," with configurable queue processing. No safe-distance logic—spawns are distributed across the region.

- **[FFA Spawn Points Module](./ffa-spawn-points/)** – Enables Free For All (FFA) spawning for custom Battlefield Portal experiences by short-circuiting the normal deploy process in favor of a custom UI prompt with developer-curated fixed spawn points. Uses an intelligent algorithm to find safe spawn points that are appropriately distanced from other players, reducing the chance of spawning directly into combat. It also handles AI players.

- **[Logger Module](./logger/)** – A powerful logging system that displays runtime text directly on-screen, solving Battlefield Portal's debugging limitations. Works on all platforms, including console builds.

- **[Logging Module](./logging/)** – A fail-safe logging abstraction that provides configurable log level filtering and error handling for Battlefield Portal experiences. Can be used directly in mods or integrated into other modules to provide consistent, safe logging functionality that prevents logging failures from crashing your mod.

- **[Map Detector Module](./map-detector/)** – Detects the current map by analyzing the coordinates of Team 1's Headquarters (HQ), providing a reliable alternative to the broken `mod.IsCurrentMap` API. Supports detection of all available maps with fast, coordinate-based identification.

- **[Multi-Click Detector Module](./multi-click-detector/)** – Detects when a player has rapidly triggered a soldier state multiple times in quick succession. By default monitors the interact state, enabling custom UI triggers and special actions without relying on in-world physical interaction points. Supports configurable soldier states, time windows, and click counts for flexible multi-click detection.

- **[Performance Stats Module](./performance-stats/)** – Monitors and tracks the estimated runtime tick rate of the server, providing real-time performance metrics that help identify when the server is under stress or when script callbacks are being deprioritized by the game engine.

- **[Player Undeploy Fixer Module](./player-undeploy-fixer/)** – Automatically subscribes to `OnPlayerDied`, `OnPlayerUndeploy`, and `OnPlayerLeaveGame` via the Events module. If a player who died does not undeploy within a fixed time window (e.g. stuck AI in limbo), the fixer triggers `Events.OnPlayerUndeploy.trigger(player)` so subscribers run correctly. No setup required beyond importing the module.

- **[Raycast Module](./raycast/)** – Abstracts Battlefield Portal's raycasting functionality with automatic hit/miss attribution to the correct rays. Handles attribution mechanics, manages time-to-live for rays, and provides a clean callback-based API to make it easier to perform mass obstacle detection, line of sight checks, and interactive object detection.

- **[Scavenger Drop Module](./scavenger-drop/)** – Detects when a player scavenges a dead player's kit bag by monitoring proximity to dead bodies. Provides automatic detection with performance-optimized checking that scales frequency based on distance, configurable callbacks for custom actions (such as ammo resupply), and automatic cleanup when drops expire or are scavenged.

- **[SolidUI Module](./solid-ui/)** – A reactive UI framework inspired by SolidJS, providing fine-grained reactivity for Battlefield Portal UIs. Uses signals, effects, memos, and stores to create dynamic interfaces that update only the specific properties that change, resulting in minimal overhead and maximum performance. Integrates seamlessly with the UI Module.

- **[Sounds Module](./sounds/)** – Abstracts away the nuance, oddities, and pitfalls of playing sounds at runtime in Battlefield Portal experiences. Provides efficient sound object management through automatic pooling and reuse, handles different playback scenarios (2D global, 2D per-player/squad/team, and 3D positional), and manages sound durations automatically.

- **[Timers Module](./timers/)** – Reintroduces `setTimeout` and `setInterval` functionality into BF6 Portal; the familiar JavaScript API makes code more readable and maintainable. It offers significant advantages over `mod.Wait()` since timers can be cancelled and multiple timers can run concurrently without blocking. Ideal for periodic tasks, delayed actions, debouncing, etc.

- **[UI Module](./ui/)** – Object-oriented TypeScript wrappers around Battlefield Portal's UI APIs, providing strongly typed helpers, convenient defaults, and ergonomic interfaces for building complex HUDs, panels, and interactive buttons. Features automatic naming and UI input mode management, eliminating the need to manually track and enable/disable scoped UI input mode when elements are shown or hidden. Includes a growing list of components in subdirectories (containers, buttons, text, images, etc.) that can be separately imported for modular UI construction.

- **[Vectors Module](./vectors/)** – Helpers for working with 3D vectors in Battlefield Portal. Provides a transparent `Vector3` type (`{ x, y, z }`) and conversion to/from opaque `mod.Vector`, plus arithmetic (add, subtract, multiply, divide), distance, truncation, degree/radian and rotation helpers, and a type guard. Use plain objects for local math and convert at API boundaries when calling Portal APIs.

## Getting Started

Each module includes its own comprehensive README with:

- Prerequisites and setup instructions
- Usage examples and code snippets
- Complete API reference documentation
- Best practices and common patterns

Browse the module directories above to get started with any specific tool, or explore the repository to discover what's available.

## Contributing

**Questions, feature requests, and bug reports are very welcome!**

We're actively maintaining these utilities and rely on community feedback to prioritize improvements and fix issues. Whether you've found a bug, have an idea for a new feature, or just need help getting started, please don't hesitate to reach out.

- Open an issue for bug reports or feature requests
- Ask questions in discussions or issues
- Share your use cases and success stories—they help shape the roadmap
