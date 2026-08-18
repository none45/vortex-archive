#!/usr/bin/env bash
set -e

B_TYPE=$(echo "$1" | tr 'A-Z' 'a-z')
VERSION="$2"

if [[ "$B_TYPE" != "client" && "$B_TYPE" != "studio" ]]; then
    echo "Error: First argument must be 'client' or 'studio'."
    exit 1
fi

if [ -z "$VERSION" ]; then
    echo "Error: Missing version argument."
    exit 1
fi

if [ "$B_TYPE" == "studio" ]; then
    FILE_NAME="VortexStudio.${VERSION}.exe"
else
    FILE_NAME="Vortex.${VERSION}.exe"
fi

TARGET_DIR="./${B_TYPE}/${VERSION}"

if [ ! -d "$TARGET_DIR" ]; then
    echo "Error: '$TARGET_DIR' does not exist."
    exit 1
fi

IFS=$'\n' sorted_parts=($(find "$TARGET_DIR" -type f -name "${FILE_NAME}.part*" | sort))

if [ ${#sorted_parts[@]} -eq 0 ]; then
    echo "Error: No chunks found in $TARGET_DIR"
    exit 1
fi

> "./${FILE_NAME}"

for part in "${sorted_parts[@]}"; do
    cat "$part" >> "./${FILE_NAME}"
done

echo -e "\nSuccess! Reconstructed at: ./${FILE_NAME}"
