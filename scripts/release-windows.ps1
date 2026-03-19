$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')

Write-Host '[1/3] Running validation'
npm run test:unit
npm run test:backend

Write-Host '[2/3] Building Windows artifacts (NSIS + portable)'
npm run build
npx electron-builder --win nsis portable

Write-Host '[3/3] Artifact summary'
Get-ChildItem -Path dist -Filter *.exe | Select-Object Name,Length,LastWriteTime
Get-FileHash -Algorithm SHA256 dist\*.exe | Format-Table -AutoSize
