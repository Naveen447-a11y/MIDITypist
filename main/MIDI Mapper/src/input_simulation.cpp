#include "input_simulation.h"
#include "bridge.h"

// ══════════════════════════════════════════
//  Key Simulation (with modifiers)
// ══════════════════════════════════════════

// ── Improved Key Simulation (Game Compatible) ──
void SendKeyInput(int vk, bool down, int modifiers) {
    std::vector<INPUT> inputs;
    
    // 1. Helper to create ScanCode INPUT
    auto CreateInput = [](int virtualKey, bool isDown) {
        INPUT input = {};
        input.type = INPUT_KEYBOARD;
        UINT sc = MapVirtualKey(virtualKey, MAPVK_VK_TO_VSC);
        input.ki.wScan = (WORD)sc;
        input.ki.dwFlags = KEYEVENTF_SCANCODE | (isDown ? 0 : KEYEVENTF_KEYUP);
        
        // 2. Handle Extended Keys (Arrows, Numpad Enter, etc.)
        if (virtualKey == VK_LEFT || virtualKey == VK_UP || virtualKey == VK_RIGHT || virtualKey == VK_DOWN ||
            virtualKey == VK_PRIOR || virtualKey == VK_NEXT || virtualKey == VK_END || virtualKey == VK_HOME ||
            virtualKey == VK_INSERT || virtualKey == VK_DELETE || virtualKey == VK_DIVIDE || virtualKey == VK_RMENU || 
            virtualKey == VK_RCONTROL) {
            input.ki.dwFlags |= KEYEVENTF_EXTENDEDKEY;
        }
        return input;
    };

    // 3. Press Modifiers (if down)
    if (down && modifiers > 0) {
        if (modifiers & 1) inputs.push_back(CreateInput(VK_CONTROL, true));
        if (modifiers & 2) inputs.push_back(CreateInput(VK_SHIFT, true));
        if (modifiers & 4) inputs.push_back(CreateInput(VK_MENU, true)); // Alt
    }

    // 4. Main Key
    inputs.push_back(CreateInput(vk, down));

    // 5. Release Modifiers (if up)
    if (!down && modifiers > 0) {
        if (modifiers & 4) inputs.push_back(CreateInput(VK_MENU, false));
        if (modifiers & 2) inputs.push_back(CreateInput(VK_SHIFT, false));
        if (modifiers & 1) inputs.push_back(CreateInput(VK_CONTROL, false));
    }

    if (!inputs.empty()) {
        SendInput((UINT)inputs.size(), inputs.data(), sizeof(INPUT));
    }
}

void SimulateKeyCombo(int vk, int modifiers) {
    SendKeyInput(vk, true, modifiers);
    SendKeyInput(vk, false, modifiers);
}

void SimulateHoldKey(int vk, bool down) {
    SendKeyInput(vk, down, 0); // Modifiers not used for simple CC-Hold tags
}

void SimulateMouseMove(int dx, int dy) {
    INPUT input = {};
    input.type = INPUT_MOUSE;
    input.mi.dx = dx;
    input.mi.dy = dy;
    input.mi.dwFlags = MOUSEEVENTF_MOVE;
    SendInput(1, &input, sizeof(INPUT));
}

void SimulateScroll(int amount) {
    INPUT input = {};
    input.type = INPUT_MOUSE;
    input.mi.mouseData = amount;
    input.mi.dwFlags = MOUSEEVENTF_WHEEL;
    SendInput(1, &input, sizeof(INPUT));
}

void SimulateText(const std::string& text) {
    if (text.empty()) return;
    std::wstring wtext = Utf8ToWide(text);
    std::vector<INPUT> inputs;
    for (wchar_t ch : wtext) {
        INPUT inDown = {};
        inDown.type = INPUT_KEYBOARD;
        inDown.ki.wScan = ch;
        inDown.ki.dwFlags = KEYEVENTF_UNICODE;
        inputs.push_back(inDown);

        INPUT inUp = inDown;
        inUp.ki.dwFlags |= KEYEVENTF_KEYUP;
        inputs.push_back(inUp);
    }
    SendInput((UINT)inputs.size(), inputs.data(), sizeof(INPUT));
}
