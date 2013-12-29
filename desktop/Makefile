LIBS = gtk+-2.0 glib-2.0 cairo pango gdk-pixbuf-2.0 atk libwebsockets x11
CC = gcc
CCFLAGS = -Wall -std=c99 -pthread `pkg-config --cflags --libs ${LIBS}` 
LDFLAGS = -lm
BINARIES = vkpc

all : vkpc

vkpc : server.o grab.o vector.o main.o
	${CC} ${CCFLAGS} server.o grab.o vector.o main.o ${LDFLAGS} -o vkpc

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
