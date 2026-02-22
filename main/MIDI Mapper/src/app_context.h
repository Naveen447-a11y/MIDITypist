#pragma once
#include "globals.h"

// ── Per-App Switching ──
void CALLBACK WinEventProc(HWINEVENTHOOK hWinEventHook, DWORD event, HWND hwnd,
    LONG idObject, LONG idChild, DWORD dwEventThread, DWORD dwmsEventTime);
void StartAppMonitoring();
void StopAppMonitoring();
