#include "proxy.h"
#include "mpris2.h"
#include "message.h"

#include <glib.h>
#include <json-glib/json-glib.h>

static gpointer
listen_stdio(gpointer G_GNUC_UNUSED user_data) {
    JsonParser *parser = NULL;
    do {
        parser = message_read();
        if (!parser) goto next_iteration;
        JsonNode *root_node = json_parser_get_root(parser);
        if (!JSON_NODE_HOLDS_OBJECT(root_node)) {
            goto next_iteration;
        }
        JsonObject *root = json_node_get_object(root_node);
        JsonNode *cmd_node = json_object_get_member(root, "command");
        JsonNode *arg_node = json_object_get_member(root, "argument");
        if (!cmd_node || !arg_node) goto next_iteration;
        if (!JSON_NODE_HOLDS_VALUE(cmd_node)) goto next_iteration;
        const gchar *cmd = json_node_get_string(cmd_node);
        if (!cmd) {
            goto next_iteration;
        } else if (!g_strcmp0(cmd, "set")) {
            mpris2_update_player_properties(arg_node);
        } else if (!g_strcmp0(cmd, "play")) {
            mpris2_update_position(arg_node);
            mpris2_update_playback_status(MPRIS2_PLAYBACK_STATUS_PLAYING);
        } else if (!g_strcmp0(cmd, "pause")) {
            mpris2_update_position(arg_node);
            mpris2_update_playback_status(MPRIS2_PLAYBACK_STATUS_PAUSED);
        } else if (!g_strcmp0(cmd, "progress")) {
            mpris2_update_position(arg_node);
        } else if (!g_strcmp0(cmd, "metadata")) {
            mpris2_update_metadata(arg_node);
        } else if (!g_strcmp0(cmd, "volume")) {
            mpris2_update_volume(arg_node);
        }
    next_iteration:
        if (parser) {
            g_object_unref(parser);
        }
    } while (parser);
    return NULL;
}

gboolean
proxy_listen_commands() {
    GThread *listen_thread = g_thread_new("listen-stdio", listen_stdio, NULL);
    g_thread_unref(listen_thread);
    return TRUE;
}

gboolean
proxy_send_command(JsonNode *node) {
    return message_write(node);
}
