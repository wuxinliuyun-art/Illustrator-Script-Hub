@echo off
setlocal EnableExtensions DisableDelayedExpansion

set "SOURCE_DIR=%~dp0"
set "SOURCE_DIR=%SOURCE_DIR:~0,-1%"
for %%I in ("%SOURCE_DIR%") do set "PLUGIN_NAME=%%~nxI"

if not defined APPDATA goto :missing_appdata
if not defined PLUGIN_NAME goto :invalid_source

set "CEP_ROOT=%APPDATA%\Adobe\CEP\extensions"
set "TARGET_DIR=%CEP_ROOT%\%PLUGIN_NAME%"
set "UPDATE_HELPER=%SOURCE_DIR%\tools\update-cep.ps1"

powershell -NoProfile -Command "Write-Host ('Author: ' + [char]0x5DE5 + [char]0x4E1A + [char]0x8BBE + [char]0x8BA1 + [char]0x6C89 + [char]0x601D + [char]0x5F55)"
if not exist "%UPDATE_HELPER%" goto :missing_helper

powershell -NoProfile -ExecutionPolicy Bypass -File "%UPDATE_HELPER%" -SourceDir "%SOURCE_DIR%" -TargetDir "%TARGET_DIR%"
set "UPDATE_CODE=%ERRORLEVEL%"
if not "%UPDATE_CODE%"=="0" goto :update_failed

pause
exit /b 0

:missing_appdata
echo.
echo ERROR: The APPDATA environment variable is unavailable.
echo Possible cause: The script is running outside a normal Windows user session.
echo Suggested fix: Sign in to Windows normally, then run this file again.
pause
exit /b 1

:invalid_source
echo.
echo ERROR: The source folder name could not be detected.
echo Possible cause: This command file was moved or its path is invalid.
echo Suggested fix: Put this file back in the plugin root folder and try again.
pause
exit /b 1

:missing_helper
echo.
echo ERROR: The update helper file is missing.
echo Possible cause: The plugin folder is incomplete.
echo Suggested fix: Restore tools\update-cep.ps1 and run this file again.
pause
exit /b 1

:update_failed
echo.
echo ERROR: The CEP extension update failed.
echo Possible cause: See the detailed message above.
echo Suggested fix: Resolve the reported issue and run this file again.
echo Update result code: %UPDATE_CODE%
pause
exit /b %UPDATE_CODE%
