#pragma once
#include "globals.h"

// ── Mapping Persistence ──
void SaveMappings(const std::wstring& filename);
void LoadMappings(const std::wstring& filename);

// ── Persistent Config ──
void SaveConfig();
void LoadConfig();
