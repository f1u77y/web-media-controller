#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>
#include <pthread.h>
#include <gtk/gtk.h>

#include "info.h"
#include "server.h"
#include "grab.h"

static GtkStatusIcon *tray_icon;
static GtkWidget *menu;

enum server_last_cmd_enum server_last_cmd = NONE;
static pthread_t grab_thread;
static pthread_t server_thread;

pthread_mutex_t server_last_cmd_mutex;

void tray_icon_on_click(GtkStatusIcon *status_icon, gpointer user_data) {
    // left-click
}

void tray_icon_on_menu(GtkStatusIcon *status_icon, guint button, guint activate_time, gpointer user_data) {
    // right-click
    gtk_menu_popup(GTK_MENU(menu), NULL, NULL, NULL, NULL, button, activate_time);
}

void menu_about(GtkWidget *widget, gpointer data) {
    GtkWidget *about_dialog;

    const gchar *authors[] = {
        APP_AUTHOR,
        NULL
    };

    about_dialog = gtk_about_dialog_new();
    gtk_about_dialog_set_version((GtkAboutDialog *)about_dialog, APP_VERSION);
    gtk_about_dialog_set_authors((GtkAboutDialog *)about_dialog, authors);
    gtk_about_dialog_set_comments((GtkAboutDialog *)about_dialog, (const gchar *)APP_ABOUT);
    gtk_about_dialog_set_name((GtkAboutDialog *)about_dialog, APP_NAME);
    gtk_about_dialog_set_website((GtkAboutDialog *)about_dialog, APP_URL);

    g_signal_connect_swapped(about_dialog, "response", G_CALLBACK(gtk_widget_hide), about_dialog);

    gtk_widget_show(about_dialog);
}

void menu_quit(GtkWidget *widget, gpointer data) {
    // quit app
    exit(0);
}

void create_tray_icon() {
    tray_icon = gtk_status_icon_new();

    g_signal_connect(G_OBJECT(tray_icon), "activate",
        G_CALLBACK(tray_icon_on_click), NULL);
    g_signal_connect(G_OBJECT(tray_icon), "popup-menu", 
        G_CALLBACK(tray_icon_on_menu), NULL);

    gtk_status_icon_set_from_icon_name(tray_icon, "vkpc");
    gtk_status_icon_set_tooltip(tray_icon, APP_NAME);
    gtk_status_icon_set_visible(tray_icon, true);
}

void create_menu() {
    GtkWidget *item;
    menu =  gtk_menu_new();

    // About
    item = gtk_image_menu_item_new_from_stock(GTK_STOCK_DIALOG_INFO, NULL);
    gtk_menu_item_set_label((GtkMenuItem *)item, "About");
    g_signal_connect(G_OBJECT(item), "activate", G_CALLBACK(menu_about), NULL);
    gtk_menu_shell_append(GTK_MENU_SHELL(menu), item);
    gtk_widget_show(item);

    // Quit
    item = gtk_image_menu_item_new_from_stock(GTK_STOCK_QUIT, NULL);
    gtk_menu_item_set_label((GtkMenuItem *)item, "Quit");
    g_signal_connect(G_OBJECT(item), "activate", G_CALLBACK(menu_quit), NULL);
    gtk_menu_shell_append(GTK_MENU_SHELL(menu), item);
    gtk_widget_show(item);
}

void handle_hotkeys(enum HotkeyEvent e) {
    pthread_mutex_lock(&server_last_cmd_mutex);
    switch (e) {
    case HK_PLAY:
        server_last_cmd = PLAY;
        break;

    case HK_PAUSE: 
        server_last_cmd = PAUSE;
        break;

    case HK_NEXT:
        server_last_cmd = NEXT;
        break;

    case HK_PREV:
        server_last_cmd = PREV;
        break;

    default:
        break;
    }
    pthread_mutex_unlock(&server_last_cmd_mutex);
}

void start_grab() {
    int rc = pthread_create(&grab_thread, NULL, (void *)grab_init, handle_hotkeys);
    if (rc) {
        fprintf(stderr, "ERROR creating grab_thread, code = %d\n", rc);
        exit(-1);
    }
}

void start_server() {
    int rc = pthread_create(&server_thread, NULL, (void *)server_init, NULL);
    if (rc) {
        fprintf(stderr, "ERROR creating server_thread, code = %d\n", rc);
        exit(-1);
    }
}

int main(int argc, char **argv) {
    pthread_mutex_init(&server_last_cmd_mutex, NULL);

    start_grab();
    start_server();

    gtk_init(&argc, &argv);

    create_tray_icon();
    create_menu();

    gtk_main();
    return 0;
}
