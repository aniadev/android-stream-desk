# Product Brief: Android Stream Desk

## Metadata
- **Status**: Draft
- **Created**: 2026-05-23
- **Updated**: 2026-05-23
- **Stakes**: Passion/Utility Project (Low-mid stakes)

## Executive Summary
Android Stream Desk is a lightweight, self-hosted alternative to physical macro pads like the Elgato Stream Desk. Recognizing that many users have old or spare Android tablets and phones, this project provides a custom control interface running on Android that communicates with a companion application on Windows. 

Using Tauri v2 as the cross-platform framework and Vue 3 for the user interface, the application enables low-latency event transmission over the local network (Wi-Fi). Users can trigger actions on their Windows PC (such as keypress simulations, media controls, app launching, and hotkeys) by pressing virtual buttons on their Android screen.

## The Problem
Physical macro pads (e.g., Elgato Stream Deck) are expensive ($60 - $150+) and occupy physical desk space. Meanwhile, many users have spare, functional Android devices sitting idle in drawers. Existing software alternatives are either riddled with ads, possess outdated user interfaces, rely on cloud subscriptions, or are complicated to set up over local firewalls. There is a need for a free, open-source, lightweight, and modern local network stream deck utility.

## The Solution
A dual-component system built with a single Tauri v2 codebase:
1. **Windows Companion (Server)**: A background-running system tray application implemented in Tauri (Rust backend / Vue frontend for settings) that listens for incoming connection requests via HTTP/WebSocket on the local network. Upon authorized requests, it executes system actions (key simulation, hotkey triggers, multimedia command dispatch, launching applications, volume control).
2. **Android App (Client)**: A touchscreen-optimized Tauri v2 mobile application that connects to the Windows companion via local IP. It displays a customizable layout of cards/buttons (grids like 3x3, 4x5) representing user-defined macros/shortcuts.

Technologies:
- **Tauri v2**: Direct Rust integrations for system controls on Windows, multi-platform build targets (Desktop + Android), low resource footprint.
- **Vue 3**: Reactive state management, quick configuration, custom layout builders, and drag-and-drop support.

## What Makes This Different
- **Tauri v2 Native Performance**: Sub-megabyte package size, low memory consumption compared to Electron.
- **Unified Codebase**: Shared UI components and types between Android client and Windows server setups.
- **Privacy/Local-first**: Completely offline. No cloud account or external internet connectivity required.
- **Vue 3 Component-Driven**: Dynamic grid layout builder that allows custom button icon packs and custom backgrounds.

## Who This Serves
- **Streamers & Content Creators**: Quick deck for OBS scene switches, mic muting, start/stop stream actions.
- **Software Developers & Power Users**: Quick triggers for IDE macros, workspace switching, or window management.
- **General Stream Desk Enthusiasts**: Cost-effective alternative using existing tablets/phones.

## Success Criteria
- **Ultra-low latency**: Delay between touching the Android button and Windows action execution is <50ms.
- **Responsive design**: Grid UI resizes gracefully on phones and tablets.
- **Battery-efficient**: Minimum background CPU cycles when the device screen is off or app is inactive.
- **Stable local discovery**: Easy automatic pairing via local network search or QR scan.

## Scope
### In-Scope (MVP)
- **Establish Local Connection**: Manual IP entry and local WebSocket pairing between Android and Windows.
- **Basic Key Simulation**: Simulated keystrokes, shortcuts (e.g., Ctrl+Shift+M), and system media controls (Play/Pause, volume control).
- **Custom Grid Editor**: Layout configuration (Grid dimension, button labels, icons, background colors).
- **App Launching**: Launch specified programs/executables on the Windows machine.

### Out-of-Scope (Future / Post-MVP)
- **Automatic Discovery**: mDNS discovery of Windows server by Android client.
- **OBS Studio direct integration**: WebSockets protocol connection to OBS.
- **Plugins Ecosystem**: Integrations with Discord, Spotify, etc.
- **Custom Icon Library upload**: Cloud syncing of icons.

## Vision (2-3 Years)
To become the leading open-source local-first control panel framework, hosting a rich ecosystem of custom plugins (written in TypeScript/Rust) that can interface with any local or remote API easily.
