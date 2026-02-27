# MIDITypist: Professional MIDI-to-Desktop Automation Engine (v1.1)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Release](https://img.shields.io/github/v/release/SamuelJoseph23/MIDITypist)](https://github.com/SamuelJoseph23/MIDITypist/releases)

MIDITypist is a high-performance Windows automation utility that translates musical MIDI data into system-level keyboard and mouse commands. By leveraging a hybrid C++/WebView2 architecture, it provides the low-latency response of a native MIDI engine with the high-fidelity design of a modern web frontend.

---

## Installation & Requirements

*   **OS**: Windows 10 or Windows 11 (x64)
*   **Dependencies**: [WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (usually pre-installed on Windows 11).
*   **Hardware**: Any MIDI-compliant controller (USB or via Interface).

**Quick Start**:
1.  Download the [latest release](https://github.com/SamuelJoseph23/MIDITypist/releases).
2.  Extract the zip folder.
3.  Run `MIDITypist.exe`.
4.  Select your MIDI device from the Dynamic Island HUD and click the power button to connect.

---

## Core Features

### Native MIDI Engine
*   **Low-Latency C++ Processing**: Built on a high-performance C++ backend using the RtMidi library for sub-millisecond MIDI-to-input translation.
*   **Hardware Auto-Reconnect**: Intelligent background monitoring that automatically restores your device connection if it's transiently lost or replugged.
*   **Universal MIDI Support**: Works with any standard MIDI controller (Keyboards, Launchpads, Mixers, Drum Pads).
*   **Sustain Pedal Awareness**: Full sustain pedal support with automatic key release on disconnect and shutdown, preventing stuck keys at the OS level.

### Intelligent Automation
*   **Context-Aware Engine**: Automatically filters active mappings based on your foreground application and window title. Set per-mapping app filters (e.g., `chrome.exe`) and title patterns to activate mappings only when relevant.
*   **Profile Management**: Save and share your mapping sets as portable `.json` files. Profiles auto-save on every change, preventing data loss from crashes.
*   **Enable/Disable Mappings**: Toggle individual mappings on or off without deleting them. Disabled mappings are visually dimmed and skipped during MIDI processing.
*   **Undo Delete**: Accidentally deleted a mapping? An undo toast notification gives you 5 seconds to restore it.
*   **Native Learning Mode**: Uses a Low-Level Keyboard Hook (`WH_KEYBOARD_LL`) to capture mapping keys instantly without needing to focus the MIDITypist window.

### Gestures & Chords
*   **Multi-Gesture Triggers**: Every MIDI note can perform 3 distinct actions: **Single Tap**, **Double Tap**, and **Long Hold**.
*   **Chord Mapping**: Group rapid note strikes into a single automation trigger (perfect for power chords or DAW shortcuts).
*   **Velocity Sensitivity**: Map different actions to light (Soft zone) vs. hard (Hard zone) strikes for dynamic control. Velocity zones are indicated on each mapping card.

### AI Assistant (Powered by Gemini)
*   **AI Desktop Automation**: Integrated **Google Gemini Flash** support allows you to trigger intelligent prompts directly from your MIDI controller to perform complex text or system tasks.
*   **Configurable System Prompt**: Set a global instruction template with `{prompt}` injection for dynamic AI triggers.
*   **Rate Limiting**: Built-in 3-second cooldown prevents accidental API credit burn from rapid note triggers.

### System Integration
*   **Tray Operation**: Runs silently in the system tray with real-time status indicators.
*   **Real-time Activity Log**: Monitor every MIDI signal, context switch, and system event with a categorized diagnostic stream. Log entries are color-coded by type (MIDI, errors, context changes).
*   **Zero Admin Required**: Injects input at the user level, requiring no administrative privileges for standard operation.
*   **Graceful Shutdown**: All held and sustained keys are automatically released when the application exits, preventing phantom key presses at the OS level.

---

## User Interface

MIDITypist features a premium, studio-grade interface inspired by Apple, Google, and Microsoft design languages.

### Design Philosophy
*   **Rich Charcoal Theme**: Layered dark backgrounds (`#0F0F11`) with subtle elevation shadows replace flat black for perceived depth.
*   **Gradient Accent System**: Primary actions use a blue-to-purple gradient with glow effects.
*   **Light/Dark Mode**: Full theme toggle accessible from the sidebar.

### Dynamic Island HUD
A floating status bar centered in the header displays:
*   **Connection Status**: Breathing animated dot (green = connected, red = disconnected).
*   **Device Selector**: Inline MIDI port dropdown with power toggle.
*   **Active Context**: Live display of the focused application and window title.
*   **Hover Tooltips**: Native browser tooltips reveal full text for truncated app and window titles.
*   **Quick Actions**: One-click Capture Mapping and Manual Entry buttons.

### Mapping Cards
Each mapping is displayed as a rich information card featuring:
*   **MIDI Note Names**: Displays musical notation (C4, D#5) instead of raw numbers.
*   **Human-Readable Keys**: Shows key names (A, Space, F5) instead of VK codes.
*   **Type Badge**: Color-coded pill (NOTE, CC, CHORD, MACRO, AI) per mapping type.
*   **Color-Coded Left Border**: Blue for Note, Green for CC, Purple for Chord, Orange for Macro, Pink for AI.
*   **Modifier Badges**: Ctrl, Shift, Alt displayed as subtle pills when applied.
*   **Velocity Zone Indicators**: Soft/Hard badges shown when velocity sensitivity is configured.
*   **Mini Toggle Switch**: Enable/disable each mapping with a macOS-style toggle.
*   **3D Tilt Effect**: Cards subtly tilt toward the cursor on hover.
*   **Hover Tooltips**: Tooltips reveal full text for truncated app context filters and title patterns.
*   **Staggered Entry Animation**: Cards animate in sequentially with 30ms delay.

### Edit Modal
A three-zone modal (Header, Body, Footer) with:
*   Type selector, output key capture, gesture configuration.
*   Chord notes (CSV), macro text, and AI prompt fields.
*   App filter and title pattern for context-aware mappings.

### Activity Stream
*   **Card-style log entries** with category-based left-border colors (blue = MIDI, red = error, purple = context).
*   **Separated timestamp badges** for scan-friendly reading.
*   **Live event counter** in the footer bar.

### Preferences
*   **Settings Cards**: Each configuration group is contained in its own elevated card.
*   **Description Subtitles**: Every toggle has a description explaining its purpose.
*   **Engine Controller**: Device selection, connection toggle, auto-reconnect, dynamic app switching, velocity zones, tray mode.
*   **AI Intelligence**: Gemini API key input, global system prompt with `{prompt}` variable support.

### Piano Visualizer
A 128-key piano strip at the bottom of the window:
*   **Gradient-styled keys** with subtle borders.
*   **Active key glow** with accent color when MIDI notes are received.
*   **Sparse delta updates** for efficient real-time rendering.

### Toast Notifications
*   **Status icons**: Checkmark (success), cross (error), warning triangle, info circle.
*   **Colored left accent bar** matching notification severity.
*   **Auto-dismiss** with smooth exit animation.

### Learn Overlay
*   **Animated pulse ring** with MIDI music icon.
*   Full-screen backdrop blur for focus.

---

## Technical Architecture

The application utilizes a dual-layer hybrid architecture with a modular C++ backend.

### Backend (C++/Win32) — Modular Design

The backend is split into focused, single-responsibility modules:

| Module | File(s) | Responsibility |
|--------|---------|----------------|
| **Main Entry** | `main.cpp` | Window procedure, WebView2 init, message dispatch, app lifecycle |
| **MIDI Engine** | `midi_engine.h/cpp` | MIDI callback, chord detection, gesture state machine, port management |
| **Input Simulation** | `input_simulation.h/cpp` | Keyboard, mouse, scroll, and text injection via Win32 `SendInput` |
| **Bridge** | `bridge.h/cpp` | WebView2 message queue, utility functions, UI data serialization |
| **Configuration** | `config.h/cpp` | Profile persistence and application settings (JSON) |
| **App Context** | `app_context.h/cpp` | Foreground window monitoring via `SetWinEventHook` |
| **System Tray** | `tray.h/cpp` | Tray icon, minimize-to-tray, restore |
| **Shared State** | `globals.h` | All includes, defines, data structures, and extern declarations |

**Key Design Decisions:**
*   **Context Filter Optimization**: Window title and app path are pre-computed once per MIDI event, not per-mapping.
*   **Sparse Piano Decay**: Only changed key states are sent to the UI, reducing bridge traffic by approximately 95%.
*   **Chord Bypass**: Chord detection is only active when chord-type mappings exist — single-note users get zero added latency.
*   **Thread-Safe Design**: 7 dedicated mutexes + lock-free atomics protect shared state across the main thread and the RtMidi audio callback thread.
*   **Graceful Shutdown**: All held and sustained keys are automatically released on exit, preventing phantom key presses.

### Frontend (WebView2 / Chromium)
*   **Premium Interface**: A glassmorphic UI with layered elevation, gradient accents, and micro-animations.
*   **Real-time Monitoring**: System logs and a 128-key piano visualizer provide instant feedback on MIDI and automation activity.
*   **Design System**: Comprehensive CSS token system with design variables for colors, shadows, radii, and typography.

---

## Build Requirements (For Developers)

*   **Compiler**: Visual Studio 2022 with the C++ Desktop Development workload.
*   **Language Standard**: C++20.
*   **SDKs**: Windows 10/11 SDK, Microsoft WebView2 SDK, and WIL (available via NuGet).
*   **Dependencies**: RtMidi (included in source), nlohmann/json (included in source).

### Project Structure

```
src/
├── main.cpp               # Entry point, WndProc, WebView2 init, HandleWebMessage
├── globals.h              # Shared includes, defines, structs, extern declarations
├── midi_engine.h/cpp      # MIDI callback, chord/gesture detection, port management
├── input_simulation.h/cpp # Keyboard/mouse/text simulation via SendInput
├── bridge.h/cpp           # WebView2 message bridge, utility functions
├── config.h/cpp           # Profile and application config persistence
├── app_context.h/cpp      # Foreground window monitoring (per-app switching)
├── tray.h/cpp             # System tray integration
├── RtMidi.cpp             # RtMidi library (third-party)
├── json.hpp               # nlohmann/json library (third-party)
└── ui/
    ├── index.html         # Main HTML structure
    ├── app.js             # Frontend logic and bridge communication
    └── design_system.css  # CSS design token system
```

---

## Security and Permissions

MIDITypist requires standard user permissions to inject input. It does not require Administrative privileges unless it needs to interact with other elevated applications. The AI API key is stored locally in the application configuration and is never transmitted to any server other than the Google Gemini API endpoint.

---

## Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

Please see `CONTRIBUTING.md` for details on our code of conduct and the process for submitting pull requests.

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Support

If you find this project helpful, please give it a star on GitHub! For bugs and feature requests, please use the [Issue Tracker](https://github.com/SamuelJoseph23/MIDITypist/issues).

---