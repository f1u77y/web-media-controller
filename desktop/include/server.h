#pragma once

#include <glib.h>

gboolean server_init();
gboolean server_send_command(const gchar *command, const gchar *format, ...);
