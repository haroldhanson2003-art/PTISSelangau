# PTIS · Jana ikon aplikasi (512px + 192px) tanpa dependensi luar.
# Guna: powershell -ExecutionPolicy Bypass -File tools\make-icons.ps1
Add-Type -AssemblyName System.Drawing

$outDir = Join-Path $PSScriptRoot '..\assets\img'
$outDir = [System.IO.Path]::GetFullPath($outDir)
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

function New-RoundedPath {
    param([float]$x, [float]$y, [float]$w, [float]$h, [float]$r)
    $p = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $r * 2
    $p.AddArc($x, $y, $d, $d, 180, 90)
    $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
    $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
    $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
    $p.CloseFigure()
    return $p
}

function New-Icon {
    param([int]$size, [string]$file)

    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $scale = $size / 512.0
    $g.ScaleTransform($scale, $scale)

    # Latar belakang rounded square
    $bgPath = New-RoundedPath 0 0 512 512 112
    $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.PointF(0, 0)),
        (New-Object System.Drawing.PointF(512, 512)),
        ([System.Drawing.Color]::FromArgb(255, 18, 60, 110)),
        ([System.Drawing.Color]::FromArgb(255, 8, 31, 63))
    )
    $g.FillPath($bgBrush, $bgPath)

    # Aksen bulat lembut
    $accent = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(34, 22, 179, 174))
    $g.FillEllipse($accent, 300, -30, 260, 260)

    # Perisai luar (teal)
    $shield = New-Object System.Drawing.Drawing2D.GraphicsPath
    $shield.AddLine(256, 72, 400, 126)
    $shield.AddLine(400, 126, 400, 230)
    $shield.AddBezier(400, 230, 400, 316, 340, 376, 256, 408)
    $shield.AddBezier(256, 408, 172, 376, 112, 316, 112, 230)
    $shield.AddLine(112, 230, 112, 126)
    $shield.CloseFigure()
    $shieldBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.PointF(112, 74)),
        (New-Object System.Drawing.PointF(400, 408)),
        ([System.Drawing.Color]::FromArgb(255, 22, 179, 174)),
        ([System.Drawing.Color]::FromArgb(255, 11, 125, 125))
    )
    $g.FillPath($shieldBrush, $shield)

    # Perisai dalam (navy)
    $inner = New-Object System.Drawing.Drawing2D.GraphicsPath
    $inner.AddLine(256, 102, 372, 144)
    $inner.AddLine(372, 144, 372, 230)
    $inner.AddBezier(372, 230, 372, 298, 327, 348, 256, 376)
    $inner.AddBezier(256, 376, 185, 348, 140, 298, 140, 230)
    $inner.AddLine(140, 230, 140, 144)
    $inner.CloseFigure()
    $g.FillPath((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 11, 46, 91))), $inner)

    # Skrin komputer riba
    $screenPath = New-RoundedPath 164 190 184 110 14
    $g.FillPath((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 15, 155, 155))), $screenPath)
    $innerScreen = New-RoundedPath 180 205 152 72 6
    $g.FillPath((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(150, 11, 46, 91))), $innerScreen)

    # Pangkalan komputer riba
    $basePoints = @(
        (New-Object System.Drawing.PointF(148, 312)),
        (New-Object System.Drawing.PointF(364, 312)),
        (New-Object System.Drawing.PointF(348, 332)),
        (New-Object System.Drawing.PointF(164, 332))
    )
    $g.FillPolygon((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 232, 238, 251))), $basePoints)

    # Garis data emas
    $gold = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 242, 183, 5), 10)
    $gold.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $gold.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawLine($gold, 204, 236, 308, 236)
    $g.DrawLine($gold, 204, 258, 278, 258)
    $g.FillEllipse((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 242, 183, 5))), 317, 245, 26, 26)

    $g.Dispose()
    $bmp.Save((Join-Path $outDir $file), [System.Drawing.Imaging.ImageFormat]::Png)
    return $bmp
}

$big = New-Icon -size 512 -file 'icon-512.png'

$small = New-Object System.Drawing.Bitmap(192, 192)
$sg = [System.Drawing.Graphics]::FromImage($small)
$sg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$sg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$sg.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$sg.DrawImage($big, 0, 0, 192, 192)
$sg.Dispose()
$small.Save((Join-Path $outDir 'icon-192.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$small.Dispose()
$big.Dispose()

Write-Host "Ikon dijana di $outDir"
