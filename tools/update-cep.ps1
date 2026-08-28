param(
    [Parameter(Mandatory = $true)]
    [string]$SourceDir,

    [Parameter(Mandatory = $true)]
    [string]$TargetDir
)

$ErrorActionPreference = "Stop"
$markerName = ".scriptrunner-last-update.txt"

function Test-ExcludedPath {
    param([string]$RelativePath)

    $segments = $RelativePath -split "[\\/]"
    foreach ($segment in $segments) {
        if ($segment -eq ".git" -or $segment -eq ".agents" -or $segment -eq ".codex") {
            return $true
        }
    }

    $leaf = [System.IO.Path]::GetFileName($RelativePath)
    return $leaf -eq "Thumbs.db" -or $leaf -eq ".DS_Store" -or $leaf -eq $markerName
}

try {
    $sourceRoot = [System.IO.Path]::GetFullPath($SourceDir).TrimEnd("\", "/")
    $targetRoot = [System.IO.Path]::GetFullPath($TargetDir).TrimEnd("\", "/")

    if (-not (Test-Path -LiteralPath $sourceRoot -PathType Container)) {
        throw "Source folder does not exist: $sourceRoot"
    }

    if (-not (Test-Path -LiteralPath $targetRoot)) {
        New-Item -ItemType Directory -Path $targetRoot -Force | Out-Null
    }

    $markerPath = Join-Path $targetRoot $markerName
    $previousUpdate = "No previous successful update"
    if (Test-Path -LiteralPath $markerPath -PathType Leaf) {
        $savedTime = (Get-Content -LiteralPath $markerPath -Raw -ErrorAction SilentlyContinue).Trim()
        if ($savedTime) {
            $previousUpdate = $savedTime
        }
    }

    $files = @(
        Get-ChildItem -LiteralPath $sourceRoot -Recurse -File | Where-Object {
            $relative = $_.FullName.Substring($sourceRoot.Length).TrimStart("\", "/")
            -not (Test-ExcludedPath -RelativePath $relative)
        }
    )

    if ($files.Count -eq 0) {
        throw "No files were found in the plugin source folder."
    }

    Write-Host ""
    Write-Host "Last successful update : $previousUpdate"
    Write-Host "Updating CEP extension..."

    $copiedJsx = New-Object System.Collections.Generic.List[string]
    for ($index = 0; $index -lt $files.Count; $index++) {
        $file = $files[$index]
        $relativePath = $file.FullName.Substring($sourceRoot.Length).TrimStart("\", "/")
        $destination = Join-Path $targetRoot $relativePath
        $destinationFolder = Split-Path -Parent $destination
        if (-not (Test-Path -LiteralPath $destinationFolder)) {
            New-Item -ItemType Directory -Path $destinationFolder -Force | Out-Null
        }
        Copy-Item -LiteralPath $file.FullName -Destination $destination -Force

        if ($file.Extension -ieq ".jsx" -and $relativePath -match "^scripts[\\/]") {
            $copiedJsx.Add($relativePath)
        }
    }

    $currentUpdate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Set-Content -LiteralPath $markerPath -Value $currentUpdate -Encoding UTF8

    Write-Host ""
    Write-Host "JSX files loaded or updated ($($copiedJsx.Count)):"
    foreach ($jsxName in ($copiedJsx | Sort-Object)) {
        Write-Host "  - $jsxName"
    }
    Write-Host ""
    Write-Host "Previous update : $previousUpdate"
    Write-Host "Current update  : $currentUpdate"
    Write-Host ""
    Write-Host "Update completed successfully."
    Write-Host "Restart Adobe and reopen the CEP panel."
    exit 0
}
catch {
    Write-Host ""
    Write-Host "ERROR: The CEP extension update failed." -ForegroundColor Red
    Write-Host "Possible cause: A file is locked, access was denied, the source is incomplete, or the disk is unavailable."
    Write-Host "Suggested fix: Close Adobe applications, check permissions and disk space, then run this file again."
    Write-Host "Details: $($_.Exception.Message)"
    exit 1
}
