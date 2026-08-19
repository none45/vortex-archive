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

REPO_OWNER="none45"
REPO_NAME="vortex-archive"
BRANCH="main"

BASE_URL="https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/${B_TYPE}/${VERSION}"
TEMP_OUT="./${FILE_NAME}.tmp"
> "$TEMP_OUT"

PART_NUM=1
while true; do
    PART_NAME=$(printf "%s.part%04d" "$FILE_NAME" "$PART_NUM")
    URL="${BASE_URL}/${PART_NAME}"

    if curl -sSL --fail "$URL" >> "$TEMP_OUT"; then
        if [ "$PART_NUM" -eq 1 ]; then
            echo "Downloading parts directly from GitHub..."
        fi
        echo "  Stitching: ${PART_NAME}"
        ((PART_NUM++))
    else
        if [ "$PART_NUM" -eq 1 ]; then
            echo "Error: No chunks found in ${BASE_URL}"
            rm -f "$TEMP_OUT"
            exit 1
        fi
        break
    fi
done

TOTAL_PARTS=$((PART_NUM - 1))
echo "Found ${TOTAL_PARTS} parts."

CHECKSUM_URL="${BASE_URL}/${FILE_NAME}.sha256"
CHECKSUM_FILE="./${FILE_NAME}.sha256"

if curl -sSL --fail "$CHECKSUM_URL" -o "$CHECKSUM_FILE" 2>/dev/null; then
    echo "Verifying checksum..."
    EXPECTED_HASH=$(awk '{print $1}' "$CHECKSUM_FILE")
    ACTUAL_HASH=$(sha256sum "$TEMP_OUT" | awk '{print $1}')

    if [ "$EXPECTED_HASH" != "$ACTUAL_HASH" ]; then
        echo "Error: Checksum mismatch!"
        echo "  Expected: $EXPECTED_HASH"
        echo "  Actual:   $ACTUAL_HASH"
        rm -f "$TEMP_OUT" "$CHECKSUM_FILE"
        exit 1
    fi
    echo "Checksum verified OK."
    rm -f "$CHECKSUM_FILE"
else
    echo "Warning: No .sha256 file found in repo — skipping verification."
fi

mv "$TEMP_OUT" "./${FILE_NAME}"
echo -e "\nSuccess! Reconstructed at: ./${FILE_NAME}"
