CC ?= gcc

LIBS = glib-2.0 gio-unix-2.0 libsoup-2.4 json-glib-1.0
CCFLAGS = -Wall -std=c99 `pkg-config --cflags $(LIBS)`
LDFLAGS = -lm `pkg-config --libs $(LIBS)`

CODEGENFLAGS = --c-namespace Mpris --interface org.mpris. --c-generate-autocleanup all

TARGET = vkpc

ifeq ($(DEBUG), 1)
	SANFLAGS := -fsanitize=address,undefined
	CCFLAGS += -g -DDEBUG $(SANFLAGS)
	LDFLAGS += $(SANFLAGS)
endif

.PHONY: all install uninstall clean

all : $(TARGET)

$(TARGET) : server.o main.o mpris2.o mpris-object-core.o mpris-object-player.o util.o
	$(CC) $(LDFLAGS) $+ -o $(TARGET)

server.o : server.c
	$(CC) $(CCFLAGS) -c server.c

util.o : util.c
	$(CC) $(CCFLAGS) -c util.c

main.o : main.c
	$(CC) $(CCFLAGS) -c main.c

mpris2.o : mpris2.c mpris-object-core.h mpris-object-player.h
	$(CC) $(CCFLAGS) -c mpris2.c

mpris-object-core.o: mpris-object-core.c
	$(CC) $(CCFLAGS) -c $<

mpris-object-player.o: mpris-object-player.c
	$(CC) $(CCFLAGS) -c $<

mpris-object-core.c: mpris-object-core.h
mpris-object-player.c: mpris-object-player.h

mpris-object-core.h: mpris2.xml
	gdbus-codegen $(CODEGENFLAGS) --generate-c-code $(basename $@) $<

mpris-object-player.h: mpris2-player.xml
	gdbus-codegen $(CODEGENFLAGS) --generate-c-code $(basename $@) $<

install:
	install $(TARGET) "$(DESTDIR)/usr/bin"

uninstall:
	rm -f "$(DESTDIR)/usr/bin/$(TARGET)"

clean:
	rm -f $(TARGET) mpris-object-* *.o
