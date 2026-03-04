@echo off
setlocal
echo ========================================================
echo   ACCESO MOVIL (YT Music Downloader)
echo ========================================================
echo.
echo 1. Asegurate de que el servidor este CORRIENDO (usa el acceso directo del escritorio).
echo 2. Obteniendo clave de seguridad para el celular...
for /f "tokens=*" %%a in ('curl -s https://loca.lt/mytunnelpassword') do set TUNNEL_PASS=%%a
echo.
echo --------------------------------------------------------
echo   TU CLAVE DE ACCESO ES:  %TUNNEL_PASS%
echo --------------------------------------------------------
echo   (Escribela en el celular cuando te lo pida la primera vez)
echo.
echo 📱 ABRE ESTE LINK EN TU CELULAR:
echo https://yt-download-pro.loca.lt
echo.
echo Conectando tunel... (No cierres esta ventana)
echo.
call lt --port 4050 --subdomain yt-download-pro
pause
