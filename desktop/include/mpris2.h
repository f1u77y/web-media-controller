#pragma once

#include <glib.h>
#include <json-glib/json-glib.h>

#define OBJECT_NAME "org.mpris.MediaPlayer2.vkpc"
#define IFACE_NAME "/org/mpris/MediaPlayer2"

typedef enum {
    MPRIS2_PLAYBACK_STATUS_NONE = 0,
    MPRIS2_PLAYBACK_STATUS_PLAYING = 1,
    MPRIS2_PLAYBACK_STATUS_PAUSED = 2,
    MPRIS2_PLAYBACK_STATUS_STOPPED = 3,
} Mpris2PlaybackStatus;

gboolean mpris2_init();
void mpris2_update_playback_status(Mpris2PlaybackStatus status);
void mpris2_update_position(JsonNode *argument);
void mpris2_update_volume(JsonNode *argument);
void mpris2_update_metadata(JsonNode *argument);
void mpris2_update_player_properties(JsonNode *argument);
