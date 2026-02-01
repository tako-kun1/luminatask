Add-Type -AssemblyName System.Drawing

$sourcePath = "C:\Users\user\.gemini\antigravity\brain\d099357c-d45c-473b-ab76-8bc6b658142e\app_icon_v3_1769090186637.png"
$destPath = "m:\dev-app\src-tauri\icons\icon.png"

# Load the image (it will load even if extension is wrong, usually)
$image = [System.Drawing.Image]::FromFile($sourcePath)

# Save as true PNG
$image.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)

$image.Dispose()

Write-Host "Converted to PNG at $destPath"
