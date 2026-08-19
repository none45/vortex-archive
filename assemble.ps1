param (
    [string]$BuildType,
    [string]$Version
)

$b_type = $BuildType.Trim().ToLower()
$version = $Version.Trim().Trim('/')

if ($b_type -notin @('client', 'studio')) {
    Write-Error "Error: First argument must be 'client' or 'studio'."
    exit 1
}
if ([string]::IsNullOrEmpty($version)) {
    Write-Error "Error: Missing version argument."
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
$outputPath = ".\$fileName"
$tempPath = ".\$fileName.tmp"

if (Test-Path $tempPath) { Remove-Item $tempPath }
if (Test-Path $outputPath) { Remove-Item $outputPath }

$partNum = 1
while ($true) {
    $partName = "{0}.part{1:D4}" -f $fileName, $partNum
    $url = "$baseUrl/$partName"
    try {
        $wc = New-Object System.Net.WebClient
        $bytes = $wc.DownloadData($url)
        if ($partNum -eq 1) {
            Write-Host "Downloading parts directly from GitHub..."
        }
        Write-Host "  Stitching: $partName"
        [System.IO.File]::AppendAllBytes($tempPath, $bytes)
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
Write-Host "`nFound $finalPartsCount parts."

$checksumUrl = "$baseUrl/$fileName.sha256"
try {
    $wc = New-Object System.Net.WebClient
    $expectedHash = ($wc.DownloadString($checksumUrl)).Split(" ")[0].Trim()

    Write-Host "Verifying checksum..."
    $actualHash = (Get-FileHash -Path $tempPath -Algorithm SHA256).Hash.ToLower()

    if ($expectedHash.ToLower() -ne $actualHash) {
        Write-Error "Error: Checksum mismatch! Expected $expectedHash, got $actualHash"
        Remove-Item $tempPath
        exit 1
    }
    Write-Host "Checksum verified OK."
} catch {
    Write-Host "Warning: No .sha256 file found in repo — skipping verification."
}

Move-Item $tempPath $outputPath
Write-Host "Success! Reconstructed at: .\$fileName" -ForegroundColor Green
