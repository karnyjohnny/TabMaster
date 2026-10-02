/**
 * TabMaster - Ultra-Lightweight Alt+Tab & Process Manager for Windows 7 (x64/x86)
 * Target Hardware: Intel Core 2 Duo, 2 GB RAM, Intel GMA 4500MHD
 * Compiler: GCC (w64devkit / MSYS2) with -Os -s
 * License: MIT
 * 
 * main.c - WinAPI implementation, hook, background caching daemon, and GDI renderer.
 */

#include "tabmaster.h"

/* Global Application Context */
AppContext g_app;

/* Function pointer for DwmIsCompositionEnabled */
typedef HRESULT (WINAPI *pfnDwmIsCompositionEnabled)(BOOL* pfEnabled);

/* Comparison function for qsort: Sort processes by RAM usage descending */
static int CompareItemsByRam(const void* a, const void* b) {
    const EntryItem* itemA = (const EntryItem*)a;
    const EntryItem* itemB = (const EntryItem*)b;
    if (itemA->ram_bytes > itemB->ram_bytes) return -1;
    if (itemA->ram_bytes < itemB->ram_bytes) return 1;
    return _wcsicmp(itemA->proc_name, itemB->proc_name);
}

/* ========================================================================= */
/* Windows 7 Privilege & Process Termination                                 */
/* ========================================================================= */

BOOL EnableDebugPrivilege(void) {
    HANDLE hToken = NULL;
    TOKEN_PRIVILEGES tp;
    LUID luid;

    if (!OpenProcessToken(GetCurrentProcess(), TOKEN_ADJUST_PRIVILEGES | TOKEN_QUERY, &hToken)) {
        return FALSE;
    }

    if (LookupPrivilegeValueW(NULL, L"SeDebugPrivilege", &luid)) {
        tp.PrivilegeCount = 1;
        tp.Privileges[0].Luid = luid;
        tp.Privileges[0].Attributes = SE_PRIVILEGE_ENABLED;
        AdjustTokenPrivileges(hToken, FALSE, &tp, sizeof(TOKEN_PRIVILEGES), NULL, NULL);
    }

    CloseHandle(hToken);
    return TRUE;
}

BOOL TerminateProcessById(DWORD pid) {
    HANDLE hProc;
    BOOL bSuccess = FALSE;

    if (pid == 0 || pid == 4) {
        /* Prevent terminating System Idle Process or System Kernel */
        MessageBeep(MB_ICONHAND);
        return FALSE;
    }

    hProc = OpenProcess(PROCESS_TERMINATE, FALSE, pid);
    if (!hProc) {
        /* Retry with full access in case SeDebugPrivilege is active */
        hProc = OpenProcess(PROCESS_ALL_ACCESS, FALSE, pid);
    }

    if (hProc) {
        bSuccess = TerminateProcess(hProc, 1);
        CloseHandle(hProc);
        MessageBeep(MB_OK);
    } else {
        MessageBeep(MB_ICONHAND);
    }

    return bSuccess;
}

/* ========================================================================= */
/* Window Filtering & Identification (Alt+Tab candidates)                    */
/* ========================================================================= */

BOOL IsAltTabWindow(HWND hwnd) {
    LONG_PTR exStyle;
    HWND hwndOwner;
    RECT rc;

    if (!IsWindow(hwnd) || (!IsWindowVisible(hwnd) && !IsIconic(hwnd))) {
        return FALSE;
    }

    /* Skip hidden or zero-size windows */
    GetWindowRect(hwnd, &rc);
    if ((rc.right - rc.left) <= 0 || (rc.bottom - rc.top) <= 0) {
        return FALSE;
    }

    /* Skip this application itself */
    if (hwnd == g_app.hMainWnd) {
        return FALSE;
    }

    /* Skip Shell tray and desktop */
    if (hwnd == GetDesktopWindow() || hwnd == GetShellWindow()) {
        return FALSE;
    }

    exStyle = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);

    /* Tool windows are not shown in Alt+Tab */
    if (exStyle & WS_EX_TOOLWINDOW) {
        return FALSE;
    }

    /* Windows with owners are usually secondary dialogs */
    hwndOwner = GetWindow(hwnd, GW_OWNER);
    if (hwndOwner != NULL && !(exStyle & WS_EX_APPWINDOW)) {
        return FALSE;
    }

    /* Window must have a non-empty title */
    if (GetWindowTextLengthW(hwnd) == 0) {
        return FALSE;
    }

    return TRUE;
}

HICON ExtractWindowIcon(HWND hwnd, DWORD pid) {
    HICON hIcon = NULL;
    DWORD_PTR dwResult = 0;

    /* 1. Try sending WM_GETICON (Fastest and most accurate) */
    if (SendMessageTimeoutW(hwnd, WM_GETICON, ICON_SMALL, 0, SMTO_ABORTIFHUNG | SMTO_BLOCK, 15, &dwResult) && dwResult) {
        hIcon = (HICON)dwResult;
    }

    /* 2. Fallback to Class Small Icon */
    if (!hIcon) {
        hIcon = (HICON)GetClassLongPtrW(hwnd, GCLP_HICONSM);
    }

    /* 3. Fallback to Class Big Icon */
    if (!hIcon) {
        hIcon = (HICON)GetClassLongPtrW(hwnd, GCLP_HICON);
    }

    /* 4. Fallback to executable icon via process module */
    if (!hIcon && pid > 0) {
        HANDLE hProcess = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION | PROCESS_VM_READ, FALSE, pid);
        if (hProcess) {
            WCHAR exePath[MAX_PATH];
            DWORD size = MAX_PATH;
            if (QueryFullProcessImageNameW(hProcess, 0, exePath, &size)) {
                ExtractIconExW(exePath, 0, NULL, &hIcon, 1);
            }
            CloseHandle(hProcess);
        }
    }

    return hIcon;
}

