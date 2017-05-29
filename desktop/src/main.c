#include "main.h"

#include "proxy.h"
#include "message.h"
#include "mpris2.h"

#include <glib.h>

GMainLoop *loop;

int main() {
    if (!mpris2_init()) {
        g_error("Error at mpris2 initialization, aborting");
    }
    messages_init();
    proxy_listen_commands();

    loop = g_main_loop_new(NULL, FALSE);
    g_main_loop_run(loop);

    return 0;
}
