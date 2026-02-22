#include "config.h"
#include "bridge.h"

// ══════════════════════════════════════════
//  Mapping Persistence
// ══════════════════════════════════════════

void SaveMappings(const std::wstring& filename) {
    // Serialize under lock, then write asynchronously to avoid blocking UI
    json j = json::array();
    {
        std::lock_guard<std::recursive_mutex> lock(g_mappingsMutex);
        for (const auto& m : g_mappings) {
            json item = {
                {"midi_type", m.midi_type}, {"midi_num", m.midi_num},
                {"key_vk", m.key_vk}, {"modifiers", m.modifiers},
                {"vel_min", m.vel_min}, {"vel_zone", m.vel_zone},
                {"cc_action", m.cc_action}, {"profile_switch", m.profile_switch}
            };
            if (m.midi_type == 2) item["midi_chord"] = m.midi_chord;
            if (m.midi_type == 4) item["macro_text"] = m.macro_text;
            if (m.midi_type == 5) item["ai_prompt"] = m.ai_prompt;
            if (!m.title_pattern.empty()) item["title_pattern"] = m.title_pattern;
            if (!m.app_pattern.empty()) item["app_pattern"] = m.app_pattern;
            item["gesture_id"] = m.gesture_id;
            item["enabled"] = m.enabled;
            j.push_back(item);
        }
    }
    // Async file write to prevent UI thread blocking on disk I/O
    std::thread([filename, j]() {
        std::ofstream f(filename);
        if (f) f << j.dump(4);
    }).detach();
}

void LoadMappings(const std::wstring& filename) {
    std::ifstream f(filename);
    if (!f) {
        SendLog("Failed to open profile: file not found.", "error");
        return;
    }
    json j;
    try { f >> j; } catch (const std::exception& e) {
        SendLog(std::string("Profile load error: ") + e.what(), "error");
        return;
    } catch (...) {
        SendLog("Profile load error: unknown format.", "error");
        return;
    }
    {
        std::lock_guard<std::recursive_mutex> lock(g_mappingsMutex);
        g_mappings.clear();
        for (const auto& it : j) {
            Mapping m = {};
            m.midi_type = it.value("midi_type", 0);
            m.midi_num = it.value("midi_num", 0);
            if (it.contains("midi_chord") && it["midi_chord"].is_array()) {
                m.midi_chord = it["midi_chord"].get<std::vector<int>>();
            }
            m.macro_text = it.value("macro_text", "");
            m.ai_prompt = it.value("ai_prompt", "");
            m.title_pattern = it.value("title_pattern", "");
            m.app_pattern = it.value("app_pattern", "");
            m.gesture_id = it.value("gesture_id", 0);
            m.key_vk = it.value("key_vk", 0);
            m.modifiers = it.value("modifiers", 0);
            m.vel_min = it.value("vel_min", 1);
            m.vel_zone = it.value("vel_zone", 0);
            m.cc_action = it.value("cc_action", 0);
            m.profile_switch = it.value("profile_switch", -1);
            m.enabled = it.value("enabled", true);
            g_mappings.push_back(m);
        }
    }
    g_lastProfilePath = filename;
    SendMappingsToUI();
}

// ══════════════════════════════════════════
//  Persistent Config
// ══════════════════════════════════════════

void SaveConfig() {
    json cfg;
    cfg["last_port"] = g_lastConnectedPortName;
    cfg["last_profile"] = WideToUtf8(g_lastProfilePath);
    cfg["auto_reconnect"] = g_autoReconnect;
    cfg["app_switching_enabled"] = g_appSwitchingEnabled;
    json bindings = json::object();
    for (auto& [exe, profile] : g_appProfileBindings)
        bindings[WideToUtf8(exe)] = WideToUtf8(profile);
    cfg["app_bindings"] = bindings;
    json slots = json::array();
    for (auto& s : g_profileSlots)
        slots.push_back(WideToUtf8(s));
    cfg["profile_slots"] = slots;
    cfg["ai_api_key"] = g_aiApiKey;
    cfg["ai_global_prompt"] = g_aiGlobalPrompt;
    cfg["velocity_zones_enabled"] = g_velocityZonesEnabled;
    cfg["minimize_to_tray_enabled"] = g_minimizeToTrayEnabled;
    cfg["config_version"] = APP_VERSION;
    std::ofstream f(g_configPath);
    if (f) f << cfg.dump(4);
}

void LoadConfig() {
    std::ifstream f(g_configPath);
    if (!f) return;
    json cfg;
    try { f >> cfg; } catch (...) { return; }
    g_lastConnectedPortName = cfg.value("last_port", "");
    g_lastProfilePath = Utf8ToWide(cfg.value("last_profile", ""));
    g_autoReconnect = cfg.value("auto_reconnect", true);
    g_appSwitchingEnabled = cfg.value("app_switching_enabled", true);
    if (cfg.contains("app_bindings") && cfg["app_bindings"].is_object()) {
        for (auto& [k, v] : cfg["app_bindings"].items())
            g_appProfileBindings[Utf8ToWide(k)] = Utf8ToWide(v.get<std::string>());
    }
    g_aiApiKey = cfg.value("ai_api_key", "");
    g_aiGlobalPrompt = cfg.value("ai_global_prompt", "You are a desktop automation assistant. Perform the following task briefly: {prompt}");
    g_velocityZonesEnabled = cfg.value("velocity_zones_enabled", true);
    g_minimizeToTrayEnabled = cfg.value("minimize_to_tray_enabled", true);

    if (cfg.contains("profile_slots") && cfg["profile_slots"].is_array()) {
        g_profileSlots.clear();
        for (auto& s : cfg["profile_slots"])
            g_profileSlots.push_back(Utf8ToWide(s.get<std::string>()));
    }
}
