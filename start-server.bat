@echo off
chcp 65001 > nul
cls

echo.
echo ====================================
echo   Live Server JFAB SISTEMAS - Rede Local
echo ====================================
echo.

REM Obtém o IP local da máquina
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do set IP=%%a
set IP=%IP:~1%

REM Remove espaços em branco
for /f "tokens=*" %%i in ('echo %IP%') do set IP=%%i

REM Obtém o gateway (IP do roteador)
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "Gateway"') do set GATEWAY=%%a
set GATEWAY=%GATEWAY:~1%

echo IP Local: %IP%
echo IP do Roteador (Gateway): %GATEWAY%
echo.

REM Verifica se o npm está instalado
where npm >nul 2>nul
if errorlevel 1 (
    echo ERRO: Node.js/npm não está instalado!
    echo Baixe em: https://nodejs.org/
    pause
    exit /b 1
)

echo.
echo Iniciando Servidor de Produção na rede local...
echo.

set PORT=5500

echo Acesse localmente: http://%IP%:%PORT%
echo Acesse pela rede: http://%GATEWAY%:%PORT%
echo.
echo (Se não funcionar com o gateway, tente com o IP: http://%IP%:%PORT%)
echo.

REM Inicia o servidor compilado do JFAB Sistemas
node dist/server.cjs

pause
