cmake_minimum_required(VERSION 3.0)
project(vkpc-mpris C)

set (CMAKE_MODULE_PATH ${CMAKE_MODULE_PATH} "${CMAKE_SOURCE_DIR}/cmake/")
include (gdbus_codegen)

set (MPRIS_GENERATED_DIR "${PROJECT_BINARY_DIR}/mpris-generated")
if (NOT EXISTS "${MPRIS_GENERATED_DIR}")
  file (MAKE_DIRECTORY "${MPRIS_GENERATED_DIR}")
endif ()

set (MPRIS_SPEC_DIR "${PROJECT_SOURCE_DIR}/third-party/mpris-spec")

generate_gdbus_code (
  OUTPUT "${MPRIS_GENERATED_DIR}/mpris-object-core"
  INTERFACE "org.mpris"
  NAMESPACE "Mpris"
  INPUT "${MPRIS_SPEC_DIR}/org.mpris.MediaPlayer2.xml"
  )

generate_gdbus_code (
  OUTPUT "${MPRIS_GENERATED_DIR}/mpris-object-player"
  INTERFACE "org.mpris"
  NAMESPACE "Mpris"
  INPUT "${MPRIS_SPEC_DIR}/org.mpris.MediaPlayer2.Player.xml"
  )

add_executable (${PROJECT_NAME}
  "${MPRIS_GENERATED_DIR}/mpris-object-core.c"
  "${MPRIS_GENERATED_DIR}/mpris-object-player.c"
  src/message.c
  src/proxy.c
  src/mpris2.c
  src/main.c
  )
set_property (TARGET ${PROJECT_NAME} PROPERTY C_STANDARD 99)

install (
  FILES me.f1u77y.vkpc.json
  DESTINATION /etc/chromium/native-messaging-hosts
  )

install(
  TARGETS ${PROJECT_NAME}
  DESTINATION /usr/bin)

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
