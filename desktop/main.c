#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>
#include <pthread.h>
#include <unistd.h>

#include "info.h"
#include "server.h"
#include "grab.h"

static pthread_t grab_thread;
static pthread_t server_thread;

void handle_hotkeys(enum HotkeyEvent e) {
    printf("[handle_hotkeys] e: %d\n", e);

    pthread_mutex_lock(&server_command_mutex);
    switch (e) {
    case HK_PLAY:
        server_command = PLAY;
        break;

    case HK_PAUSE:
        server_command = PAUSE;
        break;

    case HK_NEXT:
        server_command = NEXT;
        break;

    case HK_PREV:
        server_command = PREV;
        break;

    default:
        break;
    }
    pthread_mutex_unlock(&server_command_mutex);
}

void start_grab() {
    int rc = pthread_create(&grab_thread, NULL, (void *)grab_init, handle_hotkeys);
    if (rc) {
        fprintf(stderr, "ERROR creating grab_thread, code = %d\n", rc);
        exit(-1);
    }
}

void start_server() {
    int rc = pthread_create(&server_thread, NULL, (void *)server_init, NULL);
    if (rc) {
        fprintf(stderr, "ERROR creating server_thread, code = %d\n", rc);
        exit(-1);
    }
}

int main(int argc, char **argv) {
    pthread_mutex_init(&server_command_mutex, NULL);

    start_grab();
    start_server();

    while (1) {
        sleep(1);
    }

    return 0;
}
