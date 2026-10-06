Add-Type -AssemblyName System.Drawing

$size = 256
$bmp = New-Object System.Drawing.Bitmap $size, $size
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

# Background brush gradient
$rect = New-Object System.Drawing.Rectangle 0, 0, $size, $size
$gradBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, ([System.Drawing.Color]::FromArgb(255, 245, 158, 11)), ([System.Drawing.Color]::FromArgb(255, 139, 92, 246)), 45.0
$g.FillRectangle($gradBrush, $rect)

# Draw Post-it note in center
$cardRect = New-Object System.Drawing.Rectangle 40, 40, 176, 176
$cardBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 254, 240, 138))
$g.FillRectangle($cardBrush, $cardRect)

# Draw Pin
$pinBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 239, 68, 68))
$g.FillEllipse($pinBrush, 55, 55, 24, 24)

# Draw cute smile and eyes
$eyeBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 113, 63, 18))
$g.FillEllipse($eyeBrush, 90, 110, 14, 14)
$g.FillEllipse($eyeBrush, 152, 110, 14, 14)

# Smile arc
$pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 113, 63, 18)), 6
$g.DrawArc($pen, 105, 130, 46, 30, 0, 180)

# Save as PNG
$destPng = "c:\Mobile apps - Antigravity\YuPPi Notes\public\icon.png"
$bmp.Save($destPng, [System.Drawing.Imaging.ImageFormat]::Png)

$dest192 = "c:\Mobile apps - Antigravity\YuPPi Notes\public\icon-192.png"
$bmp.Save($dest192, [System.Drawing.Imaging.ImageFormat]::Png)

$dest512 = "c:\Mobile apps - Antigravity\YuPPi Notes\public\icon-512.png"
$bmp.Save($dest512, [System.Drawing.Imaging.ImageFormat]::Png)

# Save as ICO
$destIco = "c:\Mobile apps - Antigravity\YuPPi Notes\public\icon.ico"
$hIcon = $bmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)
$fs = New-Object System.IO.FileStream $destIco, ([System.IO.FileMode]::Create)
$icon.Save($fs)
$fs.Close()

$g.Dispose()
$bmp.Dispose()
Write-Output "Icons generated successfully!"
