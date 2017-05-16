#include <glib.h>

#include "info.h"
#include "server.h"
#include "mpris2.h"

GMainLoop *loop;

int main() {
    if (!mpris2_init()) {
        g_error("Error at mpris2 initialization, aborting");
    }
    if (!server_init()) {
        g_error("Error at server initialization, aborting");
    }

    loop = g_main_loop_new(NULL, FALSE);
    g_main_loop_run(loop);

    return 0;
}
