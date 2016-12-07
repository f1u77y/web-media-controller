#include "server.h"
#include "mpris2.h"
#include "info.h"
#include "util.h"

#include <string.h>

#include <glib.h>
#include <gio/gio.h>

#define MAX_THREADS 10

static GSocketService *service = NULL;
static GSocketConnection *cur_connection = NULL;

static gboolean handler(GThreadedSocketService *service,
                        GSocketConnection *connection,
                        GSocketListener *listener,
                        gpointer *user_data);

gboolean server_send_command(const gchar *command, const gchar *format, ...) {
    if (!cur_connection) {
        return FALSE;
    }
    GOutputStream *out = g_io_stream_get_output_stream((GIOStream *)cur_connection);
    g_output_stream_printf(out, NULL, NULL, NULL, "%s", command);
    va_list args;
    va_start(args, format);
    g_output_stream_vprintf(out, NULL, NULL, NULL, format, args);
    va_end(args);
    g_output_stream_write_all(out, "\n", 1, NULL, NULL, NULL);
    return TRUE;
}

gboolean server_init() {
    GError *error = NULL;
    service = g_threaded_socket_service_new(10);

    if (!g_socket_listener_add_inet_port((GSocketListener *)service,
                                         SERVER_PORT,
                                         NULL,
                                         &error))
        {
            g_critical("%s\n", error->message);
            g_error_free(error);
            return FALSE;
        }

    g_signal_connect(service, "run", (GCallback)handler, NULL);
    return TRUE;
}

static gboolean handler(GThreadedSocketService *service,
                        GSocketConnection *connection,
                        GSocketListener *listener,
                        gpointer *user_data)
{
    UNUSED(service);
    UNUSED(listener);
    UNUSED(user_data);

    if (cur_connection) {
        g_io_stream_close((GIOStream *)cur_connection, NULL, NULL);
        g_object_unref(cur_connection);
    }
    cur_connection = connection;
    g_object_ref(connection);

    GInputStream *in = g_io_stream_get_input_stream((GIOStream *)connection);

    GDataInputStream *data = g_data_input_stream_new (in);
    g_data_input_stream_set_newline_type (data, G_DATA_STREAM_NEWLINE_TYPE_ANY);

    while (cur_connection) {
        gchar *line = g_data_input_stream_read_line(data, NULL, NULL, NULL);
        gchar *command = NULL;
        gchar *arg = NULL;
        command_with_arg(line, &command, &arg);
        if (line == NULL) {
            break;
        } else if (!g_strcmp0(command, "PLAY")) {
            mpris2_update_playback_status(MPRIS2_PLAYBACK_STATUS_PLAYING,
                                          get_number(arg));
        } else if (!g_strcmp0(command, "PROGRESS")) {
            mpris2_update_playback_status(MPRIS2_PLAYBACK_STATUS_NONE,
                                          get_number(arg));
        } else if (!g_strcmp0(command, "PAUSE")) {
            mpris2_update_playback_status(MPRIS2_PLAYBACK_STATUS_PAUSED,
                                          get_number(arg));
        } else if (!g_strcmp0(command, "STOP")) {
            mpris2_update_playback_status(MPRIS2_PLAYBACK_STATUS_STOPPED, -1);
        } else if (!g_strcmp0(command, "VOLUME")) {
            mpris2_update_volume(get_number(arg));
        } else if (!g_strcmp0(command, "METADATA")) {
            gchar *artist = NULL;
            gchar *title = NULL;
            gchar *album = NULL;
            gchar *url = NULL;
            gint64 length = 0;
            gchar *art_url = NULL;

            gboolean end_metadata = FALSE;
            while (!end_metadata) {
                gchar *line = g_data_input_stream_read_line(data, NULL, NULL, NULL);
                gchar *command = NULL;
                gchar *arg = NULL;
                command_with_arg(line, &command, &arg);
                gboolean arg_used = TRUE;
                if (!command || !g_strcmp0(command, "END-METADATA")) {
                    end_metadata = TRUE;
                    arg_used = FALSE;
                } else if (!g_strcmp0(command, "ARTIST")) {
                    artist = arg;
                } else if (!g_strcmp0(command, "TITLE")) {
                    title = arg;
                } else if (!g_strcmp0(command, "ALBUM")) {
                    album = arg;
                } else if (!g_strcmp0(command, "URL")) {
                    url = arg;
                } else if (!g_strcmp0(command, "LENGTH")) {
                    length = get_number(arg);
                    arg_used = FALSE;
                } else if (!g_strcmp0(command, "ART-URL")) {
                    art_url = arg;
                } else {
                    arg_used = FALSE;
                }
                g_free(line);
                g_free(command);
                if (!arg_used) {
                    g_free(arg);
                }
            }
            mpris2_update_metadata(artist, title, album, url, length, art_url);
        }

        g_free(line);
        g_free(command);
        g_free(arg);
    }

    return FALSE;
}
