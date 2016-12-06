#include <glib.h>

void command_with_arg(const gchar *line, gchar **command, gchar **arg) {
    if (!line) {
        *command = NULL;
        *arg = NULL;
        return;
    }
    const gchar *c = line;
    while (*c != 0 && *c != ' ') {
        ++c;
    }
    if (c == line) {
        *command = NULL;
    } else {
        *command = g_strndup(line, c - line);
    }

    line = c;
    if (*line == 0) {
        *arg = NULL;
        return;
    }
    ++line;
    if (*line == 0) {
        *arg = NULL;
        return;
    }
    *arg = g_strdup(line);
}

gint64 get_number(gchar *arg) {
    gint64 position = -1;
    gchar *end = NULL;
    if (arg != NULL) {
        position = g_ascii_strtoll(arg, &end, 0);
        if (end == arg) {
            position = -1;
        }
    }
    return position;
}
