#include "mpris2.h"
#include "server.h"
#include "util.h"

#include "mpris-object-core.h"
#include "mpris-object-player.h"

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
        g_critical("%s\n", error->message);
        g_error_free(error);
        return FALSE;
    }

    return TRUE;
}

void mpris2_update_playback_status(Mpris2PlaybackStatus status,
                                   gint64 position)
{
    char *status_str = NULL;
    switch (status) {
    case MPRIS2_PLAYBACK_STATUS_NONE:
        status_str = NULL;
        break;
    case MPRIS2_PLAYBACK_STATUS_PLAYING:
        status_str = "Playing";
        break;
    case MPRIS2_PLAYBACK_STATUS_PAUSED:
        status_str = "Paused";
        break;
    default:
        status_str = "Stopped";
        break;
    }

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

static GVariant *singleton_from_string(const gchar* arg) {
    GVariant *str = g_variant_new_string(arg);
    return g_variant_new_array(G_VARIANT_TYPE_STRING, &str, 1);
}

void mpris2_update_metadata(const gchar *artist,
                            const gchar *title,
                            const gchar *album,
                            const gchar *url,
                            gint64 length,
                            const gchar *art_url)
{
    GVariant *elems[7];
    gsize nelems = 0;

#define INIT_STRING(arg) g_variant_new_string(arg)
#define INIT_ARRAY(arg) singleton_from_string(arg)
#define INIT_LENGTH(arg) g_variant_new_int64((arg) * 1000)

#define SET_METADATA(arg, key_str, init_val) do {                   \
        if (arg) {                                                  \
            GVariant *key = g_variant_new_string(key_str);          \
            GVariant *tmp = init_val(arg);                          \
            GVariant *val = g_variant_new_variant(tmp);             \
            elems[nelems++] = g_variant_new_dict_entry(key, val);   \
        }                                                           \
    } while (0)

    SET_METADATA(artist, "xesam:artist", INIT_ARRAY);
    SET_METADATA(title, "xesam:title", INIT_STRING);
    SET_METADATA(album, "xesam:album", INIT_STRING);
    SET_METADATA(url, "xesam:url", INIT_STRING);
    SET_METADATA(length, "mpris:length", INIT_LENGTH);
    SET_METADATA(art_url, "mpris:artUrl", INIT_STRING);

    const gchar *cur_track = "/org/mpris/MediaPlayer2/CurrentTrack";
    SET_METADATA(cur_track, "mpris:trackid", INIT_STRING);

#undef INIT_STRING
#undef INIT_ARRAY
#undef INIT_LENGTH
#undef SET_METADATA

    GVariant *metadata = g_variant_new_array(G_VARIANT_TYPE("{sv}"), elems, nelems);
    g_object_set(player,
                 "metadata", metadata,
                 NULL);
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
