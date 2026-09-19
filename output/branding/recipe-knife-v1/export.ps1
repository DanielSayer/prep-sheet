Add-Type -AssemblyName System.Drawing
$brandRoot = $PSScriptRoot
function Export-BrandImage([string]$Source, [string]$Name, [int]$Width, [int]$Height, [bool]$Opaque) {
  $sourceImage = [System.Drawing.Image]::FromFile((Join-Path $brandRoot $Source))
  $bitmap = [System.Drawing.Bitmap]::new($Width, $Height)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  try {
    if ($Opaque) { $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#faf7ef')) }
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.DrawImage($sourceImage, [System.Drawing.Rectangle]::new(0, 0, $Width, $Height))
    $bitmap.Save((Join-Path $brandRoot $Name), [System.Drawing.Imaging.ImageFormat]::Png)
  } finally { $graphics.Dispose(); $bitmap.Dispose(); $sourceImage.Dispose() }
}
foreach ($size in @(16,32,48)) { Export-BrandImage 'icon-master.png' "favicon-$size.png" $size $size $true }
Export-BrandImage 'icon-master.png' 'apple-touch-icon.png' 180 180 $true
Export-BrandImage 'icon-master.png' 'icon-192.png' 192 192 $true
Export-BrandImage 'icon-master.png' 'icon-512.png' 512 512 $true
Export-BrandImage 'share-wide-master.png' 'share-1200x630.png' 1200 630 $true
Export-BrandImage 'share-square-master.png' 'share-1080x1080.png' 1080 1080 $true
# Package PNG images into a multi-resolution ICO container.
$iconSizes = @(16,32,48)
$iconBlobs = @($iconSizes | ForEach-Object { ,([System.IO.File]::ReadAllBytes((Join-Path $brandRoot "favicon-$_.png"))) })
$iconStream = [System.IO.File]::Create((Join-Path $brandRoot 'favicon.ico'))
$writer = [System.IO.BinaryWriter]::new($iconStream)
try {
  $writer.Write([uint16]0); $writer.Write([uint16]1); $writer.Write([uint16]3)
  $offset = 6 + 16 * 3
  for ($i = 0; $i -lt 3; $i++) {
    $writer.Write([byte]$iconSizes[$i]); $writer.Write([byte]$iconSizes[$i])
    $writer.Write([byte]0); $writer.Write([byte]0)
    $writer.Write([uint16]1); $writer.Write([uint16]32)
    $writer.Write([uint32]$iconBlobs[$i].Length); $writer.Write([uint32]$offset)
    $offset += $iconBlobs[$i].Length
  }
  foreach ($blob in $iconBlobs) { $writer.Write([byte[]]$blob) }
} finally { $writer.Dispose(); $iconStream.Dispose() }
