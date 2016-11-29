LIBS=libwebsockets glib-2.0 gio-unix-2.0
CC=gcc
CCFLAGS=-Wall -std=c99 -pthread `pkg-config --cflags ${LIBS}`
LDFLAGS=-lm -pthread `pkg-config --libs ${LIBS}`
BINARIES=vkpc

.PHONY: $(GENERATED)

CODEGENFLAGS= --c-namespace Mpris --interface org.mpris. --c-generate-autocleanup all

all : vkpc

vkpc : server.o vector.o main.o mpris2.o mpris-object-core.o mpris-object-player.o
	${CC} ${LDFLAGS} $+ -o vkpc

server.o : server.c
	${CC} ${CCFLAGS} -c server.c

vector.o : vector.c
	${CC} ${CCFLAGS} -c vector.c

main.o : main.c
	${CC} ${CCFLAGS} -c main.c

mpris2.o : mpris2.c mpris-object-core.h mpris-object-player.h
	${CC} ${CCFLAGS} -c mpris2.c

mpris-object-core.o: mpris-object-core.c
	${CC} ${CCFLAGS} -c $<

mpris-object-player.o: mpris-object-player.c
	${CC} ${CCFLAGS} -c $<

mpris-object-core.c: mpris-object-core.h
mpris-object-player.c: mpris-object-player.h

mpris-object-core.h: mpris2.xml
	gdbus-codegen ${CODEGENFLAGS} --generate-c-code $(basename $@) $<

mpris-object-player.h: mpris2-player.xml
	gdbus-codegen ${CODEGENFLAGS} --generate-c-code $(basename $@) $<

install:
	cp vkpc /usr/bin

clean:
	rm -f $(BINARIES) mpris-object-* *.o
