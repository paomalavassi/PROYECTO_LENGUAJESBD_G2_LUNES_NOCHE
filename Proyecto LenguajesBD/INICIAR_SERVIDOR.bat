@echo off
title Condominio Las Aralias - Servidor

echo.
echo  ========================================
echo   Condominio Las Aralias
echo   Iniciando servidor...
echo  ========================================
echo.

REM Matar cualquier proceso php previo en el puerto 8080
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8080 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)

REM Abrir navegador con un pequeño delay para que el servidor arranque primero
start "" cmd /c "timeout /t 2 >nul && start http://localhost:8080/admin.html && start http://localhost:8080/guardia.html && start http://localhost:8080/index.html"

REM Iniciar el servidor PHP (esto mantiene la ventana abierta)
echo  Servidor corriendo en http://localhost:8080
echo  Presiona Ctrl+C para detenerlo.
echo.

php -S localhost:8080

pause
