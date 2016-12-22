#include "mpris2.h"
#include "server.h"
#include "util.h"

#include "mpris-object-core.h"
#include "mpris-object-player.h"

extern GMainLoop *loop;

static GObject *object_core = NULL;
static GObject *object_player = NULL;

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
    gint64 offset = g_variant_get_int64(offset_variant);
    g_variant_unref(offset_variant);
    server_send_command("SEEK", "%" G_GINT64_FORMAT, offset);
    mpris_media_player2_player_complete_seek(object, call);
    return TRUE;
}

DEFINE_PLAYER_COMMAND_CALLBACK(play, "PLAY")
DEFINE_PLAYER_COMMAND_CALLBACK(pause, "PAUSE")
DEFINE_PLAYER_COMMAND_CALLBACK(previous, "PREVIOUS")
DEFINE_PLAYER_COMMAND_CALLBACK(next, "NEXT")
DEFINE_PLAYER_COMMAND_CALLBACK(stop, "STOP")
DEFINE_PLAYER_COMMAND_CALLBACK(play_pause, "PLAYPAUSE")

#undef DEFINE_COMMAND_CALLBACK

static gboolean quit_callback(MprisMediaPlayer2 *object, GDBusMethodInvocation *call,
                              void *unused)
{
    UNUSED(unused);
    g_main_loop_quit(loop);
    mpris_media_player2_complete_quit(object, call);
    return TRUE;
}


gboolean mpris2_init() {
    GError *error = NULL;
    GDBusConnection *bus = g_bus_get_sync(G_BUS_TYPE_SESSION, NULL, &error);

    if (!bus) {
        g_critical("%s\n", error->message);
        g_error_free(error);
        return FALSE;
    }

    g_bus_own_name_on_connection(bus, OBJECT_NAME,
                                 (GBusNameOwnerFlags)0, NULL, NULL, NULL, NULL);

    object_core = (GObject *)mpris_media_player2_skeleton_new();

    g_object_set (object_core,
                  "can-quit", TRUE,
                  "can-raise", FALSE,
                  "identity", "VkPC",
                  NULL);

    g_signal_connect (object_core, "handle-quit", (GCallback)quit_callback, NULL);

    object_player = (GObject *)mpris_media_player2_player_skeleton_new();

    g_object_set (object_player,
                  "can-control", TRUE,
                  "minimum-rate", 1.0,
                  "maximum-rate", 1.0,
                  "rate", 1.0,
                  NULL);

#define HANDLE_COMMAND(CB_NAME, CB, PROP) do {                        \
        g_signal_connect(object_player, "handle-" #CB_NAME,           \
                         (GCallback)CB##_callback, NULL);             \
        if (sizeof(#PROP) > 1) {                                      \
            g_object_set(object_player, "can-" #PROP, TRUE, NULL);    \
        }                                                             \
    } while (0)

    HANDLE_COMMAND(play, play, play);
    HANDLE_COMMAND(pause, pause, pause);
    HANDLE_COMMAND(seek, seek, seek);
    HANDLE_COMMAND(previous, previous, go-previous);
    HANDLE_COMMAND(next, next, go-next);
    HANDLE_COMMAND(stop, stop, );
    HANDLE_COMMAND(play-pause, play_pause, );

#undef HANDLE_COMMAND


    if (!g_dbus_interface_skeleton_export((GDBusInterfaceSkeleton *)object_core,
                                          bus, IFACE_NAME, &error) ||
        !g_dbus_interface_skeleton_export((GDBusInterfaceSkeleton *)object_player,
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
        g_object_set(object_player, "playback-status", status_str, NULL);
    }
    if (position >= 0) {
        g_object_set(object_player, "position", position * 1000, NULL);
    }
}

void mpris2_update_volume(gint volume) {
    if (volume >= 0) {
        g_object_set(object_player, "volume", volume, NULL);
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
    g_object_set(object_player,
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
    if (!g_strcmp0(key, "all")) {
        for (const gchar **prop = player_properties; *prop != NULL; ++prop) {
            g_object_set(object_player, *prop, value, NULL);
        }
    } else {
        g_object_set(object_player, key, value, NULL);
    }
}
