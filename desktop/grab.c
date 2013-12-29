#include <stdio.h>
#include <stdbool.h>
#include <X11/Xlib.h>
#include <X11/Xutil.h>
#include <X11/XF86keysym.h>
#include "grab.h"

static int error_handler(Display *dpy, XErrorEvent *err) {
    fprintf(stderr, "Failed to grab key!\n");
    return 0;
}

void grab_init(void (*handler)(enum HotkeyEvent e)) {
    Display *dpy = XOpenDisplay(0);
    Window root = DefaultRootWindow(dpy);
    XEvent ev;

    struct Hotkey hotkeys[HOTKEYS_COUNT] = {
        { HK_PAUSE, XKeysymToKeycode(dpy, XF86XK_AudioPause) },
        { HK_PLAY, XKeysymToKeycode(dpy, XF86XK_AudioPlay) },
        { HK_NEXT, XKeysymToKeycode(dpy, XF86XK_AudioNext) },
        { HK_PREV, XKeysymToKeycode(dpy, XF86XK_AudioPrev) }
    };

    XSetErrorHandler(error_handler);

    for (int i = 0; i < HOTKEYS_COUNT; i++) {
        XGrabKey(dpy, hotkeys[i].keycode, 0, root, false, GrabModeAsync, GrabModeAsync);
    }

    XSelectInput(dpy, root, KeyPressMask);
    while (true) {
        XNextEvent(dpy, &ev);

        switch (ev.type) {
        case KeyPress: ;
            for (int i = 0; i < HOTKEYS_COUNT; i++) {
                if (ev.xkey.keycode == hotkeys[i].keycode) {
                    (*handler)(hotkeys[i].event);
                    break;
                }
            }
            break;

        default:
            break;
        }
    }

    XCloseDisplay(dpy);
}
