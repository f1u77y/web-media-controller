LIBS=libwebsockets x11
CC=gcc
CCFLAGS=-Wall -std=c99 -pthread `pkg-config --cflags ${LIBS}`
LDFLAGS=-lm -pthread `pkg-config --libs ${LIBS}`
BINARIES=vkpc

all : vkpc

vkpc : server.o grab.o vector.o main.o
	${CC} ${LDFLAGS} server.o grab.o vector.o main.o -o vkpc

server.o : server.c
	${CC} ${CCFLAGS} -c server.c

grab.o : grab.c
	${CC} ${CCFLAGS} -c grab.c

vector.o : vector.c
	${CC} ${CCFLAGS} -c vector.c

main.o : main.c
	${CC} ${CCFLAGS} -c main.c

install:
	cp vkpc /usr/bin
	sh install_icons.sh

clean:
	rm -f $(BINARIES) *.o
