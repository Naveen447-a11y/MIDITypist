#pragma once
#include "globals.h"

// ── MIDI Callback ──
void ProcessMIDIEvent(int type, int number, int velocity);
void midiCallback(double, std::vector<unsigned char>* msg, void*);
void ProcessChord(const std::vector<int>& chord);
void ResolveGesture(int midi_num, int gesture_id);

// ── MIDI Port Management & Auto-Reconnect ──
void ScanMidiPorts();
void ConnectMidi(int portIndex);
void DisconnectMidi();
void TryAutoReconnect();
