#pragma once

#include <glib.h>
#include <json-glib/json-glib.h>

gboolean
proxy_listen_commands();

gboolean
proxy_send_command(JsonNode *command);
