#pragma once
#include "globals.h"

// ── Key Simulation (with modifiers) ──
void SendKeyInput(int vk, bool down, int modifiers = 0);
void SimulateKeyCombo(int vk, int modifiers);
void SimulateHoldKey(int vk, bool down);
void SimulateMouseMove(int dx, int dy);
void SimulateScroll(int amount);
void SimulateText(const std::string& text);
