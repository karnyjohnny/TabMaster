@echo off
rem ==============================================================================
rem TabMaster - Fast Build Script for w64devkit / MinGW
rem Target: Windows 7 (x64 / x86)
rem ==============================================================================
echo =======================================================
echo Building TabMaster with GCC (Size and Latency Optimized)...
echo =======================================================

where gcc >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] GCC not found in PATH! Run this from w64devkit prompt.
    pause
    exit /b 1
)

set SRCDIR=.
if exist src\main.c set SRCDIR=src

echo [1/2] Compiling Windows Resources...
windres -O coff %SRCDIR%\resource.rc -o resource.o
if %errorlevel% neq 0 (
    echo [ERROR] Resource compilation failed!
    pause
    exit /b 1
)

echo [2/2] Compiling C Source with -Os and size optimizations...
gcc -Os -s -Wall -Wextra -std=c99 -mwindows ^
    -fno-ident -fno-asynchronous-unwind-tables ^
    -ffunction-sections -fdata-sections ^
    -I%SRCDIR% ^
    -o tabmaster.exe %SRCDIR%\main.c resource.o ^
    -Wl,--gc-sections -Wl,--subsystem,windows ^
    -luser32 -lgdi32 -lpsapi -ldwmapi -lkernel32 -lshell32 -ladvapi32

if %errorlevel% equ 0 (
    echo.
    echo =======================================================
    echo [SUCCESS] tabmaster.exe built successfully!
    echo Binary size:
    dir tabmaster.exe | findstr /i "tabmaster.exe"
    echo =======================================================
) else (
    echo.
    echo [FAILED] Compilation errors encountered.
)

pause
