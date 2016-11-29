#include <glib.h>

#include "info.h"
#include "server.h"
#include "mpris2.h"

GMainLoop *loop;

int main(int argc, char **argv) {
    if (!mpris2_init()) {
        g_error("Error at mpris2 initialization, aborting");
    }

    loop = g_main_loop_new(NULL, FALSE);
    g_main_loop_run(loop);

    return 0;
}
