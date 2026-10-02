/**
 * TabMaster - Ultra-Lightweight Alt+Tab & Process Manager for Windows 7 (x64/x86)
 * Target Hardware: Intel Core 2 Duo, 2 GB RAM, Intel GMA 4500MHD
 * Compiler: GCC (w64devkit / MSYS2) with -Os -s
 * License: MIT
 * 
 * tabmaster.h - Core header definitions, structures, and function prototypes
 */

#ifndef TABMASTER_H
#define TABMASTER_H

/* Force Unicode APIs across all WinAPI declarations */
#ifndef UNICODE
#define UNICODE
#endif
#ifndef _UNICODE
#define _UNICODE
#endif

#define WIN32_LEAN_AND_MEAN
#define _WIN32_WINNT 0x0601 /* Windows 7 baseline target */

#include <windows.h>
#include <windowsx.h>
#include <psapi.h>
#include <tlhelp32.h>
#include <dwmapi.h>
#include <shellapi.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <wchar.h>
#include <wctype.h>

#ifdef __cplusplus
extern "C" {
#endif

/* ========================================================================= */
/* Application Constants & UI Layout Geometry                                */
/* ========================================================================= */

#define APP_NAME            L"TabMaster"
#define APP_VERSION         L"1.0.0"
#define APP_WINDOW_CLASS    L"TabMaster_SwitcherClass"
#define WM_TRAYICON_MSG     (WM_USER + 101)
#define ID_TRAY_RESTORE     2001
#define ID_TRAY_MODE_WIN    2002
#define ID_TRAY_MODE_PROC   2003
#define ID_TRAY_REFRESH     2004
#define ID_TRAY_EXIT        2005

/* UI Geometry (optimized for 1366x768 / 1920x1080 screens) */
#define UI_WIDTH            680
#define UI_HEIGHT           480
#define UI_SEARCH_HEIGHT    46
#define UI_TAB_HEIGHT       32
#define UI_ITEM_HEIGHT      38
#define UI_FOOTER_HEIGHT    32
#define UI_ICON_SIZE        16
#define UI_MAX_VISIBLE_ROWS 9

/* Color Palette - Authentic Ultra-Light Dark Mode (#141414 / #1e1e1e) */
#define COLOR_BG            RGB(20, 20, 20)       /* #141414 Canvas Background */
#define COLOR_PANEL         RGB(28, 28, 28)       /* #1C1C1C Header & Tabs */
#define COLOR_BORDER        RGB(55, 55, 55)       /* #373737 Subtle Window Border */
#define COLOR_ROW_ALT       RGB(24, 24, 24)       /* #181818 Alternating rows */
#define COLOR_ROW_HOVER     RGB(38, 38, 38)       /* #262626 Row Hover */
#define COLOR_SELECT_ACCENT RGB(0, 120, 215)      /* #0078D7 Blue Accent */
#define COLOR_SELECT_BG     RGB(15, 60, 110)      /* Dark Blue row selection */
#define COLOR_TEXT_PRIMARY  RGB(245, 245, 245)    /* #F5F5F5 Window title */
#define COLOR_TEXT_MUTED    RGB(150, 150, 150)    /* #969696 Process & specs */
#define COLOR_TEXT_DIM      RGB(105, 105, 105)    /* #696969 Footer / subtle */
#define COLOR_ACCENT_GREEN  RGB(46, 204, 113)     /* Low RAM/CPU indicator */
#define COLOR_ACCENT_AMBER  RGB(243, 156, 18)     /* Medium RAM/CPU indicator */
#define COLOR_ACCENT_RED    RGB(231, 76, 60)      /* High memory hog / Kill indicator */

/* Maximum Limits */
#define MAX_ITEMS           512
#define MAX_TITLE_LEN       256
#define MAX_SEARCH_LEN      64

/* ========================================================================= */
/* Operating Modes                                                           */
/* ========================================================================= */

typedef enum {
    MODE_WINDOWS = 0,    /* User applications / Alt+Tab windows */
    MODE_PROCESSES = 1   /* All system processes sorted by RAM/CPU */
} TabMode;

/* ========================================================================= */
/* Data Structures                                                           */
/* ========================================================================= */

typedef struct {
    HWND        hwnd;                    /* Window handle (NULL for pure processes) */
    DWORD       pid;                     /* Process ID */
    WCHAR       title[MAX_TITLE_LEN];    /* Window caption or Process name */
    WCHAR       proc_name[MAX_PATH];     /* Executable name (e.g. chrome.exe) */
    HICON       hIcon;                   /* 16x16 icon handle (cached) */
    SIZE_T      ram_bytes;               /* Working set in bytes */
    double      cpu_percent;             /* Approximate CPU % */
    FILETIME    last_kernel_time;        /* For CPU calculation */
    FILETIME    last_user_time;          /* For CPU calculation */
    BOOL        is_hung;                 /* Is window unresponsive */
    BOOL        is_pinned;               /* Optional user priority flag */
} EntryItem;

typedef struct {
    EntryItem   items[MAX_ITEMS];
    int         count;
    CRITICAL_SECTION cs;                 /* Thread safety between cache thread & UI */
} EntryCache;

typedef struct {
    HWND        hMainWnd;
    HINSTANCE   hInstance;
    HHOOK       hKeyboardHook;
    NOTIFYICONDATAW nid;
    
    TabMode     current_mode;
    BOOL        is_visible;
    BOOL        alt_is_down;
    
    /* Search & Selection */
    WCHAR       search_query[MAX_SEARCH_LEN];
    int         search_query_len;
    int         selected_index;
    int         scroll_offset;
    
    /* Filtered Indices */
    int         filtered_indices[MAX_ITEMS];
    int         filtered_count;
    
    /* Dual Cache Buffers (Thread-safe background updates) */
    EntryCache  window_cache;
    EntryCache  process_cache;
    
    /* Double-Buffered GDI Surface */
    HDC         hdcMem;
    HBITMAP     hbmMem;
    HBITMAP     hbmOld;
    int         mem_width;
    int         mem_height;
    
    /* Cached Fonts & Brushes (Created once to avoid GDI leak) */
    HFONT       hFontMain;
    HFONT       hFontBold;
    HFONT       hFontSmall;
    HFONT       hFontMono;
    HBRUSH      hbrBg;
    HBRUSH      hbrPanel;
    HBRUSH      hbrBorder;
    HBRUSH      hbrSelectBg;
    HBRUSH      hbrHover;
    HPEN        hpenAccent;
    HPEN        hpenBorder;
    
    /* Background Thread Control */
    HANDLE      hCacheThread;
    BOOL        bThreadRunning;
    HANDLE      hWakeEvent;
} AppContext;

/* Global application context */
extern AppContext g_app;

/* ========================================================================= */
/* Function Prototypes                                                       */
/* ========================================================================= */

/* Initialization & Teardown */
BOOL InitApplication(HINSTANCE hInstance);
void CleanupApplication(void);
BOOL SetupTrayIcon(HWND hwnd);
void RemoveTrayIcon(void);

/* Window Management & Switcher Display */
void ShowSwitcher(void);
void HideSwitcher(void);
void SwitchToSelected(void);
void KillSelectedProcess(void);
void ToggleMode(void);
void SetMode(TabMode mode);

/* Caching & Low-Level Process Inspection */
DWORD WINAPI CacheThreadProc(LPVOID lpParam);
void RefreshWindowCache(void);
void RefreshProcessCache(void);
BOOL IsAltTabWindow(HWND hwnd);
HICON ExtractWindowIcon(HWND hwnd, DWORD pid);
void FormatMemorySize(SIZE_T bytes, WCHAR* out_buf, size_t buf_size);

/* Process Management & Permissions */
BOOL EnableDebugPrivilege(void);
BOOL TerminateProcessById(DWORD pid);

/* Search & Filtering */
void UpdateFilteredList(void);
void ResetSearch(void);

/* Low-Level Keyboard Hook */
LRESULT CALLBACK LowLevelKeyboardProc(int nCode, WPARAM wParam, LPARAM lParam);

/* GDI Double-Buffered Painting */
void RenderUI(HDC hdcReal, const RECT* rcClient);
void CreateGdiResources(void);
void FreeGdiResources(void);

#ifdef __cplusplus
}
#endif

#endif /* TABMASTER_H */
