#pragma once

#include <glib.h>
#include <json-glib/json-glib.h>

void
messages_init();

JsonParser *
message_read();

gboolean
message_write(JsonNode *node);
