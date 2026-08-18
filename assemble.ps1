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

$targetDir = ".\$b_type\$version"

if (-not (Test-Path $targetDir)) {
    Write-Error "Error: '$targetDir' does not exist."
    exit 1
}

$partFiles = Get-ChildItem -Path $targetDir -Filter "$fileName.part*" | Sort-Object Name

if ($partFiles.Count -eq 0) {
    Write-Error "Error: No chunks found in $targetDir"
    exit 1
}

$outputPath = ".\$fileName"
if (Test-Path $outputPath) { Remove-Item $outputPath }

foreach ($part in $partFiles) {
    [System.IO.File]::WriteAllBytes($outputPath, ([System.IO.File]::ReadAllBytes($part.FullName)))
}

Write-Host "`nSuccess! Reconstructed at: .\$fileName" -ForegroundColor Green
