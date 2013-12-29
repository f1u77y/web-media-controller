#include <pthread.h>

#ifndef SERVER_H__
#define SERVER_H__

enum server_last_cmd_enum {
    NONE = 0, PLAY, PAUSE, NEXT, PREV
};
extern enum server_last_cmd_enum server_last_cmd;
extern pthread_mutex_t server_last_cmd_mutex;

void server_init();

#endif
