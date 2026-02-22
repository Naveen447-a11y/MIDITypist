#pragma once
#include "globals.h"

// ── System Tray ──
void AddTrayIcon(HWND hwnd);
void RemoveTrayIcon();
void MinimizeToTray(HWND hwnd);
void RestoreFromTray(HWND hwnd);
