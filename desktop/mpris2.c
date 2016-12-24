#include "mpris2.h"
#include "server.h"
#include "util.h"

#include "mpris-object-core.h"
#include "mpris-object-player.h"

#include <json-glib/json-glib.h>

extern GMainLoop *loop;

static MprisMediaPlayer2 *core = NULL;
static MprisMediaPlayer2Player *player = NULL;

#define DEFINE_PLAYER_COMMAND_CALLBACK(NAME, COMMAND)                   \
    static gboolean NAME##_callback(MprisMediaPlayer2Player *object,    \
                                    GDBusMethodInvocation *call,        \
                                    gpointer *user_data)                \
    {                                                                   \
        UNUSED(user_data);                                              \
        server_send_command(COMMAND, NULL);                             \
        mpris_media_player2_player_complete_##NAME(object, call);       \
        return TRUE;                                                    \
    }                                                                   \

DEFINE_PLAYER_COMMAND_CALLBACK(play, "play")
DEFINE_PLAYER_COMMAND_CALLBACK(pause, "pause")
DEFINE_PLAYER_COMMAND_CALLBACK(previous, "previous")
DEFINE_PLAYER_COMMAND_CALLBACK(next, "next")
DEFINE_PLAYER_COMMAND_CALLBACK(stop, "stop")
DEFINE_PLAYER_COMMAND_CALLBACK(play_pause, "play-pause")

#undef DEFINE_COMMAND_CALLBACK

static gboolean seek_callback(MprisMediaPlayer2Player *object,
                              GDBusMethodInvocation *call,
                              gpointer *user_data)
{
    UNUSED(user_data);
    GVariant *params = g_dbus_method_invocation_get_parameters(call);
    gsize size = g_variant_n_children(params);
    if (size != 1) {
        g_warning("%s '%s': %lu\n", "Invalid method call", "seek", size);
        return FALSE;
    }
    GVariant *offset_variant = g_variant_get_child_value(params, 0);
    gint64 offset_us = g_variant_get_int64(offset_variant);
    g_variant_unref(offset_variant);
    server_send_command("seek", "%" G_GINT64_FORMAT, offset_us / 1000);
    mpris_media_player2_player_complete_seek(object, call);
    return TRUE;
}


static gboolean set_position_callback(MprisMediaPlayer2Player *object,
                                      GDBusMethodInvocation *call,
                                      gpointer user_data)
{
    UNUSED(user_data);
    GVariant *params = g_dbus_method_invocation_get_parameters(call);
    gsize size = g_variant_n_children(params);
    if (size != 2) {
        g_warning("%s '%s': %lu\n", "Invalid method call", "SetPosition", size);
        return FALSE;
    }


    /* GVariant *track_id_variant = g_variant_get_child_value(params, 0); */
    /* const gchar *track_id = g_variant_get_string(track_id_variant, NULL); */
    GVariant *position_variant = g_variant_get_child_value(params, 1);
    gint64 position_us = g_variant_get_int64(position_variant);
    g_variant_unref(position_variant);

    server_send_command("set-position", "%" G_GINT64_FORMAT, position_us / 1000);
    mpris_media_player2_player_complete_set_position(object, call);
    return TRUE;
}


static gboolean quit_callback(MprisMediaPlayer2 *object, GDBusMethodInvocation *call,
                              void *unused)
{
    UNUSED(unused);
    g_main_loop_quit(loop);
    mpris_media_player2_complete_quit(object, call);
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
                                          bus, IFACE_NAME, &error) ||
        !g_dbus_interface_skeleton_export((GDBusInterfaceSkeleton *)player,
                                          bus, IFACE_NAME, &error))
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

void mpris2_update_playback_status(Mpris2PlaybackStatus status,
                                   gint64 position)
{
    const char *status_str = MPRIS2_STATUS_STRING[status];

    if (status_str) {
        g_object_set(player, "playback-status", status_str, NULL);
    }
    if (position >= 0) {
        g_object_set(player, "position", position * 1000, NULL);
    }
}

void mpris2_update_volume(gint volume) {
    if (volume >= 0) {
        g_object_set(player, "volume", volume, NULL);
    }
}

void mpris2_update_metadata(JsonObject *serialized_metadata)
{
    GVariantBuilder builder;
    g_variant_builder_init(&builder, G_VARIANT_TYPE("a{sv}"));

    JsonObjectIter iter;
    const gchar *key;
    JsonNode *value_node;

    json_object_iter_init(&iter, serialized_metadata);
    while (json_object_iter_next(&iter, &key, &value_node)) {
        if (!JSON_NODE_HOLDS_VALUE(value_node)) {
            g_warning("%s", "Wrong format of metadata");
            g_printerr("key = '%s'\n", key);
            continue;
        }

        if (!g_strcmp0(key, "artist")) {
            const gchar *value = json_node_get_string(value_node);
            GVariantBuilder artist;
            g_variant_builder_init(&artist, G_VARIANT_TYPE("as"));
            g_variant_builder_add(&artist, "s", value);
            g_variant_builder_add(&builder, "{sv}",
                                  "xesam:artist",
                                  g_variant_builder_end(&artist));
        } else if (!g_strcmp0(key, "title")) {
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

void mpris2_set_player_property(const gchar *key, gboolean value) {
    g_object_set(player, key, value, NULL);
}

void mpris2_reset_player_properies() {
    for (const gchar **prop = player_properties; *prop != NULL; ++prop) {
        g_object_set(player, *prop, FALSE, NULL);
    }
}
