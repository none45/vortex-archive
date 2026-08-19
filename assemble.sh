#!/usr/bin/env bash
set -e

B_TYPE=$(echo "$1" | tr 'A-Z' 'a-z')
VERSION="$2"
MODE=$(echo "$3" | tr 'A-Z' 'a-z')

if [[ "$B_TYPE" != "client" && "$B_TYPE" != "studio" ]]; then
    echo "Error: First argument must be 'client' or 'studio'."
    exit 1
fi

if [ -z "$VERSION" ]; then
    echo "Error: Missing version argument."
    exit 1
fi

if [[ "$MODE" != "raw" && "$MODE" != "noupdate" ]]; then
    echo "Error: Third argument must be 'raw' or 'noupdate'."
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

if ! command -v curl >/dev/null 2>&1; then
    echo "curl is missing. Installing..."
    sudo pacman -S --needed --noconfirm curl
fi

if [ "$MODE" == "noupdate" ]; then
    MISSING=0

    command -v x86_64-w64-mingw32-gcc >/dev/null 2>&1 || MISSING=1
    command -v x86_64-w64-mingw32-objcopy >/dev/null 2>&1 || MISSING=1
    command -v x86_64-w64-mingw32-windres >/dev/null 2>&1 || MISSING=1
    command -v wrestool >/dev/null 2>&1 || MISSING=1

    if [ "$MISSING" -eq 1 ]; then
        echo "Build dependencies are missing."
        echo "Installing MinGW-w64 and icoutils..."
        sudo pacman -S --needed --noconfirm mingw-w64-gcc icoutils
    fi
fi

TEMP_DIR=$(mktemp -d)

cleanup() {
    rm -rf "$TEMP_DIR"
}

trap cleanup EXIT

TEMP_OUT="${TEMP_DIR}/_vortex.exe"
> "$TEMP_OUT"

PART_NUM=1

while true; do
    PART_NAME=$(printf "%s.part%04d" "$FILE_NAME" "$PART_NUM")
    URL="${BASE_URL}/${PART_NAME}"

    if curl -sSL --fail "$URL" 2>/dev/null >> "$TEMP_OUT"; then
        if [ "$PART_NUM" -eq 1 ]; then
            echo "Downloading parts..."
        fi

        echo "  Stitching: ${PART_NAME}"
        PART_NUM=$((PART_NUM + 1))
    else
        if [ "$PART_NUM" -eq 1 ]; then
            echo "Error: No chunks found in ${BASE_URL}"
            exit 1
        fi

        break
    fi
done

TOTAL_PARTS=$((PART_NUM - 1))

echo
echo "Found ${TOTAL_PARTS} parts."

if [ "$MODE" == "raw" ]; then
    cp "$TEMP_OUT" "./${FILE_NAME}"

    echo
    echo "Success! Reconstructed at: ./${FILE_NAME}"

    exit 0
fi

echo
echo "Building no-update wrapper..."

WRAPPER_C="${TEMP_DIR}/wrapper.c"
VORTEX_O="${TEMP_DIR}/_vortex.o"
ICON_FILE="${TEMP_DIR}/vortex.ico"
RESOURCE_RC="${TEMP_DIR}/wrapper.rc"
RESOURCE_O="${TEMP_DIR}/wrapper_res.o"

cat > "$WRAPPER_C" <<'EOF'
#include <windows.h>
#include <stdio.h>

extern unsigned char _binary__vortex_exe_start[];
extern unsigned char _binary__vortex_exe_end[];