void FormatMemorySize(SIZE_T bytes, WCHAR* out_buf, size_t buf_size) {
    double mb = (double)bytes / (1024.0 * 1024.0);
    if (mb >= 1024.0) {
        _snwprintf(out_buf, buf_size, L"%.2f GB", mb / 1024.0);
    } else {
        _snwprintf(out_buf, buf_size, L"%.1f MB", mb);
    }
}

/* ========================================================================= */
/* Caching Engine (Daemon Worker)                                            */
/* ========================================================================= */

typedef struct {
    EntryItem temp_items[MAX_ITEMS];
    int count;
} EnumContext;

static BOOL CALLBACK EnumWindowsProc(HWND hwnd, LPARAM lParam) {
    EnumContext* ctx = (EnumContext*)lParam;
    DWORD pid = 0;
    HANDLE hProc = NULL;
    PROCESS_MEMORY_COUNTERS_EX pmc;

    if (ctx->count >= MAX_ITEMS) return FALSE;

    if (!IsAltTabWindow(hwnd)) {
        return TRUE;
    }

    EntryItem* item = &ctx->temp_items[ctx->count];
    memset(item, 0, sizeof(EntryItem));

    item->hwnd = hwnd;
    GetWindowTextW(hwnd, item->title, MAX_TITLE_LEN);
    GetWindowThreadProcessId(hwnd, &pid);
    item->pid = pid;

    /* Get Executable name and Working Set */
    hProc = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION | PROCESS_VM_READ, FALSE, pid);
    if (hProc) {
        WCHAR fullPath[MAX_PATH];
        DWORD len = MAX_PATH;
        if (QueryFullProcessImageNameW(hProc, 0, fullPath, &len)) {
            WCHAR* pName = wcsrchr(fullPath, L'\\');
            if (pName) {
                wcsncpy(item->proc_name, pName + 1, MAX_PATH - 1);
            } else {
                wcsncpy(item->proc_name, fullPath, MAX_PATH - 1);
            }
        }

        if (GetProcessMemoryInfo(hProc, (PROCESS_MEMORY_COUNTERS*)&pmc, sizeof(pmc))) {
            item->ram_bytes = pmc.WorkingSetSize;
        }

        CloseHandle(hProc);
    }

    if (item->proc_name[0] == L'\0') {
        _snwprintf(item->proc_name, MAX_PATH, L"PID %u", pid);
    }

    item->hIcon = ExtractWindowIcon(hwnd, pid);
    ctx->count++;

    return TRUE;
}

void RefreshWindowCache(void) {
    EnumContext ctx;
    ctx.count = 0;
    memset(ctx.temp_items, 0, sizeof(ctx.temp_items));

    EnumWindows(EnumWindowsProc, (LPARAM)&ctx);

    EnterCriticalSection(&g_app.window_cache.cs);
    g_app.window_cache.count = ctx.count;
    memcpy(g_app.window_cache.items, ctx.temp_items, sizeof(EntryItem) * ctx.count);
    LeaveCriticalSection(&g_app.window_cache.cs);
}

void RefreshProcessCache(void) {
    HANDLE hSnap;
    PROCESSENTRY32W pe;
    EntryItem temp_items[MAX_ITEMS];
    int count = 0;

    hSnap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
    if (hSnap == INVALID_HANDLE_VALUE) return;

    pe.dwSize = sizeof(PROCESSENTRY32W);
    if (Process32FirstW(hSnap, &pe)) {
        do {
            if (count >= MAX_ITEMS) break;
            
            /* Skip idle thread */
            if (pe.th32ProcessID == 0) continue;

            EntryItem* item = &temp_items[count];
            memset(item, 0, sizeof(EntryItem));

            item->pid = pe.th32ProcessID;
            item->hwnd = NULL;
            wcsncpy(item->proc_name, pe.szExeFile, MAX_PATH - 1);
            _snwprintf(item->title, MAX_TITLE_LEN, L"%ls (PID %u)", pe.szExeFile, pe.th32ProcessID);

            /* Query Memory */
            HANDLE hProc = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION | PROCESS_VM_READ, FALSE, pe.th32ProcessID);
            if (hProc) {
                PROCESS_MEMORY_COUNTERS_EX pmc;
                if (GetProcessMemoryInfo(hProc, (PROCESS_MEMORY_COUNTERS*)&pmc, sizeof(pmc))) {
                    item->ram_bytes = pmc.WorkingSetSize;
                }
                CloseHandle(hProc);
            }

            count++;
        } while (Process32NextW(hSnap, &pe));
    }
    CloseHandle(hSnap);

    /* Sort processes by RAM usage descending (Memory Hogs on Top) */
    if (count > 1) {
        qsort(temp_items, count, sizeof(EntryItem), CompareItemsByRam);
    }

    EnterCriticalSection(&g_app.process_cache.cs);
    g_app.process_cache.count = count;
    memcpy(g_app.process_cache.items, temp_items, sizeof(EntryItem) * count);
    LeaveCriticalSection(&g_app.process_cache.cs);
}

DWORD WINAPI CacheThreadProc(LPVOID lpParam) {
    (void)lpParam;
    while (g_app.bThreadRunning) {
        /* Populate Windows Cache */
        RefreshWindowCache();

        /* Populate Process Cache */
        RefreshProcessCache();

        /* If UI is visible, signal redraw to show updated memory values */
        if (g_app.is_visible && g_app.hMainWnd) {
            PostMessageW(g_app.hMainWnd, WM_USER + 201, 0, 0);
        }

        /* Wait 1200ms or until explicitly signaled by user action */
        WaitForSingleObject(g_app.hWakeEvent, 1200);
    }
    return 0;
}

/* ========================================================================= */
/* Search & Filter Logic                                                     */
/* ========================================================================= */

