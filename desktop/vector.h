/**
 * Based on https://gist.github.com/EmilHernvall/953968
 */

#ifndef VECTOR_H__
#define VECTOR_H__
 
typedef struct vector_ {
    void **data;
    int size;
    int count;
} vector;
 
vector * vector_create();
int vector_count(vector *);
void vector_add(vector *, void *);
void vector_set(vector *, int, void *);
void *vector_get(vector *, int);
void vector_delete(vector*, int);
void vector_free_data(vector *);
void vector_free(vector *);
 
#endif
