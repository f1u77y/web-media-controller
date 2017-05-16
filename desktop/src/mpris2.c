#include "mpris2.h"
#include "proxy.h"

#include "mpris-object-core.h"
#include "mpris-object-player.h"

#include <math.h>
#include <json-glib/json-glib.h>

extern GMainLoop *loop;

static MprisMediaPlayer2 *core = NULL;
static MprisMediaPlayer2Player *player = NULL;

static JsonBuilder *
make_command(const gchar *command) {
    JsonBuilder *builder = json_builder_new();
    json_builder_begin_object(builder);
    json_builder_set_member_name(builder, "command");
    json_builder_add_string_value(builder, command);
    json_builder_set_member_name(builder, "argument");
    return builder;
}


#define DEFINE_PLAYER_COMMAND_CALLBACK(NAME, COMMAND)                   \
    static gboolean NAME##_callback(MprisMediaPlayer2Player *player,    \
                                    GDBusMethodInvocation *call,        \
                                    gpointer G_GNUC_UNUSED user_data)   \
    {                                                                   \
        JsonBuilder *builder = make_command(COMMAND);                   \
        json_builder_add_null_value(builder);                           \
        json_builder_end_object(builder);                               \
        proxy_send_command(json_builder_get_root(builder));             \
        json_builder_reset(builder);                                    \
        mpris_media_player2_player_complete_##NAME(player, call);       \
        return TRUE;                                                    \
    }                                                                   \

DEFINE_PLAYER_COMMAND_CALLBACK(play, "play")
DEFINE_PLAYER_COMMAND_CALLBACK(pause, "pause")
DEFINE_PLAYER_COMMAND_CALLBACK(previous, "previous")
DEFINE_PLAYER_COMMAND_CALLBACK(next, "next")
DEFINE_PLAYER_COMMAND_CALLBACK(stop, "stop")
DEFINE_PLAYER_COMMAND_CALLBACK(play_pause, "play-pause")

#undef DEFINE_PLAYER_COMMAND_CALLBACK

static gboolean seek_callback(MprisMediaPlayer2Player *player,
                              GDBusMethodInvocation *call,
                              gint64 offset_us,
                              gpointer G_GNUC_UNUSED user_data)
{
    JsonBuilder *builder = make_command("seek");
    json_builder_add_int_value(builder, offset_us);
    json_builder_end_object(builder);
    proxy_send_command(json_builder_get_root(builder));
    json_builder_reset(builder);
    mpris_media_player2_player_complete_seek(player, call);
    return TRUE;
}


static gboolean set_position_callback(MprisMediaPlayer2Player *player,
                                      GDBusMethodInvocation *call,
                                      const gchar * G_GNUC_UNUSED track_id,
                                      gint64 position_us,
                                      gpointer G_GNUC_UNUSED user_data)
{
    JsonBuilder *builder = make_command("set-position");
    json_builder_add_int_value(builder, position_us);
    json_builder_end_object(builder);
    proxy_send_command(json_builder_get_root(builder));
    mpris_media_player2_player_complete_set_position(player, call);
    return TRUE;
}


static gboolean quit_callback(MprisMediaPlayer2 *core,
                              GDBusMethodInvocation *call,
                              gpointer G_GNUC_UNUSED user_data)
{
    g_main_loop_quit(loop);
    mpris_media_player2_complete_quit(core, call);
    return TRUE;
}

static void mpris2_core_init() {
    core = mpris_media_player2_skeleton_new();

    mpris_media_player2_set_can_quit(core, TRUE);
    mpris_media_player2_set_can_raise(core, FALSE);
    mpris_media_player2_set_identity(core, "VkPC");

    g_signal_connect (core, "handle-quit", G_CALLBACK(quit_callback), NULL);
}