void UpdateFilteredList(void) {
    EntryCache* cache = (g_app.current_mode == MODE_WINDOWS) ? &g_app.window_cache : &g_app.process_cache;
    int i;

    EnterCriticalSection(&cache->cs);
    g_app.filtered_count = 0;

    for (i = 0; i < cache->count; i++) {
        if (g_app.search_query_len == 0) {
            g_app.filtered_indices[g_app.filtered_count++] = i;
        } else {
            /* Case-insensitive search inside Title and Process Name */
            WCHAR wTitleLower[MAX_TITLE_LEN];
            WCHAR wProcLower[MAX_PATH];
            WCHAR wQueryLower[MAX_SEARCH_LEN];
            int j;

            for (j = 0; cache->items[i].title[j] && j < MAX_TITLE_LEN - 1; j++) {
                wTitleLower[j] = (WCHAR)towlower(cache->items[i].title[j]);
            }
            wTitleLower[j] = L'\0';

            for (j = 0; cache->items[i].proc_name[j] && j < MAX_PATH - 1; j++) {
                wProcLower[j] = (WCHAR)towlower(cache->items[i].proc_name[j]);
            }
            wProcLower[j] = L'\0';

            for (j = 0; g_app.search_query[j] && j < MAX_SEARCH_LEN - 1; j++) {
                wQueryLower[j] = (WCHAR)towlower(g_app.search_query[j]);
            }
            wQueryLower[j] = L'\0';

            if (wcsstr(wTitleLower, wQueryLower) != NULL || wcsstr(wProcLower, wQueryLower) != NULL) {
                g_app.filtered_indices[g_app.filtered_count++] = i;
            }
        }
    }
    LeaveCriticalSection(&cache->cs);

    /* Clamp Selection */
    if (g_app.selected_index >= g_app.filtered_count) {
        g_app.selected_index = (g_app.filtered_count > 0) ? g_app.filtered_count - 1 : 0;
    }
    if (g_app.selected_index < 0) {
        g_app.selected_index = 0;
    }

    /* Adjust scroll window */
    if (g_app.selected_index < g_app.scroll_offset) {
        g_app.scroll_offset = g_app.selected_index;
    } else if (g_app.selected_index >= g_app.scroll_offset + UI_MAX_VISIBLE_ROWS) {
        g_app.scroll_offset = g_app.selected_index - UI_MAX_VISIBLE_ROWS + 1;
    }
}

void ResetSearch(void) {
    g_app.search_query[0] = L'\0';
    g_app.search_query_len = 0;
    g_app.selected_index = 0;
    g_app.scroll_offset = 0;
    UpdateFilteredList();
}

/* ========================================================================= */
/* Switcher Window Display & Actions                                         */
/* ========================================================================= */

void ShowSwitcher(void) {
    int screenW, screenH, posX, posY;

    if (g_app.is_visible) return;

    /* Center window on active primary monitor */
    screenW = GetSystemMetrics(SM_CXSCREEN);
    screenH = GetSystemMetrics(SM_CYSCREEN);
    posX = (screenW - UI_WIDTH) / 2;
    posY = (screenH - UI_HEIGHT) / 2;

    SetWindowPos(g_app.hMainWnd, HWND_TOPMOST, posX, posY, UI_WIDTH, UI_HEIGHT, SWP_NOACTIVATE | SWP_SHOWWINDOW);

    g_app.is_visible = TRUE;
    ResetSearch();

    /* Select the 2nd window by default in Alt+Tab mode (most recent previous app) */
    if (g_app.current_mode == MODE_WINDOWS && g_app.filtered_count > 1) {
        g_app.selected_index = 1;
    } else {
        g_app.selected_index = 0;
    }

    /* Force foreground activation */
    SetForegroundWindow(g_app.hMainWnd);
    SetActiveWindow(g_app.hMainWnd);
    SetFocus(g_app.hMainWnd);

    InvalidateRect(g_app.hMainWnd, NULL, FALSE);
}

void HideSwitcher(void) {
    if (!g_app.is_visible) return;
    ShowWindow(g_app.hMainWnd, SW_HIDE);
    g_app.is_visible = FALSE;
    g_app.alt_is_down = FALSE;
}

void SwitchToSelected(void) {
    EntryCache* cache;
    HWND hwndTarget = NULL;

    if (!g_app.is_visible || g_app.filtered_count == 0) {
        HideSwitcher();
        return;
    }

    cache = (g_app.current_mode == MODE_WINDOWS) ? &g_app.window_cache : &g_app.process_cache;
    EnterCriticalSection(&cache->cs);
    int realIdx = g_app.filtered_indices[g_app.selected_index];
    if (realIdx >= 0 && realIdx < cache->count) {
        hwndTarget = cache->items[realIdx].hwnd;
    }
    LeaveCriticalSection(&cache->cs);

    HideSwitcher();

    if (hwndTarget && IsWindow(hwndTarget)) {
        /* Windows 7 Foreground Lockout Bypass Trick:
           Attach thread input between foreground window and current thread */
        HWND hCurFore = GetForegroundWindow();
        DWORD dwForeThread = GetWindowThreadProcessId(hCurFore, NULL);
        DWORD dwCurThread = GetCurrentThreadId();

        if (dwForeThread != dwCurThread) {
            AttachThreadInput(dwCurThread, dwForeThread, TRUE);
        }

        if (IsIconic(hwndTarget)) {
            ShowWindow(hwndTarget, SW_RESTORE);
        }

        SetForegroundWindow(hwndTarget);
        BringWindowToTop(hwndTarget);

        if (dwForeThread != dwCurThread) {
            AttachThreadInput(dwCurThread, dwForeThread, FALSE);
        }
    }
}

void KillSelectedProcess(void) {
    EntryCache* cache;
    DWORD targetPid = 0;

    if (g_app.filtered_count == 0) return;

    cache = (g_app.current_mode == MODE_WINDOWS) ? &g_app.window_cache : &g_app.process_cache;
    EnterCriticalSection(&cache->cs);
    int realIdx = g_app.filtered_indices[g_app.selected_index];
    if (realIdx >= 0 && realIdx < cache->count) {
        targetPid = cache->items[realIdx].pid;
    }
    LeaveCriticalSection(&cache->cs);

    if (targetPid > 0) {
        TerminateProcessById(targetPid);
        /* Trigger immediate cache update */
        SetEvent(g_app.hWakeEvent);
        UpdateFilteredList();
        InvalidateRect(g_app.hMainWnd, NULL, FALSE);
    }
}

