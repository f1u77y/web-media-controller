cmake_minimum_required(VERSION 3.0)
project(web-media-controller C)

option (ENABLE_FIREFOX "Install manifest for Firefox" ON)
option (ENABLE_CHROME "Install manifest for Google Chrome" ON)
option (ENABLE_CHROMIUM "Install manifest for Chromium" ON)

set (CMAKE_MODULE_PATH ${CMAKE_MODULE_PATH} "${CMAKE_SOURCE_DIR}/cmake/")
include (gdbus_codegen)

set (MPRIS_GENERATED_DIR "${PROJECT_BINARY_DIR}/mpris-generated")
if (NOT EXISTS "${MPRIS_GENERATED_DIR}/generated")
  file (MAKE_DIRECTORY "${MPRIS_GENERATED_DIR}/generated")
endif ()

set (MPRIS_SPEC_DIR "${PROJECT_SOURCE_DIR}/third-party/mpris-spec")

generate_gdbus_code (
  OUTPUT "${MPRIS_GENERATED_DIR}/generated/mpris-core"
  INTERFACE "org.mpris"
  INPUT "${MPRIS_SPEC_DIR}/org.mpris.MediaPlayer2.xml"
  )

generate_gdbus_code (
  OUTPUT "${MPRIS_GENERATED_DIR}/generated/mpris-player"
  INTERFACE "org.mpris"
  INPUT "${MPRIS_SPEC_DIR}/org.mpris.MediaPlayer2.Player.xml"
  )

add_executable (${PROJECT_NAME}
  "${MPRIS_GENERATED_DIR}/generated/mpris-core.c"
  "${MPRIS_GENERATED_DIR}/generated/mpris-player.c"
  src/util.c
  src/message.c
  src/proxy.c
  src/mpris2.c
  src/main.c
  )
set_property (TARGET ${PROJECT_NAME} PROPERTY C_STANDARD 99)

set (DEST_BINARY_DIR bin)
set (EXECUTABLE_PATH "${CMAKE_INSTALL_PREFIX}/${DEST_BINARY_DIR}/${PROJECT_NAME}")

if (ENABLE_CHROMIUM)
  configure_file (
    me.f1u77y.web_media_controller.chromium.json
    manifest/chromium/me.f1u77y.web_media_controller.json
    ESCAPE_QUOTES
  )
  install (
    FILES "${CMAKE_BINARY_DIR}/manifest/chromium/me.f1u77y.web_media_controller.json"
    DESTINATION /etc/chromium/native-messaging-hosts
    )
endif ()

if (ENABLE_CHROME)
  configure_file (
    me.f1u77y.web_media_controller.chromium.json
    manifest/chrome/me.f1u77y.web_media_controller.json
    ESCAPE_QUOTES
  )
  install (
    FILES "${CMAKE_BINARY_DIR}/manifest/chrome/me.f1u77y.web_media_controller.json"
    DESTINATION /etc/opt/chrome/native-messaging-hosts
    )
endif ()

if (ENABLE_FIREFOX)
  configure_file (
    me.f1u77y.web_media_controller.firefox.json
    manifest/firefox/me.f1u77y.web_media_controller.json
    ESCAPE_QUOTES
  )
  install (
    FILES "${CMAKE_BINARY_DIR}/manifest/firefox/me.f1u77y.web_media_controller.json"
    DESTINATION /usr/lib/mozilla/native-messaging-hosts
    )
endif ()

install(
  TARGETS ${PROJECT_NAME}
  DESTINATION "${DEST_BINARY_DIR}"
  )

find_package (PkgConfig)
pkg_check_modules (GLIB2 REQUIRED glib-2.0)
pkg_check_modules (GIO_UNIX REQUIRED gio-unix-2.0)
pkg_check_modules (JSON_GLIB REQUIRED json-glib-1.0)

target_include_directories (${PROJECT_NAME} PUBLIC
  include
  ${MPRIS_GENERATED_DIR}
  ${GLIB2_INCLUDE_DIRS}
  ${GIO_UNIX_INCLUDE_DIRS}
  ${JSON_GLIB_INCLUDE_DIRS}
  )

target_link_libraries (${PROJECT_NAME}
  ${GLIB2_LIBRARIES}
  ${GIO_UNIX_LIBRARIES}
  ${JSON_GLIB_LIBRARIES}
  m
  )
