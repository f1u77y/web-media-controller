#pragma once

#include <glib.h>

void command_with_arg(const gchar *line, gchar **command, gchar **arg);
gint64 get_number(gchar *arg);

#define UNUSED(expr) (void)(expr)