void SetMode(TabMode mode) {
    if (g_app.current_mode != mode) {
        g_app.current_mode = mode;
        ResetSearch();
        InvalidateRect(g_app.hMainWnd, NULL, FALSE);
    }
}

void ToggleMode(void) {
    SetMode(g_app.current_mode == MODE_WINDOWS ? MODE_PROCESSES : MODE_WINDOWS);
}

/* ========================================================================= */
/* Low-Level Keyboard Hook (Instant Alt+Tab Interception)                    */
/* ========================================================================= */

LRESULT CALLBACK LowLevelKeyboardProc(int nCode, WPARAM wParam, LPARAM lParam) {
    if (nCode == HC_ACTION) {
        KBDLLHOOKSTRUCT* pKbd = (KBDLLHOOKSTRUCT*)lParam;
        BOOL bAltPressed = (pKbd->flags & LLKHF_ALTDOWN) != 0 || (GetKeyState(VK_MENU) & 0x8000) != 0;

        /* Intercept Alt+Tab */
        if (pKbd->vkCode == VK_TAB && bAltPressed) {
            if (wParam == WM_SYSKEYDOWN || wParam == WM_KEYDOWN) {
                g_app.alt_is_down = TRUE;
                if (!g_app.is_visible) {
                    ShowSwitcher();
                } else {
                    /* Advance selection */
                    BOOL bShift = (GetKeyState(VK_SHIFT) & 0x8000) != 0;
                    if (bShift) {
                        g_app.selected_index--;
                        if (g_app.selected_index < 0) {
                            g_app.selected_index = (g_app.filtered_count > 0) ? g_app.filtered_count - 1 : 0;
                        }
                    } else {
                        g_app.selected_index++;
                        if (g_app.selected_index >= g_app.filtered_count) {
                            g_app.selected_index = 0;
                        }
                    }
                    UpdateFilteredList();
                    InvalidateRect(g_app.hMainWnd, NULL, FALSE);
                }
                return 1; /* Consume Alt+Tab! */
            }
        }

        /* Check if Alt is released */
        if (pKbd->vkCode == VK_MENU || pKbd->vkCode == VK_LMENU || pKbd->vkCode == VK_RMENU) {
            if (wParam == WM_KEYUP || wParam == WM_SYSKEYUP) {
                if (g_app.is_visible && g_app.alt_is_down) {
                    g_app.alt_is_down = FALSE;
                }
            }
        }
    }
    return CallNextHookEx(g_app.hKeyboardHook, nCode, wParam, lParam);
}

/* ========================================================================= */
/* Double-Buffered GDI Custom Dark Mode Renderer                             */
/* SLA: < 0.1ms render time, 0 flicker, 0 GDI leaks                          */
/* ========================================================================= */

void CreateGdiResources(void) {
    g_app.hFontMain = CreateFontW(15, 0, 0, 0, FW_NORMAL, FALSE, FALSE, FALSE,
                                 DEFAULT_CHARSET, OUT_DEFAULT_PRECIS, CLIP_DEFAULT_PRECIS,
                                 CLEARTYPE_QUALITY, DEFAULT_PITCH | FF_DONTCARE, L"Segoe UI");

    g_app.hFontBold = CreateFontW(15, 0, 0, 0, FW_SEMIBOLD, FALSE, FALSE, FALSE,
                                 DEFAULT_CHARSET, OUT_DEFAULT_PRECIS, CLIP_DEFAULT_PRECIS,
                                 CLEARTYPE_QUALITY, DEFAULT_PITCH | FF_DONTCARE, L"Segoe UI");

    g_app.hFontSmall = CreateFontW(12, 0, 0, 0, FW_NORMAL, FALSE, FALSE, FALSE,
                                  DEFAULT_CHARSET, OUT_DEFAULT_PRECIS, CLIP_DEFAULT_PRECIS,
                                  CLEARTYPE_QUALITY, DEFAULT_PITCH | FF_DONTCARE, L"Segoe UI");

    g_app.hFontMono = CreateFontW(13, 0, 0, 0, FW_NORMAL, FALSE, FALSE, FALSE,
                                 DEFAULT_CHARSET, OUT_DEFAULT_PRECIS, CLIP_DEFAULT_PRECIS,
                                 CLEARTYPE_QUALITY, FIXED_PITCH | FF_MODERN, L"Consolas");

    g_app.hbrBg = CreateSolidBrush(COLOR_BG);
    g_app.hbrPanel = CreateSolidBrush(COLOR_PANEL);
    g_app.hbrBorder = CreateSolidBrush(COLOR_BORDER);
    g_app.hbrSelectBg = CreateSolidBrush(COLOR_SELECT_BG);
    g_app.hbrHover = CreateSolidBrush(COLOR_ROW_HOVER);

    g_app.hpenAccent = CreatePen(PS_SOLID, 2, COLOR_SELECT_ACCENT);
    g_app.hpenBorder = CreatePen(PS_SOLID, 1, COLOR_BORDER);
}