static void mpris2_player_init() {
    player = mpris_media_player2_player_skeleton_new();

    mpris_media_player2_player_set_minimum_rate(player, 1.0);
    mpris_media_player2_player_set_maximum_rate(player, 1.0);
    mpris_media_player2_player_set_rate(player, 1.0);

    g_signal_connect(player, "handle-play", G_CALLBACK(play_callback), NULL);
    g_signal_connect(player, "handle-pause", G_CALLBACK(pause_callback), NULL);
    g_signal_connect(player, "handle-stop", G_CALLBACK(stop_callback), NULL);
    g_signal_connect(player, "handle-play-pause", G_CALLBACK(play_pause_callback), NULL);
    g_signal_connect(player, "handle-previous", G_CALLBACK(previous_callback), NULL);
    g_signal_connect(player, "handle-next", G_CALLBACK(next_callback), NULL);
    g_signal_connect(player, "handle-seek", G_CALLBACK(seek_callback), NULL);
    g_signal_connect(player, "handle-set-position",
                     G_CALLBACK(set_position_callback), NULL);
}


gboolean mpris2_init() {
    GError *error = NULL;
    GDBusConnection *bus = g_bus_get_sync(G_BUS_TYPE_SESSION, NULL, &error);

    if (!bus) {
        g_critical("%s\n", error->message);
        g_error_free(error);
        return FALSE;
    }

    guint owner_id = g_bus_own_name_on_connection(bus, OBJECT_NAME,
                                                  G_BUS_NAME_OWNER_FLAGS_NONE,
                                                  NULL, NULL, NULL, NULL);

    mpris2_core_init();
    mpris2_player_init();

    if (!g_dbus_interface_skeleton_export((GDBusInterfaceSkeleton *)core,
                                          bus,
                                          IFACE_NAME,
                                          &error)
        ||
        !g_dbus_interface_skeleton_export((GDBusInterfaceSkeleton *)player,
                                          bus,
                                          IFACE_NAME,
                                          &error))
    {
        g_bus_unown_name(owner_id);
        g_critical("%s\n", error->message);
        g_error_free(error);
        return FALSE;
    }

    return TRUE;
}


static const char *MPRIS2_STATUS_STRING[] = {
    NULL,
    "Playing",
    "Paused",
    "Stopped",
};

void mpris2_update_playback_status(Mpris2PlaybackStatus status) {
    const char *status_str = MPRIS2_STATUS_STRING[status];

    if (status_str) {
        g_object_set(player, "playback-status", status_str, NULL);
    }
}

void mpris2_update_position(JsonNode *argument) {
    if (JSON_NODE_HOLDS_NULL(argument)) {
        return;
    }
    if (!JSON_NODE_HOLDS_VALUE(argument)) {
        g_warning("%s", "Argument of 'position' command must be int or null");
        return;
    }
    gdouble position = json_node_get_double(argument);
    gint64 position_us = round(position * 1000);
    g_object_set(player, "position", position_us, NULL);
}

void mpris2_update_volume(JsonNode *argument) {
    if (!JSON_NODE_HOLDS_VALUE(argument)) {
        g_warning("%s", "Argument of 'volume' command must be a number");
        return;
    }
    gdouble volume = json_node_get_double(argument);
    mpris_media_player2_player_set_volume(player, volume);
}

static void mpris2_add_string_to_builder(JsonArray G_GNUC_UNUSED *array,
                                         guint G_GNUC_UNUSED index,
                                         JsonNode *element_node,
                                         gpointer user_data)
{
    GVariantBuilder *builder = (GVariantBuilder *)user_data;
    if (!JSON_NODE_HOLDS_VALUE(element_node)) {
        g_warning("'artist' property of metadata must be string or array of strings");
        return;
    }
    const gchar *value = json_node_get_string(element_node);
    g_variant_builder_add(builder, value);
}

