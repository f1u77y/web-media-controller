#include "mpris2.h"

#include "main.h"
#include "proxy.h"
#include "util.h"

#include "generated/mpris-core.h"
#include "generated/mpris-player.h"

#include <math.h>
#include <glib.h>
#include <json-glib/json-glib.h>

static MediaPlayer2 *core = NULL;
static MediaPlayer2Player *player = NULL;

#define BEGIN_COMMAND(COMMAND)                           \
    JsonBuilder *builder = make_command(COMMAND);        \

#define END_COMMAND()                                   \
    json_builder_end_object(builder);                   \
    proxy_send_command(json_builder_get_root(builder)); \
    json_builder_reset(builder);


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
    static gboolean on_##NAME(MediaPlayer2Player *player,               \
                              GDBusMethodInvocation *call,              \
                              gpointer G_GNUC_UNUSED user_data)         \
    {                                                                   \
        BEGIN_COMMAND(COMMAND);                                         \
        json_builder_add_null_value(builder);                           \
        END_COMMAND();                                                  \
        media_player2_player_complete_##NAME(player, call);             \
        return TRUE;                                                    \
    }                                                                   \

DEFINE_PLAYER_COMMAND_CALLBACK(play, "play")
DEFINE_PLAYER_COMMAND_CALLBACK(pause, "pause")
DEFINE_PLAYER_COMMAND_CALLBACK(previous, "previous")
DEFINE_PLAYER_COMMAND_CALLBACK(next, "next")
DEFINE_PLAYER_COMMAND_CALLBACK(stop, "stop")
DEFINE_PLAYER_COMMAND_CALLBACK(play_pause, "playPause")

#undef DEFINE_PLAYER_COMMAND_CALLBACK

static gboolean
on_seek(MediaPlayer2Player *player,
        GDBusMethodInvocation *call,
        gint64 offset_us,
        gpointer G_GNUC_UNUSED user_data)
{
    BEGIN_COMMAND("seek");
    json_builder_add_double_value(builder, offset_us / 1000.0);
    END_COMMAND();
    media_player2_player_complete_seek(player, call);
    return TRUE;
}


static gboolean
on_set_position(MediaPlayer2Player *player,
                GDBusMethodInvocation *call,
                const gchar *track_id,
                gint64 position_us,
                gpointer G_GNUC_UNUSED user_data)
{
    BEGIN_COMMAND("setPositon");
    json_builder_begin_object(builder);
    json_builder_set_member_name(builder, "position");
    json_builder_add_double_value(builder, position_us / 1000.0);
    json_builder_set_member_name(builder, "trackId");
    json_builder_add_string_value(builder, track_id);
    json_builder_end_object(builder);
    END_COMMAND();
    media_player2_player_complete_set_position(player, call);
    return TRUE;
}

static gboolean
on_volume_changed(GObject *object) {
    gdouble volume = 0;
    g_object_get(object, "volume", &volume, NULL);
    BEGIN_COMMAND("volume");
    json_builder_add_double_value(builder, volume);
    END_COMMAND();
    return TRUE;
}

static gboolean
on_quit(MediaPlayer2 *core,
              GDBusMethodInvocation *call,
              gpointer G_GNUC_UNUSED user_data)
{
    g_main_loop_quit(loop);
    media_player2_complete_quit(core, call);
    return TRUE;
}

static void
mpris2_core_init() {
    core = media_player2_skeleton_new();

    media_player2_set_can_quit(core, TRUE);
    media_player2_set_can_raise(core, FALSE);
    media_player2_set_identity(core, "Web Media Controller");

    g_signal_connect (core, "handle-quit", G_CALLBACK(on_quit), NULL);
}