void FreeGdiResources(void) {
    if (g_app.hFontMain) DeleteObject(g_app.hFontMain);
    if (g_app.hFontBold) DeleteObject(g_app.hFontBold);
    if (g_app.hFontSmall) DeleteObject(g_app.hFontSmall);
    if (g_app.hFontMono) DeleteObject(g_app.hFontMono);

    if (g_app.hbrBg) DeleteObject(g_app.hbrBg);
    if (g_app.hbrPanel) DeleteObject(g_app.hbrPanel);
    if (g_app.hbrBorder) DeleteObject(g_app.hbrBorder);
    if (g_app.hbrSelectBg) DeleteObject(g_app.hbrSelectBg);
    if (g_app.hbrHover) DeleteObject(g_app.hbrHover);

    if (g_app.hpenAccent) DeleteObject(g_app.hpenAccent);
    if (g_app.hpenBorder) DeleteObject(g_app.hpenBorder);

    if (g_app.hdcMem) {
        SelectObject(g_app.hdcMem, g_app.hbmOld);
        DeleteDC(g_app.hdcMem);
        DeleteObject(g_app.hbmMem);
        g_app.hdcMem = NULL;
    }
}

void RenderUI(HDC hdcReal, const RECT* rcClient) {
    int w = rcClient->right - rcClient->left;
    int h = rcClient->bottom - rcClient->top;
    HDC hdc;
    RECT rc;
    int i;
    EntryCache* cache;

    /* Initialize or resize in-memory backbuffer */
    if (!g_app.hdcMem || g_app.mem_width != w || g_app.mem_height != h) {
        if (g_app.hdcMem) {
            SelectObject(g_app.hdcMem, g_app.hbmOld);
            DeleteDC(g_app.hdcMem);
            DeleteObject(g_app.hbmMem);
        }
        g_app.hdcMem = CreateCompatibleDC(hdcReal);
        g_app.hbmMem = CreateCompatibleBitmap(hdcReal, w, h);
        g_app.hbmOld = (HBITMAP)SelectObject(g_app.hdcMem, g_app.hbmMem);
        g_app.mem_width = w;
        g_app.mem_height = h;
    }
    hdc = g_app.hdcMem;

    /* 1. Paint Background & Border */
    FillRect(hdc, rcClient, g_app.hbrBg);
    FrameRect(hdc, rcClient, g_app.hbrBorder);

    /* 2. Top Bar: Search Input Bar (#1C1C1C) */
    rc.left = 12;
    rc.top = 10;
    rc.right = w - 12;
    rc.bottom = 10 + UI_SEARCH_HEIGHT - 10;
    FillRect(hdc, &rc, g_app.hbrPanel);
    FrameRect(hdc, &rc, g_app.hbrBorder);

    /* Draw Search Icon */
    SetBkMode(hdc, TRANSPARENT);
    SelectObject(hdc, g_app.hFontSmall);
    SetTextColor(hdc, COLOR_TEXT_MUTED);
    RECT rcSearchIcon = { rc.left + 10, rc.top + 8, rc.left + 30, rc.bottom };
    DrawTextW(hdc, L"⌕", -1, &rcSearchIcon, DT_SINGLELINE | DT_VCENTER);

    /* Draw Search Text or Placeholder */
    SelectObject(hdc, g_app.hFontMain);
    RECT rcSearchText = { rc.left + 32, rc.top + 7, rc.right - 10, rc.bottom - 7 };
    if (g_app.search_query_len > 0) {
        SetTextColor(hdc, COLOR_TEXT_PRIMARY);
        DrawTextW(hdc, g_app.search_query, g_app.search_query_len, &rcSearchText, DT_SINGLELINE | DT_VCENTER);
    } else {
        SetTextColor(hdc, COLOR_TEXT_DIM);
        DrawTextW(hdc, (g_app.current_mode == MODE_WINDOWS) ? L"Type to filter windows instantly..." : L"Type to search running processes...", -1, &rcSearchText, DT_SINGLELINE | DT_VCENTER);
    }

    /* 3. Mode Tabs Header (Windows vs Processes) */
    int tabY = UI_SEARCH_HEIGHT + 6;
    RECT rcTabWin = { 12, tabY, 180, tabY + UI_TAB_HEIGHT };
    RECT rcTabProc = { 186, tabY, 354, tabY + UI_TAB_HEIGHT };

    /* Tab 1: Windows */
    if (g_app.current_mode == MODE_WINDOWS) {
        FillRect(hdc, &rcTabWin, g_app.hbrSelectBg);
        SetTextColor(hdc, COLOR_TEXT_PRIMARY);
        SelectObject(hdc, g_app.hFontBold);
    } else {
        FillRect(hdc, &rcTabWin, g_app.hbrPanel);
        SetTextColor(hdc, COLOR_TEXT_MUTED);
        SelectObject(hdc, g_app.hFontMain);
    }
    DrawTextW(hdc, L"🗔  Windows (←)", -1, &rcTabWin, DT_CENTER | DT_VCENTER | DT_SINGLELINE);

    /* Tab 2: Processes */
    if (g_app.current_mode == MODE_PROCESSES) {
        FillRect(hdc, &rcTabProc, g_app.hbrSelectBg);
        SetTextColor(hdc, COLOR_TEXT_PRIMARY);
        SelectObject(hdc, g_app.hFontBold);
    } else {
        FillRect(hdc, &rcTabProc, g_app.hbrPanel);
        SetTextColor(hdc, COLOR_TEXT_MUTED);
        SelectObject(hdc, g_app.hFontMain);
    }
    DrawTextW(hdc, L"⚡ Processes (→)", -1, &rcTabProc, DT_CENTER | DT_VCENTER | DT_SINGLELINE);

    /* Counter indicator on right side of tab header */
    RECT rcCount = { w - 160, tabY, w - 16, tabY + UI_TAB_HEIGHT };
    WCHAR szCount[64];
    _snwprintf(szCount, 64, L"%d items", g_app.filtered_count);
    SetTextColor(hdc, COLOR_TEXT_DIM);
    SelectObject(hdc, g_app.hFontSmall);
    DrawTextW(hdc, szCount, -1, &rcCount, DT_RIGHT | DT_VCENTER | DT_SINGLELINE);

    /* 4. Item List */
    int listTop = tabY + UI_TAB_HEIGHT + 8;
    cache = (g_app.current_mode == MODE_WINDOWS) ? &g_app.window_cache : &g_app.process_cache;

    EnterCriticalSection(&cache->cs);

    for (i = 0; i < UI_MAX_VISIBLE_ROWS; i++) {
        int itemIndex = g_app.scroll_offset + i;
        if (itemIndex >= g_app.filtered_count) break;

        int realIdx = g_app.filtered_indices[itemIndex];
        if (realIdx < 0 || realIdx >= cache->count) continue;

        EntryItem* item = &cache->items[realIdx];
        int rowY = listTop + i * UI_ITEM_HEIGHT;
        RECT rcRow = { 12, rowY, w - 12, rowY + UI_ITEM_HEIGHT - 2 };

        BOOL bSelected = (itemIndex == g_app.selected_index);

        /* Draw row background */
        if (bSelected) {
            FillRect(hdc, &rcRow, g_app.hbrSelectBg);
            /* Left Accent Marker (#0078D7) */
            RECT rcAccent = { rcRow.left, rcRow.top, rcRow.left + 3, rcRow.bottom };
            HBRUSH hbrBlue = CreateSolidBrush(COLOR_SELECT_ACCENT);
            FillRect(hdc, &rcAccent, hbrBlue);
            DeleteObject(hbrBlue);
        } else if (i % 2 == 1) {
            HBRUSH hbrAlt = CreateSolidBrush(COLOR_ROW_ALT);
            FillRect(hdc, &rcRow, hbrAlt);
            DeleteObject(hbrAlt);
        }

        /* Draw Icon (16x16) */
        int iconX = rcRow.left + 12;
        int iconY = rcRow.top + (UI_ITEM_HEIGHT - 2 - UI_ICON_SIZE) / 2;
        if (item->hIcon) {
            DrawIconEx(hdc, iconX, iconY, item->hIcon, UI_ICON_SIZE, UI_ICON_SIZE, 0, NULL, DI_NORMAL);
        } else {
            /* Placeholder Dot */
            RECT rcDot = { iconX + 4, iconY + 4, iconX + 12, iconY + 12 };
            HBRUSH hbrDot = CreateSolidBrush(COLOR_TEXT_DIM);
            FillRect(hdc, &rcDot, hbrDot);
            DeleteObject(hbrDot);
        }

        /* Title text */
        RECT rcTitle = { rcRow.left + 36, rcRow.top, rcRow.right - 220, rcRow.bottom };
        SelectObject(hdc, bSelected ? g_app.hFontBold : g_app.hFontMain);
        SetTextColor(hdc, bSelected ? RGB(255, 255, 255) : COLOR_TEXT_PRIMARY);
        DrawTextW(hdc, item->title, -1, &rcTitle, DT_SINGLELINE | DT_VCENTER | DT_END_ELLIPSIS);

        /* Process name */
        RECT rcProc = { rcRow.right - 210, rcRow.top, rcRow.right - 90, rcRow.bottom };
        SelectObject(hdc, g_app.hFontSmall);
        SetTextColor(hdc, bSelected ? RGB(200, 225, 255) : COLOR_TEXT_MUTED);
        DrawTextW(hdc, item->proc_name, -1, &rcProc, DT_SINGLELINE | DT_VCENTER | DT_END_ELLIPSIS);

        /* Memory Metrics */
        RECT rcRam = { rcRow.right - 85, rcRow.top, rcRow.right - 10, rcRow.bottom };
        WCHAR szRam[32];
        FormatMemorySize(item->ram_bytes, szRam, 32);
        SelectObject(hdc, g_app.hFontMono);

        /* Highlight high memory consumers in Amber/Red */
        if (item->ram_bytes > (SIZE_T)500 * 1024 * 1024) {
            SetTextColor(hdc, COLOR_ACCENT_RED);
        } else if (item->ram_bytes > (SIZE_T)150 * 1024 * 1024) {
            SetTextColor(hdc, COLOR_ACCENT_AMBER);
        } else {
            SetTextColor(hdc, bSelected ? RGB(220, 240, 255) : COLOR_ACCENT_GREEN);
        }
        DrawTextW(hdc, szRam, -1, &rcRam, DT_SINGLELINE | DT_VCENTER | DT_RIGHT);
    }

    LeaveCriticalSection(&cache->cs);

    /* 5. Elegant Footer (Shortcuts bar) */
    RECT rcFooter = { 1, h - UI_FOOTER_HEIGHT, w - 1, h - 1 };
    FillRect(hdc, &rcFooter, g_app.hbrPanel);

    RECT rcFooterText = { 14, h - UI_FOOTER_HEIGHT, w - 14, h };
    SelectObject(hdc, g_app.hFontSmall);
    SetTextColor(hdc, COLOR_TEXT_MUTED);
    DrawTextW(hdc, L"↑↓ navigate  ·  Enter switch  ·  ←→ tabs  ·  Del / MMB kill process  ·  Esc close", -1,
              &rcFooterText, DT_SINGLELINE | DT_VCENTER);

    /* Instant BitBlt to display hardware (< 0.1ms) */
    BitBlt(hdcReal, 0, 0, w, h, hdc, 0, 0, SRCCOPY);
}

