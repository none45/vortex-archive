param (
    [string]$BuildType,
    [string]$Version,
    [string]$Mode
)

$b_type = $BuildType.Trim().ToLower()
$version = $Version.Trim().Trim('/')
$mode = $Mode.Trim().ToLower()

if ($b_type -notin @('client', 'studio')) {
    Write-Error "Error: First argument must be 'client' or 'studio'."
    exit 1
}

if ([string]::IsNullOrEmpty($version)) {
    Write-Error "Error: Missing version argument."
    exit 1
}

if ($mode -notin @('raw', 'noupdate')) {
    Write-Error "Error: Third argument must be 'raw' or 'noupdate'."
    exit 1
}

if ($b_type -eq 'studio') {
    $fileName = "VortexStudio.$version.exe"
} else {
    $fileName = "Vortex.$version.exe"
}

$repoOwner = "none45"
$repoName  = "vortex-archive"
$branch    = "main"

$baseUrl = "https://raw.githubusercontent.com/$repoOwner/$repoName/$branch/$b_type/$version"

$tempDir = Join-Path $env:TEMP ("vortex-wrapper-" + [Guid]::NewGuid().ToString())

New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

try {

    $tempVortex = Join-Path $tempDir "_vortex.exe"

    if ($mode -eq "noupdate") {

        $gcc = Get-Command "x86_64-w64-mingw32-gcc.exe" -ErrorAction SilentlyContinue
        $objcopy = Get-Command "x86_64-w64-mingw32-objcopy.exe" -ErrorAction SilentlyContinue
        $windres = Get-Command "x86_64-w64-mingw32-windres.exe" -ErrorAction SilentlyContinue
        $wrestool = Get-Command "wrestool.exe" -ErrorAction SilentlyContinue

        if (-not ($gcc -and $objcopy -and $windres -and $wrestool)) {

            Write-Host "Build dependencies are missing."
            Write-Host "Checking for MSYS2..."

            $msysRoot = "$env:LOCALAPPDATA\msys64"

            if (-not (Test-Path "$msysRoot\usr\bin\bash.exe")) {

                $winget = Get-Command "winget.exe" -ErrorAction SilentlyContinue

                if (-not $winget) {
                    Write-Error "Error: winget is required to automatically install MSYS2."
                    exit 1
                }

                Write-Host "Installing MSYS2..."

                $installOutput = & $winget.Source install `
                    --id MSYS2.MSYS2 `
                    --exact `
                    --accept-package-agreements `
                    --accept-source-agreements `
                    2>&1

                if ($LASTEXITCODE -ne 0) {
                    Write-Error ($installOutput | Out-String)
                    exit 1
                }
            }

            $msysBash = "$msysRoot\usr\bin\bash.exe"

            if (-not (Test-Path $msysBash)) {
                Write-Error "MSYS2 installation was not found."
                exit 1
            }

            Write-Host "Installing build dependencies..."

            $pacmanOutput = & $msysBash -lc `
                "pacman -Sy --noconfirm" `
                2>&1

            if ($LASTEXITCODE -ne 0) {
                Write-Error ($pacmanOutput | Out-String)
                exit 1
            }

            $pacmanOutput = & $msysBash -lc `
                "pacman -S --needed --noconfirm mingw-w64-x86_64-gcc mingw-w64-x86_64-binutils mingw-w64-x86_64-icoutils" `
                2>&1

            if ($LASTEXITCODE -ne 0) {
                Write-Error ($pacmanOutput | Out-String)
                exit 1
            }

            $mingwBin = "$msysRoot\mingw64\bin"

            $env:PATH = "$mingwBin;$env:PATH"

            $gcc = Get-Command "x86_64-w64-mingw32-gcc.exe" -ErrorAction SilentlyContinue
            $objcopy = Get-Command "x86_64-w64-mingw32-objcopy.exe" -ErrorAction SilentlyContinue
            $windres = Get-Command "x86_64-w64-mingw32-windres.exe" -ErrorAction SilentlyContinue
            $wrestool = Get-Command "wrestool.exe" -ErrorAction SilentlyContinue

            if (-not ($gcc -and $objcopy -and $windres -and $wrestool)) {
                Write-Error "Build dependencies were installed but could not be found."
                exit 1
            }
        }
    }

    $partNum = 1

    while ($true) {

        $partName = "{0}.part{1:D4}" -f $fileName, $partNum
        $url = "$baseUrl/$partName"

        try {

            $wc = New-Object System.Net.WebClient
            $bytes = $wc.DownloadData($url)

            if ($partNum -eq 1) {
                Write-Host "Downloading parts..."
            }

            Write-Host "  Stitching: $partName"

            [System.IO.File]::AppendAllBytes(
                $tempVortex,
                $bytes
            )

            $partNum++

        } catch {

            if ($partNum -eq 1) {
                Write-Error "Error: No chunks found in $baseUrl"
                exit 1
            }

            break
        }
    }

    $finalPartsCount = $partNum - 1

    Write-Host ""
    Write-Host "Found $finalPartsCount parts."

    if ($mode -eq "raw") {

        $outputPath = Join-Path (Get-Location) $fileName

        if (Test-Path $outputPath) {
            Remove-Item $outputPath -Force
        }

        Copy-Item $tempVortex $outputPath -Force

        Write-Host ""
        Write-Host "Success! Reconstructed at: .\$fileName" -ForegroundColor Green

        exit 0
    }

    Write-Host ""
    Write-Host "Building no-update wrapper..."

    $wrapperC = Join-Path $tempDir "wrapper.c"
    $vortexObj = Join-Path $tempDir "_vortex.o"
    $iconFile = Join-Path $tempDir "vortex.ico"
    $resourceRc = Join-Path $tempDir "wrapper.rc"
    $resourceObj = Join-Path $tempDir "wrapper_res.o"
    $buildError = Join-Path $tempDir "build_error.txt"

@'
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
'@ | Set-Content -Path $wrapperC -Encoding ASCII

    $wrestoolOutput = & $wrestool.Source `
        -x `
        -t14 `
        -o $tempDir `
        $tempVortex `
        2>&1

    if ($LASTEXITCODE -ne 0) {
        Write-Error ($wrestoolOutput | Out-String)
        exit 1
    }

    $extractedIcon = Get-ChildItem $tempDir -Filter "*.ico" |
        Select-Object -First 1

    if (-not $extractedIcon) {
        Write-Error "Error: Failed to extract icon from Vortex executable."
        exit 1
    }

    Move-Item $extractedIcon.FullName $iconFile -Force

@"
1 ICON "$iconFile"
"@ | Set-Content -Path $resourceRc -Encoding ASCII

    $windresOutput = & $windres.Source `
        $resourceRc `
        -O coff `
        -o $resourceObj `
        2>&1

    if ($LASTEXITCODE -ne 0) {
        Write-Error ($windresOutput | Out-String)
        exit 1
    }

    $objcopyOutput = & $objcopy.Source `
        --input-target=binary `
        --output-target=pe-x86-64 `
        --binary-architecture=i386:x86-64 `
        $tempVortex `
        $vortexObj `
        2>&1

    if ($LASTEXITCODE -ne 0) {
        Write-Error ($objcopyOutput | Out-String)
        exit 1
    }

    $outputName = $fileName -replace '\.exe$', '.noupdate.exe'
    $outputPath = Join-Path (Get-Location) $outputName

    if (Test-Path $outputPath) {
        Remove-Item $outputPath -Force
    }

    $gccOutput = & $gcc.Source `
        -mwindows `
        $wrapperC `
        $vortexObj `
        $resourceObj `
        -o $outputPath `
        2>&1

    if ($LASTEXITCODE -ne 0) {
        Write-Error ($gccOutput | Out-String)
        exit 1
    }

    Write-Host ""
    Write-Host "Success!" -ForegroundColor Green
    Write-Host "Created: .\$outputName" -ForegroundColor Green

}
finally {

    if (Test-Path $tempDir) {
        Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}