void mpris2_update_metadata(JsonNode *argument)
{
    if (!JSON_NODE_HOLDS_OBJECT(argument)) {
        g_warning("%s", "Argument of 'metadata' command must be an object");
        return;
    }
    JsonObject *serialized_metadata = json_node_get_object(argument);

    GVariantBuilder builder;
    g_variant_builder_init(&builder, G_VARIANT_TYPE("a{sv}"));

    JsonObjectIter iter;
    const gchar *key;
    JsonNode *value_node;

    json_object_iter_init(&iter, serialized_metadata);
    while (json_object_iter_next(&iter, &key, &value_node)) {
        if (!g_strcmp0(key, "artist")) {
            GVariantBuilder artist;
            g_variant_builder_init(&artist, G_VARIANT_TYPE("as"));
            if (JSON_NODE_HOLDS_VALUE(value_node)) {
                const gchar *value = json_node_get_string(value_node);
                g_variant_builder_add(&artist, "s", value);
            } else if (JSON_NODE_HOLDS_ARRAY(value_node)) {
                JsonArray *array = json_node_get_array(value_node);
                json_array_foreach_element(array,
                                           mpris2_add_string_to_builder,
                                           &artist);
            } else {
                g_warning("'artist' property of metadata must be string"
                          "or array of strings");
            }
            g_variant_builder_add(&builder, "{sv}",
                                  "xesam:artist",
                                  g_variant_builder_end(&artist));
            continue;
        }

        if (!JSON_NODE_HOLDS_VALUE(value_node)) {
            g_warning("%s", "Wrong format of metadata");
            g_printerr("key = '%s'\n", key);
            continue;
        }


        if (!g_strcmp0(key, "title")) {
            const gchar *value = json_node_get_string(value_node);
            g_variant_builder_add(&builder, "{sv}",
                                  "xesam:title",
                                  g_variant_new_string(value));
        } else if (!g_strcmp0(key, "album")) {
            const gchar *value = json_node_get_string(value_node);
            g_variant_builder_add(&builder, "{sv}",
                                  "xesam:album",
                                  g_variant_new_string(value));
        } else if (!g_strcmp0(key, "url")) {
            const gchar *value = json_node_get_string(value_node);
            g_variant_builder_add(&builder, "{sv}",
                                  "xesam:url",
                                  g_variant_new_string(value));
        } else if (!g_strcmp0(key, "length")) {
            gint64 value = json_node_get_int(value_node);
            g_variant_builder_add(&builder, "{sv}",
                                  "mpris:length",
                                  g_variant_new_int64(value * 1000));
        } else if (!g_strcmp0(key, "art-url")) {
            const gchar *value = json_node_get_string(value_node);
            g_variant_builder_add(&builder, "{sv}",
                                  "mpris:artUrl",
                                  g_variant_new_string(value));
        } else {
            g_warning("%s", "Wrong format of metadata");
            g_printerr("key = '%s'\n", key);
        }
    }

    g_variant_builder_add(&builder, "{sv}",
                          "mpris:trackid",
                          g_variant_new_string("/org/mpris/MediaPlayer2/CurrentTrack"));


    GVariant *metadata = g_variant_builder_end(&builder);
    mpris_media_player2_player_set_metadata(player, metadata);
}

static const gchar* player_properties[] = {
    "can-control",
    "can-go-next",
    "can-go-previous",
    "can-pause",
    "can-play",
    "can-seek",
    NULL
};

void mpris2_update_player_properties(JsonNode *props_node) {
    if (JSON_NODE_HOLDS_VALUE(props_node)) {
        gboolean value = json_node_get_boolean(props_node);
        for (const gchar **prop = player_properties; *prop != NULL; ++prop) {
            g_object_set(player, *prop, value, NULL);
        }
    } else if (JSON_NODE_HOLDS_OBJECT(props_node)) {
        JsonObject *root = json_node_get_object(props_node);
        JsonObjectIter iter;
        const gchar *key;
        JsonNode *value_node;

        json_object_iter_init(&iter, root);
        while (json_object_iter_next(&iter, &key, &value_node)) {
            if (JSON_NODE_HOLDS_VALUE(value_node)) {
                g_object_set(player,
                             key, json_node_get_boolean(value_node),
                             NULL);
            } else {
                g_warning("%s", "Wrong format of properties");
                g_printerr("key = '%s'\n", key);
            }
        }
    } else {
        g_warning("%s", "Wrong format of properties");
    }
}