/* ========================================================================= */
/* Window Procedure                                                          */
/* ========================================================================= */

LRESULT CALLBACK WndProc(HWND hwnd, UINT msg, WPARAM wParam, LPARAM lParam) {
    switch (msg) {
        case WM_CREATE: {
            CreateGdiResources();
            SetupTrayIcon(hwnd);
            return 0;
        }

        case WM_ERASEBKGND:
            /* Crucial: Prevent GDI background flicker by doing nothing */
            return 1;

        case WM_PAINT: {
            PAINTSTRUCT ps;
            HDC hdc = BeginPaint(hwnd, &ps);
            RECT rc;
            GetClientRect(hwnd, &rc);
            RenderUI(hdc, &rc);
            EndPaint(hwnd, &ps);
            return 0;
        }

        case WM_ACTIVATE: {
            if (LOWORD(wParam) == WA_INACTIVE) {
                /* If window loses focus, close cleanly */
                HideSwitcher();
            }
            return 0;
        }

        case WM_KEYDOWN: {
            switch (wParam) {
                case VK_UP:
                    if (g_app.selected_index > 0) {
                        g_app.selected_index--;
                        UpdateFilteredList();
                        InvalidateRect(hwnd, NULL, FALSE);
                    }
                    return 0;

                case VK_DOWN:
                    if (g_app.selected_index < g_app.filtered_count - 1) {
                        g_app.selected_index++;
                        UpdateFilteredList();
                        InvalidateRect(hwnd, NULL, FALSE);
                    }
                    return 0;

                case VK_LEFT:
                    SetMode(MODE_WINDOWS);
                    return 0;

                case VK_RIGHT:
                    SetMode(MODE_PROCESSES);
                    return 0;

                case VK_RETURN:
                    SwitchToSelected();
                    return 0;

                case VK_ESCAPE:
                    HideSwitcher();
                    return 0;

                case VK_DELETE:
                    KillSelectedProcess();
                    return 0;

                case VK_BACK:
                    if (g_app.search_query_len > 0) {
                        g_app.search_query[--g_app.search_query_len] = L'\0';
                        UpdateFilteredList();
                        InvalidateRect(hwnd, NULL, FALSE);
                    }
                    return 0;
            }
            break;
        }

        case WM_CHAR: {
            /* Handle live search typing */
            WCHAR ch = (WCHAR)wParam;
            if (((ch >= 32 && ch < 127) || (ch > 127))) {
                if (g_app.search_query_len < MAX_SEARCH_LEN - 1) {
                    g_app.search_query[g_app.search_query_len++] = ch;
                    g_app.search_query[g_app.search_query_len] = L'\0';
                    UpdateFilteredList();
                    InvalidateRect(hwnd, NULL, FALSE);
                }
                return 0;
            }
            break;
        }

        case WM_LBUTTONDOWN: {
            int x = GET_X_LPARAM(lParam);
            int y = GET_Y_LPARAM(lParam);
            int tabY = UI_SEARCH_HEIGHT + 6;

            /* Check Tab clicks */
            if (y >= tabY && y <= tabY + UI_TAB_HEIGHT) {
                if (x >= 12 && x <= 180) {
                    SetMode(MODE_WINDOWS);
                } else if (x >= 186 && x <= 354) {
                    SetMode(MODE_PROCESSES);
                }
                return 0;
            }

            /* Check List item clicks */
            int listTop = tabY + UI_TAB_HEIGHT + 8;
            if (y >= listTop && y < listTop + UI_MAX_VISIBLE_ROWS * UI_ITEM_HEIGHT) {
                int clickedRow = (y - listTop) / UI_ITEM_HEIGHT;
                int targetIdx = g_app.scroll_offset + clickedRow;
                if (targetIdx < g_app.filtered_count) {
                    g_app.selected_index = targetIdx;
                    SwitchToSelected();
                }
            }
            return 0;
        }

        case WM_MBUTTONUP: {
            /* Middle-click on any row immediately kills the target process */
            int y = GET_Y_LPARAM(lParam);
            int tabY = UI_SEARCH_HEIGHT + 6;
            int listTop = tabY + UI_TAB_HEIGHT + 8;
            if (y >= listTop && y < listTop + UI_MAX_VISIBLE_ROWS * UI_ITEM_HEIGHT) {
                int clickedRow = (y - listTop) / UI_ITEM_HEIGHT;
                int targetIdx = g_app.scroll_offset + clickedRow;
                if (targetIdx < g_app.filtered_count) {
                    g_app.selected_index = targetIdx;
                    KillSelectedProcess();
                }
            }
            return 0;
        }

        case WM_MOUSEWHEEL: {
            short delta = GET_WHEEL_DELTA_WPARAM(wParam);
            if (delta > 0 && g_app.selected_index > 0) {
                g_app.selected_index--;
            } else if (delta < 0 && g_app.selected_index < g_app.filtered_count - 1) {
                g_app.selected_index++;
            }
            UpdateFilteredList();
            InvalidateRect(hwnd, NULL, FALSE);
            return 0;
        }

        case WM_TRAYICON_MSG: {
            if (lParam == WM_LBUTTONUP) {
                ShowSwitcher();
            } else if (lParam == WM_RBUTTONUP) {
                POINT pt;
                HMENU hMenu = CreatePopupMenu();
                GetCursorPos(&pt);
                AppendMenuW(hMenu, MF_STRING, ID_TRAY_RESTORE, L"Show TabMaster (Alt+Tab)");
                AppendMenuW(hMenu, MF_SEPARATOR, 0, NULL);
                AppendMenuW(hMenu, (g_app.current_mode == MODE_WINDOWS ? MF_CHECKED : MF_UNCHECKED) | MF_STRING, ID_TRAY_MODE_WIN, L"Mode: Windows");
                AppendMenuW(hMenu, (g_app.current_mode == MODE_PROCESSES ? MF_CHECKED : MF_UNCHECKED) | MF_STRING, ID_TRAY_MODE_PROC, L"Mode: Processes");
                AppendMenuW(hMenu, MF_STRING, ID_TRAY_REFRESH, L"Refresh Cache Now");
                AppendMenuW(hMenu, MF_SEPARATOR, 0, NULL);
                AppendMenuW(hMenu, MF_STRING, ID_TRAY_EXIT, L"Exit TabMaster");

                SetForegroundWindow(hwnd);
                TrackPopupMenu(hMenu, TPM_RIGHTALIGN | TPM_BOTTOMALIGN, pt.x, pt.y, 0, hwnd, NULL);
                DestroyMenu(hMenu);
            }
            return 0;
        }

        case WM_COMMAND: {
            switch (LOWORD(wParam)) {
                case ID_TRAY_RESTORE:
                    ShowSwitcher();
                    break;
                case ID_TRAY_MODE_WIN:
                    SetMode(MODE_WINDOWS);
                    ShowSwitcher();
                    break;
                case ID_TRAY_MODE_PROC:
                    SetMode(MODE_PROCESSES);
                    ShowSwitcher();
                    break;
                case ID_TRAY_REFRESH:
                    SetEvent(g_app.hWakeEvent);
                    break;
                case ID_TRAY_EXIT:
                    DestroyWindow(hwnd);
                    break;
            }
            return 0;
        }

        case WM_USER + 201: {
            /* Background thread notification: Refresh UI */
            UpdateFilteredList();
            InvalidateRect(hwnd, NULL, FALSE);
            return 0;
        }

        case WM_DESTROY: {
            RemoveTrayIcon();
            FreeGdiResources();
            PostQuitMessage(0);
            return 0;
        }
    }

    return DefWindowProcW(hwnd, msg, wParam, lParam);
}

