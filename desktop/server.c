#include "server.h"
#include "mpris2.h"
#include "info.h"
#include "util.h"

#include <string.h>

#include <glib.h>
#include <gio/gio.h>
#include <libsoup/soup.h>
#include <json-glib/json-glib.h>

static SoupWebsocketConnection *cur_connection = NULL;

static void on_new_connection(SoupServer *server,
                              SoupWebsocketConnection *connection,
                              const gchar *path,
                              SoupClientContext *client,
                              gpointer user_data);

gboolean server_send_command(const gchar *command, const gchar *format, ...) {
    if (!cur_connection) {
        return FALSE;
    }
    const size_t BUF_SIZE = 256;
    gchar *buf = g_new(gchar, BUF_SIZE);
    gint size = g_snprintf(buf, BUF_SIZE, "%s", command);
    if (format) {
        buf[size++] = ' ';
        va_list args;
        va_start(args, format);
        g_vsnprintf(buf + size, BUF_SIZE - size, format, args);
        va_end(args);
    }
    soup_websocket_connection_send_text(cur_connection, buf);
    g_free(buf);
    return TRUE;
}

gboolean server_init() {
    SoupServer *server = soup_server_new(NULL, NULL);
    soup_server_add_websocket_handler(server,
                                      NULL, /* "/" */
                                      NULL, /* origin */
                                      NULL, /* protocols */
                                      on_new_connection,
                                      NULL, /* user_data */
                                      NULL /* destroy */
                                      );
    GError *error = NULL;
    if (!soup_server_listen_local(server, SERVER_PORT, 0, &error)) {
        g_critical("%s\n", error->message);
        g_error_free(error);
        return FALSE;
    }

    return TRUE;
}

static void on_message(SoupWebsocketConnection *connection,
                       gint type,
                       GBytes *message,
                       gpointer *user_data)
{
    UNUSED(connection);
    UNUSED(user_data);
    GError *error = NULL;
    if (type != SOUP_WEBSOCKET_DATA_TEXT) {
        g_warning("%s\n", "Message type must be text");
        return;
    }
    const gchar *line = g_bytes_get_data(message, NULL);
    gchar *command = NULL;
    gchar *arg = NULL;
    command_with_arg(line, &command, &arg);
    if (line == NULL) {
        return;
    } else if (!g_strcmp0(command, "set")) {
        JsonParser *parser = json_parser_new();
        if (!json_parser_load_from_data(parser, arg, -1, &error)) {
            g_warning("%s\n", error->message);
            g_error_free(error);
            goto end_set_parsing;
        }
        JsonNode *root_node = json_parser_get_root(parser);
        if (!JSON_NODE_HOLDS_OBJECT(root_node)) {
            g_warning("%s", "Wrong format of parameters");
            g_printerr("Parameters = '%s'\n", arg);
            goto end_set_parsing;
        }
        JsonObject *root = json_node_get_object(root_node);
        JsonObjectIter iter;
        const gchar *key;
        JsonNode *value_node;

        json_object_iter_init(&iter, root);
        while (json_object_iter_next(&iter, &key, &value_node)) {
            if (!JSON_NODE_HOLDS_VALUE(value_node)) {
                g_warning("%s", "Wrong format of parameters");
                g_printerr("Parameters = '%s'\n", arg);
                goto end_set_parsing;
            } else {
                mpris2_set_player_property(key, json_node_get_boolean(value_node));
            }
        }
    end_set_parsing:
        g_object_unref(parser);
    } else if (!g_strcmp0(command, "reset")) {
        mpris2_reset_player_properies();
    } else if (!g_strcmp0(command, "play")) {
        mpris2_update_playback_status(MPRIS2_PLAYBACK_STATUS_PLAYING,
                                      get_number(arg));
    } else if (!g_strcmp0(command, "progress")) {
        mpris2_update_playback_status(MPRIS2_PLAYBACK_STATUS_NONE,
                                      get_number(arg));
    } else if (!g_strcmp0(command, "pause")) {
        mpris2_update_playback_status(MPRIS2_PLAYBACK_STATUS_PAUSED,
                                      get_number(arg));
    } else if (!g_strcmp0(command, "stop")) {
        mpris2_update_playback_status(MPRIS2_PLAYBACK_STATUS_STOPPED, 0);
    } else if (!g_strcmp0(command, "volume")) {
        mpris2_update_volume(get_number(arg));
    } else if (!g_strcmp0(command, "metadata")) {
        gchar *artist = NULL;
        gchar *title = NULL;
        gchar *album = NULL;
        gchar *url = NULL;
        gint64 length = 0;
        gchar *art_url = NULL;

        JsonParser *parser = json_parser_new();
        if (!json_parser_load_from_data(parser, arg, -1, &error)) {
            g_warning("%s\n", error->message);
            g_error_free(error);
            goto end_parsing;
        }
        JsonNode *root_node = json_parser_get_root(parser);
        if (!JSON_NODE_HOLDS_OBJECT(root_node)) {
            g_warning("%s", "Wrong format of metadata");
            g_printerr("Metadata = '%s'\n", arg);
            goto end_parsing;
        }
        JsonObject *root = json_node_get_object(root_node);
        JsonObjectIter iter;
        const gchar *key;
        JsonNode *value_node;

        json_object_iter_init(&iter, root);
        while (json_object_iter_next(&iter, &key, &value_node)) {
            if (!JSON_NODE_HOLDS_VALUE(value_node)) {
                g_warning("%s", "Wrong format of metadata");
                g_printerr("Metadata = '%s'\n", arg);
            } else if (!g_strcmp0(key, "artist")) {
                artist = json_node_dup_string(value_node);
            } else if (!g_strcmp0(key, "title")) {
                title = json_node_dup_string(value_node);
            } else if (!g_strcmp0(key, "album")) {
                album = json_node_dup_string(value_node);
            } else if (!g_strcmp0(key, "url")) {
                url = json_node_dup_string(value_node);
            } else if (!g_strcmp0(key, "length")) {
                length = json_node_get_int(value_node);
            } else if (!g_strcmp0(key, "art-url")) {
                art_url = json_node_dup_string(value_node);
            } else {
                g_warning("%s", "Wrong format of metadata");
                g_printerr("Metadata = '%s'\n", arg);
            }
        }
    end_parsing:
        mpris2_update_metadata(artist, title, album, url, length, art_url);
        g_object_unref(parser);
    }

    g_free(command);
    g_free(arg);
}

static void on_closed(SoupWebsocketConnection *connection,
                      gpointer *user_data)
{
    UNUSED(user_data);
    g_object_unref(connection);
    if (cur_connection == connection) {
        cur_connection = NULL;
    }
}

static void on_new_connection(SoupServer *server,
                              SoupWebsocketConnection *connection,
                              const gchar *path,
                              SoupClientContext *client,
                              gpointer user_data)
{
    UNUSED(server);
    UNUSED(path);
    UNUSED(client);
    UNUSED(user_data);
    if (cur_connection) {
        soup_websocket_connection_close(cur_connection, 4000, "New connection detected");
    }
    cur_connection = connection;
    g_object_ref(connection);
    g_signal_connect(connection, "message", G_CALLBACK(on_message), NULL);
    g_signal_connect(connection, "closed", G_CALLBACK(on_closed), NULL);
}