int main(void)
{
    const unsigned char *exe_data = _binary__vortex_exe_start;

    DWORD exe_size =
        (DWORD)(_binary__vortex_exe_end -
                _binary__vortex_exe_start);

    if (!SetEnvironmentVariableA("VORTEX_NO_UPDATE", "1"))
    {
        MessageBoxA(
            NULL,
            "Failed to set environment variable.",
            "Wrapper Error",
            MB_ICONERROR
        );
        return 1;
    }

    char temp_path[MAX_PATH];

    DWORD temp_len = GetTempPathA(
        sizeof(temp_path),
        temp_path
    );

    if (temp_len == 0 || temp_len >= sizeof(temp_path))
    {
        MessageBoxA(
            NULL,
            "Failed to get temporary directory.",
            "Wrapper Error",
            MB_ICONERROR
        );
        return 1;
    }

    char temp_file[MAX_PATH];

    if (GetTempFileNameA(
            temp_path,
            "vrx",
            0,
            temp_file) == 0)
    {
        MessageBoxA(
            NULL,
            "Failed to create temporary file.",
            "Wrapper Error",
            MB_ICONERROR
        );
        return 1;
    }

    HANDLE file = CreateFileA(
        temp_file,
        GENERIC_WRITE,
        0,
        NULL,
        CREATE_ALWAYS,
        FILE_ATTRIBUTE_NORMAL,
        NULL
    );

    if (file == INVALID_HANDLE_VALUE)
    {
        DeleteFileA(temp_file);

        MessageBoxA(
            NULL,
            "Failed to write embedded executable.",
            "Wrapper Error",
            MB_ICONERROR
        );
        return 1;
    }

    DWORD written = 0;

    BOOL write_ok = WriteFile(
        file,
        exe_data,
        exe_size,
        &written,
        NULL
    );

    CloseHandle(file);

    if (!write_ok || written != exe_size)
    {
        DeleteFileA(temp_file);

        MessageBoxA(
            NULL,
            "Failed to write complete executable.",
            "Wrapper Error",
            MB_ICONERROR
        );
        return 1;
    }

    STARTUPINFOA si;
    PROCESS_INFORMATION pi;

    ZeroMemory(&si, sizeof(si));
    ZeroMemory(&pi, sizeof(pi));

    si.cb = sizeof(si);

    char command_line[MAX_PATH + 2];

    snprintf(
        command_line,
        sizeof(command_line),
        "\"%s\"",
        temp_file
    );

    BOOL process_ok = CreateProcessA(
        NULL,
        command_line,
        NULL,
        NULL,
        FALSE,
        0,
        NULL,
        NULL,
        &si,
        &pi
    );

    if (!process_ok)
    {
        DeleteFileA(temp_file);

        MessageBoxA(
            NULL,
            "Failed to launch _vortex.exe.",
            "Wrapper Error",
            MB_ICONERROR
        );
        return 1;
    }

    WaitForSingleObject(
        pi.hProcess,
        INFINITE
    );

    CloseHandle(pi.hProcess);
    CloseHandle(pi.hThread);

    DeleteFileA(temp_file);

    return 0;
}
EOF

cd "$TEMP_DIR"

wrestool -x -t14 -o "$TEMP_DIR" "_vortex.exe" 2>/dev/null

EXTRACTED_ICON=$(find "$TEMP_DIR" -maxdepth 1 -type f -name "*.ico" | head -n 1)

if [ -z "$EXTRACTED_ICON" ]; then
    echo "Error: Failed to extract icon from Vortex executable."
    exit 1
fi

mv "$EXTRACTED_ICON" "$ICON_FILE"

cat > "$RESOURCE_RC" <<EOF
1 ICON "$ICON_FILE"
EOF

if ! x86_64-w64-mingw32-windres \
    "$RESOURCE_RC" \
    -O coff \
    -o "$RESOURCE_O" 2>"$TEMP_DIR/build_error"; then

    cat "$TEMP_DIR/build_error"
    exit 1
fi

if ! x86_64-w64-mingw32-objcopy \
    --input-target=binary \
    --output-target=pe-x86-64 \
    --binary-architecture=i386:x86-64 \
    "_vortex.exe" \
    "_vortex.o" 2>"$TEMP_DIR/build_error"; then

    cat "$TEMP_DIR/build_error"
    exit 1
fi

cd - >/dev/null

OUTPUT_NAME="${FILE_NAME%.exe}.noupdate.exe"

if ! x86_64-w64-mingw32-gcc \
    -mwindows \
    "$WRAPPER_C" \
    "$VORTEX_O" \
    "$RESOURCE_O" \
    -o "./${OUTPUT_NAME}" 2>"$TEMP_DIR/build_error"; then

    cat "$TEMP_DIR/build_error"
    exit 1
fi

echo
echo "Success!"
echo "Created: ./${OUTPUT_NAME}"