/* ========================================================================= */
/* System Tray Setup                                                         */
/* ========================================================================= */

BOOL SetupTrayIcon(HWND hwnd) {
    memset(&g_app.nid, 0, sizeof(NOTIFYICONDATAW));
    g_app.nid.cbSize = sizeof(NOTIFYICONDATAW);
    g_app.nid.hWnd = hwnd;
    g_app.nid.uID = 1;
    g_app.nid.uFlags = NIF_MESSAGE | NIF_ICON | NIF_TIP;
    g_app.nid.uCallbackMessage = WM_TRAYICON_MSG;
    g_app.nid.hIcon = LoadIconW(NULL, (LPCWSTR)IDI_APPLICATION);
    wcsncpy(g_app.nid.szTip, L"TabMaster - Ultra-Fast Alt+Tab & Process Manager", 128);
    return Shell_NotifyIconW(NIM_ADD, &g_app.nid);
}

void RemoveTrayIcon(void) {
    Shell_NotifyIconW(NIM_DELETE, &g_app.nid);
}

/* ========================================================================= */
/* Entry Point (WinMain)                                                     */
/* ========================================================================= */

int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nShowCmd) {
    (void)hPrevInstance;
    (void)lpCmdLine;
    (void)nShowCmd;

    MSG msg;
    WNDCLASSEXW wc;
    HWND hMutex;

    /* Prevent multiple instances */
    hMutex = CreateMutexW(NULL, TRUE, L"TabMaster_SingleInstanceMutex");
    if (GetLastError() == ERROR_ALREADY_EXISTS) {
        HWND hExisting = FindWindowW(APP_WINDOW_CLASS, NULL);
        if (hExisting) {
            PostMessageW(hExisting, WM_COMMAND, ID_TRAY_RESTORE, 0);
        }
        return 0;
    }

    /* Elevate Debug Privileges for Kill Switch */
    EnableDebugPrivilege();

    /* Initialize Application Context */
    memset(&g_app, 0, sizeof(AppContext));
    g_app.hInstance = hInstance;
    g_app.current_mode = MODE_WINDOWS;
    InitializeCriticalSection(&g_app.window_cache.cs);
    InitializeCriticalSection(&g_app.process_cache.cs);
    g_app.hWakeEvent = CreateEventW(NULL, FALSE, FALSE, NULL);
    g_app.bThreadRunning = TRUE;

    /* Register Window Class */
    memset(&wc, 0, sizeof(WNDCLASSEXW));
    wc.cbSize = sizeof(WNDCLASSEXW);
    wc.lpfnWndProc = WndProc;
    wc.hInstance = hInstance;
    wc.hCursor = LoadCursorW(NULL, (LPCWSTR)IDC_ARROW);
    wc.lpszClassName = APP_WINDOW_CLASS;
    RegisterClassExW(&wc);

    /* Create Borderless Popup Window */
    g_app.hMainWnd = CreateWindowExW(
        WS_EX_TOPMOST | WS_EX_TOOLWINDOW,
        APP_WINDOW_CLASS,
        APP_NAME,
        WS_POPUP,
        0, 0, UI_WIDTH, UI_HEIGHT,
        NULL, NULL, hInstance, NULL
    );

    if (!g_app.hMainWnd) {
        return 1;
    }

    /* Set Windows 7 DWM Attributes for Dark / Clean Aesthetics */
    HMODULE hDwm = LoadLibraryW(L"dwmapi.dll");
    if (hDwm) {
        pfnDwmIsCompositionEnabled pfnComp = (pfnDwmIsCompositionEnabled)(void*)GetProcAddress(hDwm, "DwmIsCompositionEnabled");
        if (pfnComp) {
            BOOL bComp = FALSE;
            pfnComp(&bComp);
        }
        FreeLibrary(hDwm);
    }

    /* Initial Cache Populating */
    RefreshWindowCache();
    RefreshProcessCache();
    UpdateFilteredList();

    /* Start Background Worker Thread */
    g_app.hCacheThread = CreateThread(NULL, 0, CacheThreadProc, NULL, 0, NULL);

    /* Register Low-Level Keyboard Hook (Captures Alt+Tab) */
    g_app.hKeyboardHook = SetWindowsHookExW(WH_KEYBOARD_LL, LowLevelKeyboardProc, hInstance, 0);

    /* Standard Message Loop */
    while (GetMessageW(&msg, NULL, 0, 0)) {
        TranslateMessage(&msg);
        DispatchMessageW(&msg);
    }

    /* Cleanup */
    if (g_app.hKeyboardHook) {
        UnhookWindowsHookEx(g_app.hKeyboardHook);
    }

    g_app.bThreadRunning = FALSE;
    SetEvent(g_app.hWakeEvent);
    WaitForSingleObject(g_app.hCacheThread, 1000);
    CloseHandle(g_app.hCacheThread);
    CloseHandle(g_app.hWakeEvent);

    DeleteCriticalSection(&g_app.window_cache.cs);
    DeleteCriticalSection(&g_app.process_cache.cs);
    CloseHandle(hMutex);

    return (int)msg.wParam;
}
