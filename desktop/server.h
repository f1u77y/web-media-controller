#include <pthread.h>

#ifndef SERVER_H__
#define SERVER_H__

typedef enum {
    NONE = 0, PLAY, PAUSE, NEXT, PREV
} server_command_t;

typedef struct {
    server_command_t next_command;
    struct libwebsocket *wsi;
} server_session_t;

extern server_command_t server_command;
extern pthread_mutex_t server_command_mutex;

void server_init();

#endif
