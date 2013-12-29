#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ICONS_PATH=/usr/share/icons
ICONS=( "Faenza" "Faenza-Radiance" "hicolor" "ubuntu-mono-dark" "ubuntu-mono-light" )
if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root." 1>&2
   exit 1
fi

for i in "${ICONS[@]}"
do
    if [ -d "${ICONS_PATH}/$i" ]; then
        cp -r ${DIR}/icons/$1/* ${ICONS_PATH}/$1
    fi
done
