#include <string.h>
#include <stdio.h>
#include <stdlib.h>
#include <libwebsockets.h>
#include <stdbool.h>

#include "server.h"
#include "vector.h"
#include "info.h"

enum {
    LWS_LOG_ERR         = 1,
    LWS_LOG_WARN        = 2,
    LWS_LOG_NOTICE      = 4,
    LWS_LOG_INFO        = 8,
    LWS_LOG_DEBUG       = 16,
    LWS_LOG_PARSER      = 32,
    LWS_LOG_HEADER      = 64,
    LWS_LOG_EXTENSION   = 128,
    LWS_LOG_CLIENT      = 256,
    LWS_LOG_LATENCY     = 512
};

static struct libwebsocket_context *context;
static const char *server_commands[] = {
    "none", "play", "pause", "next", "prev"
};

server_command_t server_command;
pthread_mutex_t server_command_mutex;
vector *sessions;

static void add_session(server_session_t *pss) {
    vector_add(sessions, pss);
}

static void delete_session(struct libwebsocket *wsi) {
    int count = vector_count(sessions);
    for (int i = 0; i < count; i++) {
        server_session_t *s = vector_get(sessions, i);
        if (s != NULL && s->wsi == wsi) {
            vector_delete(sessions, i);
            break;
        }
    }
}

static void send_command(server_command_t command) {
    int count = vector_count(sessions);
    for (int i = 0; i < count; i++) {
        server_session_t *s = vector_get(sessions, i);
        if (s != NULL) {
            s->next_command = command;
            libwebsocket_callback_on_writable(context, s->wsi);
        }
    }
}

static int callback_http(struct libwebsocket_context *this,
    struct libwebsocket *wsi,
    enum libwebsocket_callback_reasons reason,
    void *user,
    void *in,
    size_t len)
{
    static const char *response = "vkpc, world!";
    switch (reason) {
    case LWS_CALLBACK_HTTP: ;
        libwebsocket_callback_on_writable(context, wsi);
        break;        

    case LWS_CALLBACK_HTTP_WRITEABLE: ;
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
    server_session_t *pss = (server_session_t *)user;
    
    switch (reason) {
    case LWS_CALLBACK_ESTABLISHED:
        lwsl_info("Connection established");

        pss->next_command = NONE;
        pss->wsi = wsi;
        add_session(pss);

        libwebsocket_callback_on_writable(context, wsi);
        break;

    case LWS_CALLBACK_SERVER_WRITEABLE:
        if (pss->next_command != NONE) {
            const char *command = server_commands[pss->next_command];
            int length = strlen(command);

            unsigned char buf[LWS_SEND_BUFFER_PRE_PADDING + length + LWS_SEND_BUFFER_POST_PADDING];
            unsigned char *p = &buf[LWS_SEND_BUFFER_PRE_PADDING];

            strcpy((char *)p, command);
            int m = libwebsocket_write(wsi, p, length, LWS_WRITE_TEXT);

            if (m < length) {
                lwsl_err("ERROR while writing %d bytes to socket\n", length);
                return -1;
            }

            pss->next_command = NONE;
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

void server_init() {
    static struct libwebsocket_protocols protocols[] = {
        { "http-only", callback_http, 0, 0 },
        { "signaling-protocol", callback_signaling, sizeof(server_session_t), 0 },
        { NULL, NULL, 0 }
    };

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

#ifdef DEBUG
    lws_set_log_level(LWS_LOG_ERR | LWS_LOG_WARN | LWS_LOG_NOTICE | LWS_LOG_INFO | LWS_LOG_DEBUG | LWS_LOG_HEADER, NULL);
#else
    lws_set_log_level(0, NULL);
#endif

    context = libwebsocket_create_context(&info);
    if (context == NULL) {
        fprintf(stderr, "libwebsocket init failed\n");
        return;
    }

    while (1) {
        pthread_mutex_lock(&server_command_mutex);
        if (server_command != NONE) {
            send_command(server_command);
            server_command = NONE;
        }
        pthread_mutex_unlock(&server_command_mutex);

        libwebsocket_service(context, 50);
    }

    libwebsocket_context_destroy(context);
    return;
}
