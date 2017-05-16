#include "message.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include <glib.h>
#include <json-glib/json-glib.h>

static GMutex stdin_lock;
static GMutex stdout_lock;

void
messages_init() {
    g_mutex_init(&stdin_lock);
    g_mutex_init(&stdout_lock);
    freopen(NULL, "rb", stdin);
    freopen(NULL, "wb", stdout);
}

static GBytes *
raw_message_read() {
    guchar *buf = NULL;
    GBytes *result = NULL;
    g_mutex_lock(&stdin_lock);

    unsigned char size_bytes[4];
    if (!fread(size_bytes, 4, 1, stdin)) {
        goto out;
    }
    guint32 size = 0;
    for (int i = 0; i < 4; ++i) {
        size |= (guint32)size_bytes[i] << (8 * i);
    }

    buf = g_new(guchar, size + 1);
    buf[size] = 0;
    if (!fread(buf, size, 1, stdin)) {
        goto out;
    }
    result = g_bytes_new(buf, size);

 out:
    g_free(buf);
    g_mutex_unlock(&stdin_lock);
    return result;
}

static gboolean
raw_message_write(GBytes *message) {
    g_mutex_lock(&stdout_lock);
    gboolean result = TRUE;

    gsize size = 0;
    gconstpointer data = g_bytes_get_data(message, &size);
    unsigned char size_bytes[4];
    for (int i = 0; i < 4; ++i) {
        size_bytes[i] = (size >> (8 * i)) & 0xFF;
    }

    if (!fwrite(size_bytes, 4, 1, stdout)) {
        result = FALSE;
        goto out;
    }
    if (!fwrite(data, size, 1, stdout)) {
        result = FALSE;
        goto out;
    }
    fflush(stdout);

 out:
    g_mutex_unlock(&stdout_lock);
    return result;
}

JsonParser *
message_read() {
    GBytes *raw_message = raw_message_read();
    if (!raw_message) {
        return NULL;
    }
    JsonParser *parser = json_parser_new_immutable();
    gsize size = 0;
    gconstpointer data  = g_bytes_get_data(raw_message, &size);
    if (!json_parser_load_from_data(parser, data, size, NULL)) {
        g_object_unref(parser);
        return NULL;
    }
    return parser;
}

gboolean
message_write(JsonNode *node) {
    gchar *data = json_to_string(node, FALSE);
    GBytes *raw_message = g_bytes_new(data, strlen(data));
    gboolean result = raw_message_write(raw_message);
    g_bytes_unref(raw_message);
    g_free(data);
    return result;
}
