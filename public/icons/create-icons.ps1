# Create Placeholder Icons Script
# This PowerShell script creates simple blue placeholder icons for the extension

# Create a simple 128x128 blue icon with "TM" text
$sizes = @(16, 32, 48, 128)

Add-Type -AssemblyName System.Drawing

foreach ($size in $sizes) {
    $bitmap = New-Object System.Drawing.Bitmap $size, $size
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    
    # Enable anti-aliasing
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias
    
    # Fill background with blue
    $blueBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(26, 115, 232))
    $graphics.FillRectangle($blueBrush, 0, 0, $size, $size)
    
    # Draw white "TM" text
    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $fontSize = [Math]::Floor($size * 0.4)
    $font = New-Object System.Drawing.Font("Arial", $fontSize, [System.Drawing.FontStyle]::Bold)
    $format = New-Object System.Drawing.StringFormat
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center
    
    $rect = New-Object System.Drawing.RectangleF(0, 0, $size, $size)
    $graphics.DrawString("TM", $font, $whiteBrush, $rect, $format)
    
    # Save the icon
    $iconPath = Join-Path $PSScriptRoot "icon$size.png"
    $bitmap.Save($iconPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    # Cleanup
    $graphics.Dispose()
    $bitmap.Dispose()
    $blueBrush.Dispose()
    $whiteBrush.Dispose()
    $font.Dispose()
    
    Write-Host "Created icon$size.png"
}

Write-Host "All placeholder icons created successfully!"