static void
mpris2_player_init() {
    player = media_player2_player_skeleton_new();

    media_player2_player_set_minimum_rate(player, 1.0);
    media_player2_player_set_maximum_rate(player, 1.0);
    media_player2_player_set_rate(player, 1.0);

    g_signal_connect(player, "handle-play", G_CALLBACK(on_play), NULL);
    g_signal_connect(player, "handle-pause", G_CALLBACK(on_pause), NULL);
    g_signal_connect(player, "handle-stop", G_CALLBACK(on_stop), NULL);
    g_signal_connect(player, "handle-play-pause", G_CALLBACK(on_play_pause), NULL);
    g_signal_connect(player, "handle-previous", G_CALLBACK(on_previous), NULL);
    g_signal_connect(player, "handle-next", G_CALLBACK(on_next), NULL);
    g_signal_connect(player, "handle-seek", G_CALLBACK(on_seek), NULL);
    g_signal_connect(player, "handle-set-position",
                     G_CALLBACK(on_set_position), NULL);
    g_signal_connect(player, "notify::volume", G_CALLBACK(on_volume_changed), NULL);
}


gboolean
mpris2_init() {
    GError *error = NULL;
    GDBusConnection *bus = g_bus_get_sync(G_BUS_TYPE_SESSION, NULL, &error);

    if (!bus) {
        g_critical("%s", error->message);
        g_error_free(error);
        return FALSE;
    }

    guint owner_id = g_bus_own_name_on_connection(bus, SERVICE_NAME,
                                                  G_BUS_NAME_OWNER_FLAGS_NONE,
                                                  NULL, NULL, NULL, NULL);

    mpris2_core_init();
    mpris2_player_init();

    if (!g_dbus_interface_skeleton_export((GDBusInterfaceSkeleton *)core,
                                          bus,
                                          OBJECT_NAME,
                                          &error)
        ||
        !g_dbus_interface_skeleton_export((GDBusInterfaceSkeleton *)player,
                                          bus,
                                          OBJECT_NAME,
                                          &error))
    {
        g_bus_unown_name(owner_id);
        g_critical("%s", error->message);
        g_error_free(error);
        return FALSE;
    }

    return TRUE;
}

void
mpris2_update_position(JsonNode *argument) {
    gdouble position = json_node_get_double(argument);
    gint64 position_us = round(position * 1000);
    media_player2_player_set_position(player, position_us);
}

void
mpris2_update_volume(JsonNode *argument) {
    gdouble volume = json_node_get_double(argument);
    g_signal_handlers_block_by_func(player, G_CALLBACK(on_volume_changed), NULL);
    media_player2_player_set_volume(player, volume);
    g_signal_handlers_unblock_by_func(player, G_CALLBACK(on_volume_changed), NULL);
}

static void
add_string_to_builder(JsonArray G_GNUC_UNUSED *array,
                      guint G_GNUC_UNUSED index,
                      JsonNode *element_node,
                      gpointer user_data)
{
    GVariantBuilder *builder = (GVariantBuilder *)user_data;
    const gchar *value = json_node_get_string(element_node);
    g_variant_builder_add(builder, "s", value);
}

void
mpris2_update_metadata(JsonNode *argument)
{
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
                                           add_string_to_builder,
                                           &artist);
            }
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
        } else if (!g_strcmp0(key, "artUrl")) {
            const gchar *value = json_node_get_string(value_node);
            g_variant_builder_add(&builder, "{sv}",
                                  "mpris:artUrl",
                                  g_variant_new_string(value));
        } else if (!g_strcmp0(key, "trackId")) {
            const gchar *value = json_node_get_string(value_node);
            g_variant_builder_add(&builder, "{sv}",
                                  "mpris:trackid",
                                  g_variant_new_object_path(value));
        }
    }

    GVariant *metadata = g_variant_builder_end(&builder);
    media_player2_player_set_metadata(player, metadata);
}

void
mpris2_update_playback_status(JsonNode *arg_node) {
    const gchar *value = json_node_get_string(arg_node);
    gchar *cap = capitalize(value);
    media_player2_player_set_playback_status(player, cap);
    g_free(cap);
}

void
mpris2_update_player_properties(JsonNode *arg_node) {
    JsonObject *root = json_node_get_object(arg_node);
    JsonObjectIter iter;
    const gchar *key;
    JsonNode *value_node;

    json_object_iter_init(&iter, root);
    while (json_object_iter_next(&iter, &key, &value_node)) {
        gchar *name = camelcase_to_dashes(key);
        g_object_set(player,
                     name, json_node_get_boolean(value_node),
                     NULL);
        g_free(name);
    }
}
