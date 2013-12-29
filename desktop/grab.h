#ifndef GRAB_H__
#define GRAB_H__

enum HotkeyEvent {
    HK_PREV, HK_NEXT, HK_PAUSE, HK_PLAY,
    HOTKEYS_COUNT
};
struct Hotkey {
    enum HotkeyEvent event;
    int keycode;
};

void grab_init();

#endif
