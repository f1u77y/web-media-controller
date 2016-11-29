#include "mpris2.h"

#include "mpris-object-core.h"
#include "mpris-object-player.h"

#define UNUSED(expr) (void)expr

extern GMainLoop *loop;

static GObject *object_core = NULL;
static GObject *object_player = NULL;

static gboolean quit_callback(MprisMediaPlayer2 *object, GDBusMethodInvocation *call,
                              void *unused);

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
                  "can-quit", (gboolean) TRUE,
                  "can-raise", (gboolean) FALSE,
                  "identity", "VkPC",
                  NULL);

    g_signal_connect (object_core, "handle-quit", (GCallback)quit_callback, NULL);

    object_player = (GObject *)mpris_media_player2_player_skeleton_new();

    g_object_set (object_player,
                  "can-control", FALSE,
                  "can-go-next", FALSE,
                  "can-go-previous", FALSE,
                  "can-pause", FALSE,
                  "can-play", FALSE,
                  "can-seek", FALSE,
                  NULL);

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

static gboolean quit_callback(MprisMediaPlayer2 *object, GDBusMethodInvocation *call,
                              void *unused)
{
    UNUSED(unused);
    g_main_loop_quit(loop);
    mpris_media_player2_complete_quit(object, call);
    return TRUE;
}
