/**
 * Based on https://gist.github.com/EmilHernvall/953968
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "vector.h"

vector * vector_create() {
    vector *v;
    v = malloc(sizeof(vector));

	v->data = NULL;
	v->size = 0;
	v->count = 0;

    return v;
}

int vector_count(vector *v) {
	return v->count;
}

void vector_add(vector *v, void *e) {
	if (v->size == 0) {
		v->size = 10;
		v->data = malloc(sizeof(void *) * v->size);
		memset(v->data, '\0', sizeof(void *) * v->size);
	}

	if (v->size == v->count) {
		v->size += 10;
		v->data = realloc(v->data, sizeof(void *) * v->size);
	}

	v->data[v->count++] = e;
}

void vector_set(vector *v, int index, void *e) {
	if (index >= v->count) {
		return;
	}

	v->data[index] = e;
}

void * vector_get(vector *v, int index) {
	if (index >= v->count) {
		return NULL;
	}

	return v->data[index];
}

void vector_delete(vector *v, int index) {
	if (index >= v->count) {
		return;
	}

    for (int i = index+1; i < v->count; i++) {
        v->data[i-1] = v->data[i];
    }

    v->data[--v->count] = NULL;
}

void vector_free_data(vector *v) {
    free(v->data);
}

void vector_free(vector *v) {
	free(v);
}
