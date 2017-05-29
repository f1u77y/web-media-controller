#pragma once

#include <glib.h>
#include <string.h>
#include <ctype.h>

gchar *
camelcase_to_dashes(const gchar *s) {
    gchar *result = g_new(gchar, strlen(s) * 2 + 1);
    gchar *cur = result;
    for (; *s != 0; ++s) {
        if (isupper(*s)) {
            *(cur++) = '-';
        }
        *(cur++) = tolower(*s);
    }
    *cur = 0;
    return result;
}

gchar *
capitalize(const gchar *s) {
    gchar *result = g_strdup(s);
    if (strlen(result) > 0) {
        result[0] = toupper(result[0]);
    }
    return result;
}
