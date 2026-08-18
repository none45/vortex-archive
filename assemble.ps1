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

$baseUrl = "https://githubusercontent.com"
$outputPath = ".\$fileName"

if (Test-Path $outputPath) { Remove-Item $outputPath }

$partNum = 1
while ($true) {
    $partName = "{0}.part{1:D4}" -f $fileName, $partNum
    $url = "$baseUrl/$partName"
    
    try {
        $response = Invoke-WebRequest -Uri $url -Method Head -ErrorAction Stop
        
        if ($partNum -eq 1) {
            Write-Host "Downloading parts directly from GitHub..."
        }
        
        Write-Host "  Stitching: $partName"
        $bytes = Invoke-RestMethod -Uri $url
        [System.IO.File]::AppendAllBytes($outputPath, $bytes)
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
Write-Host "Success! Reconstructed at: .\$fileName" -ForegroundColor Green
