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

BASE_URL="https://githubusercontent.com{B_TYPE}/${VERSION}"
> "./${FILE_NAME}"

PART_NUM=1
while true; do
    PART_NAME=$(printf "%s.part%04d" "$FILE_NAME" "$PART_NUM")
    URL="${BASE_URL}/${PART_NAME}"
    
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL")
    
    if [ "$HTTP_STATUS" -ne 200 ]; then
        if [ "$PART_NUM" -eq 1 ]; then
            echo "Error: No chunks found in ${BASE_URL}"
            rm -f "./${FILE_NAME}"
            exit 1
        fi
        break
    fi
    
    if [ "$PART_NUM" -eq 1 ]; then
        echo "Downloading parts directly from GitHub..."
    fi
    
    echo "  Stitching: ${PART_NAME}"
    curl -sSL "$URL" >> "./${FILE_NAME}"
    ((PART_NUM++))
done

TOTAL_PARTS=$((PART_NUM - 1))
echo "Found ${TOTAL_PARTS} parts."
echo -e "\nSuccess! Reconstructed at: ./${FILE_NAME}"
