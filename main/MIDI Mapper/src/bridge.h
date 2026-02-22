#pragma once
#include "globals.h"

// ── Utility Functions ──
std::wstring Utf8ToWide(const std::string& str);
std::string WideToUtf8(const std::wstring& wstr);
std::wstring GetKeyName(int vk);
std::wstring GetModifierString(int mods);
std::wstring GetConfigDir();

// ── WebView2 Message Bridge ──
void PostToWebView(const json& msg);
void SendLog(const std::string& text, const std::string& category = "system");
void SendStatus(const std::string& text);
void SendMappingsToUI();
