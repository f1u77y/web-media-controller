#pragma once

#include <glib.h>

#define OBJECT_NAME "org.mpris.MediaPlayer2.vkpc"
#define IFACE_NAME "/org/mpris/MediaPlayer2"

typedef enum {
    MPRIS2_PLAYBACK_STATUS_NONE = 0,
    MPRIS2_PLAYBACK_STATUS_PLAYING = 1,
    MPRIS2_PLAYBACK_STATUS_PAUSED = 2,
    MPRIS2_PLAYBACK_STATUS_STOPPED = 3,
} Mpris2PlaybackStatus;

gboolean mpris2_init();
void mpris2_update_playback_status(Mpris2PlaybackStatus status,
                                   gint64 position);
void mpris2_update_volume(gint volume);
void mpris2_update_metadata(const gchar *artist,
                            const gchar *title,
                            const gchar *album,
                            const gchar *url,
                            gint64 length,
                            const gchar *art_url);

void mpris2_set_player_property(const gchar *key, gboolean value);
void mpris2_reset_player_properies();
