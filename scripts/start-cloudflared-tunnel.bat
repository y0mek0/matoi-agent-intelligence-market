@echo off
rem Install cloudflared if missing and start an anonymous HTTPS tunnel to localhost:3100.
rem Prints only the public URL to stdout. Use it as NOVA_PUBLIC_URL.
setlocal
where cloudflared >nul 2>nul
if %ERRORLEVEL%==0 goto :run
echo [cloudflared] downloading...
powershell -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing -Uri https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe -OutFile $env:USERPROFILE\cloudflared.exe -ErrorAction Stop; 'downloaded' } catch { 'download-failed: ' + $_.Exception.Message }"
if not exist "%USERPROFILE%\cloudflared.exe" (
  echo [cloudflared] download failed. Install manually from https://github.com/cloudflare/cloudflared/releases and re-run.
  exit /b 1
)
set "PATH=%USERPROFILE%;%PATH%"
:run
"%USERPROFILE%\cloudflared.exe" tunnel --url http://127.0.0.1:3100 --no-autoupdate
