/**
 * TODO: logging level
 */

#include <string.h>
#include <stdio.h>
#include <stdlib.h>
#include <libwebsockets.h>
#include <stdbool.h>

#include "server.h"
#include "vector.h"

#define SERVER_PORT 52178
#define SERVER_HOST "localhost"

static struct libwebsocket_context *context;
static char *server_last_cmd_values[] = {
    "none", "play", "pause", "next", "prev"
};

struct per_session_data {
    bool established;
    char *next_command;
};
struct session {
    struct per_session_data *pss;
    struct libwebsocket *wsi;
};
vector *sessions;

static void add_session(struct libwebsocket *wsi, struct per_session_data *pss) {
    struct session *s = malloc(sizeof(struct session));
    s->wsi = wsi;
    s->pss = pss;
    vector_add(sessions, s);
}

static void delete_session(struct libwebsocket *wsi) {
    for (int i = 0; i < vector_count(sessions); i++) {
        struct session *s = vector_get(sessions, i);
        if (s != NULL && s->wsi == wsi) {
            printf("(delete_session) found, i=%d\n", i);
            free(s);
            vector_delete(sessions, i);
            break;
        }
    }
}

static void send_command_to_all(char *command) {
    printf("Got command: %s\n", command);
    for (int i = 0; i < vector_count(sessions); i++) {
        struct session *s = (struct session *)vector_get(sessions, i);
        s->pss->next_command = command;
        libwebsocket_callback_on_writable(context, s->wsi);
    }
}

static int callback_http(struct libwebsocket_context *this,
    struct libwebsocket *wsi,
    enum libwebsocket_callback_reasons reason,
    void *user,
    void *in,
    size_t len)
{
    switch (reason) {
    case LWS_CALLBACK_HTTP: ;
        libwebsocket_callback_on_writable(context, wsi);
        break;        

    case LWS_CALLBACK_HTTP_WRITEABLE: ;
        char *response = "vkpc, world!";
        libwebsocket_write(wsi, (unsigned char *)response, strlen(response), LWS_WRITE_HTTP);
        return -1;

    default:
        break;
    }
    return 0;
}

static int callback_signaling(struct libwebsocket_context *this,
    struct libwebsocket *wsi,
    enum libwebsocket_callback_reasons reason,
    void *user,
    void *in,
    size_t len)
{
    struct per_session_data *pss = (struct per_session_data *)user;
    
    switch (reason) {
    case LWS_CALLBACK_ESTABLISHED:
        lwsl_info("Connection established");

        pss->established = true;
        pss->next_command = NULL;
        add_session(wsi, pss);

        libwebsocket_callback_on_writable(context, wsi);
        break;

    case LWS_CALLBACK_SERVER_WRITEABLE:
        if (pss->next_command != NULL) {
            int length = strlen(pss->next_command);
            unsigned char buf[LWS_SEND_BUFFER_PRE_PADDING + length + LWS_SEND_BUFFER_POST_PADDING];
            unsigned char *p = &buf[LWS_SEND_BUFFER_PRE_PADDING];

            strcpy((char *)p, pss->next_command);
            int m = libwebsocket_write(wsi, p, length, LWS_WRITE_TEXT);

            if (m < length) {
                lwsl_err("ERROR while writing %d bytes to socket\n", length);
                return -1;
            }

            pss->next_command = NULL;
        }
        break;

    case LWS_CALLBACK_RECEIVE:
        lwsl_info("Received: %s, length: %d\n",
            (char *)in, (int)strlen((char *)in));
        break;

    case LWS_CALLBACK_CLOSED:
        lwsl_info("Connection closed\n");
        delete_session(wsi);
        break;
        
    default:
        break;
    }

    return 0;
}

static struct libwebsocket_protocols protocols[] = {
    { "http-only", callback_http, 0, 0 },
    { "signaling-protocol", callback_signaling, sizeof(struct per_session_data), 0 },
    { NULL, NULL, 0 }
};

void server_init() {
    sessions = vector_create();

    struct lws_context_creation_info info;
    memset(&info, 0, sizeof(info));

    info.port = SERVER_PORT;
    info.iface = SERVER_HOST;
    info.protocols = protocols;
    info.extensions = libwebsocket_get_internal_extensions();
    info.ssl_cert_filepath = NULL;
    info.ssl_private_key_filepath = NULL;
    info.gid = -1;
    info.uid = -1;
    info.options = 0;

    context = libwebsocket_create_context(&info);
    if (context == NULL) {
        fprintf(stderr, "libwebsocket init failed\n");
        return;
    }

    enum server_last_cmd_enum last_cmd = NONE;
    while (1) {
        pthread_mutex_lock(&server_last_cmd_mutex);
        last_cmd = server_last_cmd;
        server_last_cmd = NONE;
        pthread_mutex_unlock(&server_last_cmd_mutex);

        if (last_cmd != NONE) {
            send_command_to_all(server_last_cmd_values[last_cmd]);
        }

        libwebsocket_service(context, 50);
    }

    libwebsocket_context_destroy(context);
    return;
}
