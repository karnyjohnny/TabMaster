export interface MockItem {
  id: string;
  title: string;
  procName: string;
  pid: number;
  ramBytes: number;
  cpuPercent: number;
  isHung?: boolean;
  category: 'browser' | 'editor' | 'media' | 'system' | 'terminal' | 'tool';
  iconType: string;
}

export const INITIAL_WINDOWS: MockItem[] = [
  {
    id: 'win-1',
    title: 'Google Chrome - Stack Overflow & GitHub Pull Request #14',
    procName: 'chrome.exe',
    pid: 3824,
    ramBytes: 482 * 1024 * 1024,
    cpuPercent: 2.4,
    category: 'browser',
    iconType: 'chrome'
  },
  {
    id: 'win-2',
    title: 'Sublime Text - main.c (TabMaster C Source)',
    procName: 'sublime_text.exe',
    pid: 5120,
    ramBytes: 38 * 1024 * 1024,
    cpuPercent: 0.1,
    category: 'editor',
    iconType: 'code'
  },
  {
    id: 'win-3',
    title: 'foobar2000 v1.6.16 - [FLAC 24bit/96kHz] Daft Punk - Random Access Memories',
    procName: 'foobar2000.exe',
    pid: 2460,
    ramBytes: 19 * 1024 * 1024,
    cpuPercent: 0.8,
    category: 'media',
    iconType: 'audio'
  },
  {
    id: 'win-4',
    title: 'w64devkit Command Prompt - make all [x86_64-w64-mingw32-gcc]',
    procName: 'cmd.exe',
    pid: 4188,
    ramBytes: 6 * 1024 * 1024,
    cpuPercent: 0.0,
    category: 'terminal',
    iconType: 'terminal'
  },
  {
    id: 'win-5',
    title: 'Media Player Classic Home Cinema - tutorial_winapi_d2d.mkv',
    procName: 'mpc-hc64.exe',
    pid: 6240,
    ramBytes: 68 * 1024 * 1024,
    cpuPercent: 3.8,
    category: 'media',
    iconType: 'video'
  },
  {
    id: 'win-6',
    title: 'Windows Explorer - C:\\Dev\\TabMaster\\c_source',
    procName: 'explorer.exe',
    pid: 1480,
    ramBytes: 42 * 1024 * 1024,
    cpuPercent: 0.2,
    category: 'system',
    iconType: 'folder'
  },
  {
    id: 'win-7',
    title: 'Process Hacker 2.39 (x64) - System Diagnostics',
    procName: 'ProcessHacker.exe',
    pid: 7892,
    ramBytes: 24 * 1024 * 1024,
    cpuPercent: 1.1,
    category: 'tool',
    iconType: 'activity'
  },
  {
    id: 'win-8',
    title: 'PuTTY - root@core2duo-homelab.lan:22',
    procName: 'putty.exe',
    pid: 3104,
    ramBytes: 4 * 1024 * 1024,
    cpuPercent: 0.0,
    category: 'terminal',
    iconType: 'terminal'
  }
];

export const INITIAL_PROCESSES: MockItem[] = [
  {
    id: 'proc-1',
    title: 'chrome.exe (GPU Process & Tab Pool - 8 tabs)',
    procName: 'chrome.exe',
    pid: 3824,
    ramBytes: 748 * 1024 * 1024,
    cpuPercent: 4.8,
    category: 'browser',
    iconType: 'chrome'
  },
  {
    id: 'proc-2',
    title: 'python.exe - Zombie Machine Learning Script (Memory Leak)',
    procName: 'python.exe',
    pid: 8940,
    ramBytes: 612 * 1024 * 1024,
    cpuPercent: 28.5,
    isHung: true,
    category: 'tool',
    iconType: 'terminal'
  },
  {
    id: 'proc-3',
    title: 'dwm.exe (Desktop Window Manager / Aero Compositor)',
    procName: 'dwm.exe',
    pid: 840,
    ramBytes: 46 * 1024 * 1024,
    cpuPercent: 1.5,
    category: 'system',
    iconType: 'system'
  },
  {
    id: 'proc-4',
    title: 'explorer.exe (Shell, Desktop & Taskbar)',
    procName: 'explorer.exe',
    pid: 1480,
    ramBytes: 42 * 1024 * 1024,
    cpuPercent: 0.2,
    category: 'system',
    iconType: 'folder'
  },
  {
    id: 'proc-5',
    title: 'sublime_text.exe (Text Editor)',
    procName: 'sublime_text.exe',
    pid: 5120,
    ramBytes: 38 * 1024 * 1024,
    cpuPercent: 0.1,
    category: 'editor',
    iconType: 'code'
  },
  {
    id: 'proc-6',
    title: 'mpc-hc64.exe (Hardware Video Decoder DXVA2)',
    procName: 'mpc-hc64.exe',
    pid: 6240,
    ramBytes: 68 * 1024 * 1024,
    cpuPercent: 3.8,
    category: 'media',
    iconType: 'video'
  },
  {
    id: 'proc-7',
    title: 'svchost.exe - NetworkService (DnsCache, LanmanServer)',
    procName: 'svchost.exe',
    pid: 1044,
    ramBytes: 31 * 1024 * 1024,
    cpuPercent: 0.3,
    category: 'system',
    iconType: 'system'
  },
  {
    id: 'proc-8',
    title: 'ProcessHacker.exe (Kernel Driver Monitor)',
    procName: 'ProcessHacker.exe',
    pid: 7892,
    ramBytes: 24 * 1024 * 1024,
    cpuPercent: 1.1,
    category: 'tool',
    iconType: 'activity'
  },
  {
    id: 'proc-9',
    title: 'foobar2000.exe (Audio Output ASIO/WASAPI)',
    procName: 'foobar2000.exe',
    pid: 2460,
    ramBytes: 19 * 1024 * 1024,
    cpuPercent: 0.8,
    category: 'media',
    iconType: 'audio'
  },
  {
    id: 'proc-10',
    title: 'tabmaster.exe (Ultra-Light Daemon & Hook)',
    procName: 'tabmaster.exe',
    pid: 2012,
    ramBytes: 1420 * 1024, // 1.4 MB !
    cpuPercent: 0.0,
    category: 'tool',
    iconType: 'zap'
  }
];

export function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(2)} GB`;
  }
  if (mb < 1) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }
  return `${mb.toFixed(1)} MB`;
}
