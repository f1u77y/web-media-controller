#pragma once

#include <glib.h>
#include <json-glib/json-glib.h>

#define SERVICE_NAME "org.mpris.MediaPlayer2.web-media-controller"
#define OBJECT_NAME "/org/mpris/MediaPlayer2"

gboolean
mpris2_init();

void
mpris2_update_playback_status(JsonNode *argument);

void
mpris2_update_position(JsonNode *argument);

void
mpris2_update_volume(JsonNode *argument);
void
mpris2_update_metadata(JsonNode *argument);

void
mpris2_update_player_properties(JsonNode *argument);
