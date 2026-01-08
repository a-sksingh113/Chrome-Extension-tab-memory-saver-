# Extension Validation Script - Simple Version
# Verifies that Tab Memory Saver is ready for use

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Tab Memory Saver - Validation Check" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$allGood = $true

# Check essential files
Write-Host "Checking essential files..." -ForegroundColor Yellow
Write-Host ""

$files = @{
    "manifest.json" = "Manifest"
    "src/background.ts" = "Background TypeScript"
    "src/popup.ts" = "Popup TypeScript"
    "dist/background.js" = "Background JavaScript (compiled)"
    "dist/popup.js" = "Popup JavaScript (compiled)"
    "public/popup.html" = "Popup HTML"
    "public/popup.css" = "Popup CSS"
    "public/icons/icon16.png" = "Icon 16px"
    "public/icons/icon32.png" = "Icon 32px"
    "public/icons/icon48.png" = "Icon 48px"
    "public/icons/icon128.png" = "Icon 128px"
    "tsconfig.json" = "TypeScript Config"
    "package.json" = "Package Config"
}

foreach ($file in $files.Keys) {
    if (Test-Path $file) {
        Write-Host "  [OK] $($files[$file])" -ForegroundColor Green
    }
    else {
        Write-Host "  [MISSING] $($files[$file])" -ForegroundColor Red
        $allGood = $false
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

if ($allGood) {
    Write-Host " SUCCESS - Extension is ready!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Open chrome://extensions/" -ForegroundColor White
    Write-Host "2. Enable Developer Mode" -ForegroundColor White
    Write-Host "3. Click Load Unpacked" -ForegroundColor White
    Write-Host "4. Select this folder" -ForegroundColor White
    Write-Host ""
    Write-Host "See LOADING_GUIDE.md for detailed instructions" -ForegroundColor Gray
}
else {
    Write-Host " ERRORS FOUND - Please fix missing files" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Run 'npm install' and 'npm run build' to fix" -ForegroundColor Yellow
}
