#include "server.h"
#include "mpris2.h"
#include "info.h"

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
    GError *error = NULL;
    if (type != SOUP_WEBSOCKET_DATA_TEXT) {
        g_warning("%s\n", "Message type must be text");
        return;
    }

    const gchar *line = g_bytes_get_data(message, NULL);
    if (line == NULL) {
        return;
    }

    JsonParser *parser = json_parser_new();
    if (!json_parser_load_from_data(parser, line, -1, &error)) {
        g_warning("%s", error->message);
        g_error_free(error);
        return;
    }

    JsonNode *root_node = json_parser_get_root(parser);
    if (!JSON_NODE_HOLDS_OBJECT(root_node)) {
        g_warning("%s", "Command must be object {command, argument}");
        goto exit;
    }
    JsonObject *root = json_node_get_object(root_node);
    if (!json_object_has_member(root, "command") ||
        !json_object_has_member(root, "argument"))
    {
        g_warning("%s", "Command must be object {command, argument}");
        goto exit;
    }
    JsonNode *command_node = json_object_get_member(root, "command");
    if (!JSON_NODE_HOLDS_VALUE(command_node)) {
        g_warning("%s", "'command' field must be string");
        goto exit;
    }
    const gchar *command = json_node_get_string(command_node);
    JsonNode *argument = json_object_get_member(root, "argument");

    if (!g_strcmp0(command, "set")) {
        mpris2_update_player_properties(argument);
    } else if (!g_strcmp0(command, "play")) {
        mpris2_update_position(argument);
        mpris2_update_playback_status(MPRIS2_PLAYBACK_STATUS_PLAYING);
    } else if (!g_strcmp0(command, "progress")) {
        mpris2_update_position(argument);
        mpris2_update_playback_status(MPRIS2_PLAYBACK_STATUS_NONE);
    } else if (!g_strcmp0(command, "pause")) {
        mpris2_update_position(argument);
        mpris2_update_playback_status(MPRIS2_PLAYBACK_STATUS_PAUSED);
    } else if (!g_strcmp0(command, "stop")) {
        mpris2_update_playback_status(MPRIS2_PLAYBACK_STATUS_STOPPED);
    } else if (!g_strcmp0(command, "volume")) {
        mpris2_update_volume(argument);
    } else if (!g_strcmp0(command, "metadata")) {
        mpris2_update_metadata(argument);
    }
 exit:
    g_object_unref(parser);
}

static void on_closed(SoupWebsocketConnection *connection,
                      gpointer *user_data)
{
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
    if (cur_connection) {
        soup_websocket_connection_close(cur_connection, 4000, "New connection detected");
    }
    cur_connection = connection;
    g_object_ref(connection);
    g_signal_connect(connection, "message", G_CALLBACK(on_message), NULL);
    g_signal_connect(connection, "closed", G_CALLBACK(on_closed), NULL);
}
