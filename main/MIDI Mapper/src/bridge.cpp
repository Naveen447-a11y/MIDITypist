#include "bridge.h"

// ══════════════════════════════════════════
//  Utility Functions
// ══════════════════════════════════════════

std::wstring Utf8ToWide(const std::string& str) {
    if (str.empty()) return L"";
    int len = MultiByteToWideChar(CP_UTF8, 0, str.c_str(), (int)str.size(), nullptr, 0);
    std::wstring wstr(len, L'\0');
    MultiByteToWideChar(CP_UTF8, 0, str.c_str(), (int)str.size(), &wstr[0], len);
    return wstr;
}

std::string WideToUtf8(const std::wstring& wstr) {
    if (wstr.empty()) return "";
    int len = WideCharToMultiByte(CP_UTF8, 0, wstr.c_str(), (int)wstr.size(), nullptr, 0, nullptr, nullptr);
    std::string str(len, '\0');
    WideCharToMultiByte(CP_UTF8, 0, wstr.c_str(), (int)wstr.size(), &str[0], len, nullptr, nullptr);
    return str;
}

std::wstring GetKeyName(int vk) {
    UINT sc = MapVirtualKey(vk, MAPVK_VK_TO_VSC);
    long param = (sc << 16);
    if (vk == VK_INSERT || vk == VK_DELETE || vk == VK_HOME || vk == VK_END ||
        vk == VK_NEXT || vk == VK_PRIOR || vk == VK_LEFT || vk == VK_RIGHT ||
        vk == VK_UP || vk == VK_DOWN || vk == VK_DIVIDE) {
        param |= (1 << 24);
    }
    wchar_t name[64] = { 0 };
    if (GetKeyNameText(param, name, 64) > 0) return name;
    std::wstringstream ws;
    ws << L"VK_" << vk;
    return ws.str();
}

std::wstring GetModifierString(int mods) {
    std::wstring s;
    if (mods & 1) s += L"Ctrl+";
    if (mods & 2) s += L"Shift+";
    if (mods & 4) s += L"Alt+";
    return s;
}

std::wstring GetConfigDir() {
    wchar_t path[MAX_PATH];
    GetModuleFileNameW(NULL, path, MAX_PATH);
    std::wstring p(path);
    return p.substr(0, p.find_last_of(L"\\") + 1);
}

// ══════════════════════════════════════════
//  WebView2 Message Bridge
// ══════════════════════════════════════════

void PostToWebView(const json& msg) {
    if (!g_webview) return;
    {
        std::lock_guard<std::mutex> lock(g_uiMessageMutex);
        g_uiMessageQueue.push(msg);
    }
    if (g_hwndMain) PostMessage(g_hwndMain, WM_UI_BRIDGE_SIGNAL, 0, 0);
}

void SendLog(const std::string& text, const std::string& category) {
    PostToWebView({ {"type", "log"}, {"text", text}, {"category", category} });
}

void SendStatus(const std::string& text) {
    PostToWebView({ {"type", "status"}, {"text", text} });
}

void SendMappingsToUI() {
    json arr = json::array();
    
    // Performance optimization: Check if chords or gestures are needed
    bool hasChords = false;
    std::set<int> gestureNotes;

    std::lock_guard<std::recursive_mutex> lock(g_mappingsMutex);
    for (const auto& m : g_mappings) {
        if (m.midi_type == 2) hasChords = true;
        if (m.gesture_id > 0) gestureNotes.insert(m.midi_num);

        std::wstring targetDisplay;
        if (m.profile_switch >= 0) {
            targetDisplay = L"[Profile #" + std::to_wstring(m.profile_switch) + L"]";
        } else if (m.midi_type == 1 && m.cc_action > 0) {
            const wchar_t* actions[] = { L"", L"MouseX", L"MouseY", L"Scroll", L"HoldKey" };
            targetDisplay = actions[m.cc_action];
            if (m.cc_action == 4) targetDisplay += L"(" + GetKeyName(m.key_vk) + L")";
        } else {
            targetDisplay = GetModifierString(m.modifiers) + GetKeyName(m.key_vk);
        }

        json item = {
            {"midi_type", m.midi_type}, {"midi_num", m.midi_num},
            {"key_vk", m.key_vk}, {"modifiers", m.modifiers},
            {"vel_min", m.vel_min}, {"vel_zone", m.vel_zone},
            {"cc_action", m.cc_action}, {"profile_switch", m.profile_switch},
            {"target_display", WideToUtf8(targetDisplay)},
            {"macro_text", m.macro_text},
            {"ai_prompt", m.ai_prompt},
            {"title_pattern", m.title_pattern},
            {"app_pattern", m.app_pattern},
            {"gesture_id", m.gesture_id}
        };
        if (m.midi_type == 2) item["midi_chord"] = m.midi_chord;
        item["enabled"] = m.enabled;
        arr.push_back(item);
    }

    g_chordsEnabled.store(hasChords, std::memory_order_release);
    {
        std::lock_guard<std::mutex> gLock(g_gestureNotesMutex);
        g_gestureNotes = gestureNotes;
    }
    PostToWebView({ {"type", "mappings"}, {"mappings", arr} });
}
