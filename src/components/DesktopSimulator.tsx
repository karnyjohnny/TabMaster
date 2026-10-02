import React, { useState, useEffect } from 'react';
import { MockItem, INITIAL_WINDOWS, INITIAL_PROCESSES, formatBytes } from '../data/mockWindows';
import { TabMasterPopup } from './TabMasterPopup';
import { 
  Monitor, 
  Terminal, 
  Play, 
  Trash2, 
  RefreshCw, 
  Zap, 
  ShieldCheck, 
  Cpu, 
  HardDrive,
  Info,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const DesktopSimulator: React.FC = () => {
  const [windows, setWindows] = useState<MockItem[]>(INITIAL_WINDOWS);
  const [processes, setProcesses] = useState<MockItem[]>(INITIAL_PROCESSES);
  const [mode, setMode] = useState<'windows' | 'processes'>('windows');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeWindow, setActiveWindow] = useState<MockItem>(INITIAL_WINDOWS[0]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showTrayMenu, setShowTrayMenu] = useState(false);
  const [currentTime, setCurrentTime] = useState('16:45');

  // Clock in system tray
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Global keydown listener for real Alt+Tab
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Catch Alt+Tab or ` key as quick shortcut
      if ((e.altKey && e.code === 'Tab') || (e.code === 'Backquote' && !isOpen)) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        if (!isOpen) {
          setSearchQuery('');
          setSelectedIndex(1);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // Filter items
  const currentList = mode === 'windows' ? windows : processes;
  const filteredItems = currentList.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return item.title.toLowerCase().includes(q) || item.procName.toLowerCase().includes(q);
  });

  // Switch to selected window
  const handleSwitchToItem = (item: MockItem) => {
    setActiveWindow(item);
    setIsOpen(false);
    showToast(`Aktywowano okno: "${item.title}" (PID ${item.pid}) poprzez SetForegroundWindow`);
  };

  // Terminate process (Kill switch)
  const handleKillProcess = (item: MockItem) => {
    setWindows((prev) => prev.filter((w) => w.pid !== item.pid));
    setProcesses((prev) => prev.filter((p) => p.pid !== item.pid));
    showToast(`⚡ TerminateProcess: Zabito ${item.procName} (PID ${item.pid}) · Zwolniono ${formatBytes(item.ramBytes)} RAM!`);
  };

  // Spawn a rogue memory hog
  const handleSpawnMemoryHog = () => {
    const newPid = Math.floor(8000 + Math.random() * 1999);
    const rogueItem: MockItem = {
      id: `proc-hog-${Date.now()}`,
      title: `python.exe - Out-of-Memory Leaker (PID ${newPid})`,
      procName: 'python.exe',
      pid: newPid,
      ramBytes: Math.floor((850 + Math.random() * 200) * 1024 * 1024),
      cpuPercent: 34.2,
      isHung: true,
      category: 'tool',
      iconType: 'terminal'
    };

    setProcesses((prev) => [rogueItem, ...prev]);
    showToast(`⚠️ Uruchomiono potwora pamięciowego: python.exe (PID ${newPid}) zużywającego ${formatBytes(rogueItem.ramBytes)} RAM!`);
  };

  const handleReset = () => {
    setWindows(INITIAL_WINDOWS);
    setProcesses(INITIAL_PROCESSES);
    setActiveWindow(INITIAL_WINDOWS[0]);
    showToast('Zresetowano listę okien i procesów do stanu początkowego');
  };

  const totalRamUsed = processes.reduce((acc, p) => acc + p.ramBytes, 0);

  return (
    <div className="flex flex-col space-y-4">
      {/* Simulation Control Bar */}
      <div className="bg-[#181818] border border-[#2D2D2D] p-3 rounded-none flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-neutral-200 flex items-center gap-1.5">
            <Monitor size={15} className="text-[#0078D7]" />
            Symulator Środowiska Windows 7 x64
          </span>
          <span className="text-[#888888]">|</span>
          <span className="text-neutral-400">Target: Intel Core 2 Duo + GMA 4500MHD</span>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={() => {
              setIsOpen(true);
              setSearchQuery('');
              setSelectedIndex(1);
            }}
            className="px-3 py-1.5 bg-[#0078D7] hover:bg-[#0063b1] text-white font-medium flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Play size={13} />
            <span>Wywołaj Alt+Tab (Hook)</span>
          </button>

          <button
            onClick={handleSpawnMemoryHog}
            className="px-3 py-1.5 bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-800/50 flex items-center gap-1.5 transition-colors"
          >
            <AlertCircle size={13} />
            <span>Zasymuluj Wyciek RAM (Python)</span>
          </button>

          <button
            onClick={handleReset}
            className="px-3 py-1.5 bg-[#252525] hover:bg-[#303030] text-neutral-300 border border-[#3A3A3A] flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw size={13} />
            <span>Reset Stanu</span>
          </button>
        </div>
      </div>

      {/* Main Desktop Container (Simulating 1366x768 / 1920x1080 Windows 7 Desktop) */}
      <div 
        className="relative w-full h-[540px] bg-gradient-to-br from-[#0c1829] via-[#09111c] to-[#04080e] border border-[#2B2B2B] overflow-hidden flex flex-col justify-between"
        style={{
          backgroundImage: `
            radial-gradient(ellipse at 50% 20%, rgba(0, 120, 215, 0.15), transparent 70%),
            linear-gradient(to bottom, rgba(12, 24, 41, 0.95), rgba(4, 8, 14, 0.98))
          `
        }}
      >
        {/* Subtle Windows 7 Desktop Watermark / Grid */}
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]" />

        {/* Desktop Icons Area */}
        <div className="relative p-5 grid grid-cols-1 gap-4 w-28 text-center text-white text-[11px]">
          <div className="group flex flex-col items-center p-2 rounded-xs hover:bg-white/10 cursor-pointer transition-colors">
            <div className="w-10 h-10 bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300 shadow-sm mb-1">
              <Monitor size={22} />
            </div>
            <span className="drop-shadow-md">Computer</span>
          </div>

          <div className="group flex flex-col items-center p-2 rounded-xs hover:bg-white/10 cursor-pointer transition-colors">
            <div className="w-10 h-10 bg-amber-600/30 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-sm mb-1">
              <Trash2 size={22} />
            </div>
            <span className="drop-shadow-md">Recycle Bin</span>
          </div>

          <div 
            onClick={() => {
              setIsOpen(true);
              setSearchQuery('');
            }}
            className="group flex flex-col items-center p-2 rounded-xs hover:bg-white/10 cursor-pointer transition-colors"
          >
            <div className="w-10 h-10 bg-[#0078D7]/40 border border-[#0078D7] flex items-center justify-center text-white shadow-sm mb-1">
              <Zap size={22} className="text-[#60cdff]" />
            </div>
            <span className="drop-shadow-md font-medium text-[#60cdff]">TabMaster.exe</span>
          </div>
        </div>

        {/* Active Application Window Simulation */}
        <div className="absolute top-12 left-36 right-12 bottom-16 bg-[#1A1A1A] border border-[#333333] shadow-2xl flex flex-col overflow-hidden text-neutral-200">
          {/* Window Title Bar */}
          <div className="h-8 bg-gradient-to-r from-[#202020] to-[#181818] border-b border-[#303030] px-3 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 truncate">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500/80" />
              <span className="font-medium truncate text-neutral-100">{activeWindow.title}</span>
              <span className="text-[10px] text-neutral-400 font-mono">[{activeWindow.procName} · PID {activeWindow.pid}]</span>
            </div>

            <div className="flex items-center space-x-2 text-[10px]">
              <span className="text-neutral-400 font-mono">RAM: {formatBytes(activeWindow.ramBytes)}</span>
              <div className="flex space-x-1 pl-2">
                <div className="w-3 h-3 bg-neutral-700 hover:bg-neutral-600 cursor-pointer flex items-center justify-center text-[9px]">_</div>
                <div className="w-3 h-3 bg-neutral-700 hover:bg-neutral-600 cursor-pointer flex items-center justify-center text-[9px]">□</div>
                <div className="w-3 h-3 bg-red-700 hover:bg-red-600 cursor-pointer flex items-center justify-center text-[9px]">✕</div>
              </div>
            </div>
          </div>

          {/* Window Content */}
          <div className="flex-1 p-5 bg-[#141414] font-mono text-xs text-neutral-300 overflow-y-auto space-y-3">
            <div className="p-3 bg-[#1B1B1B] border border-[#2D2D2D] text-neutral-400 space-y-1">
              <div className="text-emerald-400 font-semibold flex items-center gap-1.5">
                <CheckCircle2 size={14} />
                <span>Aktywne okno na pulpicie Windows 7</span>
              </div>
              <p className="text-[11px] text-neutral-400 font-sans">
                Gdy wciśniesz <strong className="text-white">Alt+Tab</strong> lub klikniesz przycisk powyżej, TabMaster natychmiastowo wyrenderuje ciemny HUD bez opóźnienia i przełączy aktywne okno za pomocą natywnego WinAPI (<code className="text-[#60cdff]">SetForegroundWindow</code> + <code className="text-[#60cdff]">AttachThreadInput</code>).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-[11px]">
              <div className="p-2.5 bg-[#181818] border border-[#2A2A2A]">
                <div className="text-neutral-400">Stan procesu:</div>
                <div className="text-emerald-400 font-semibold mt-1">Uruchomiony (Responding)</div>
              </div>
              <div className="p-2.5 bg-[#181818] border border-[#2A2A2A]">
                <div className="text-neutral-400">Working Set (RAM):</div>
                <div className="text-white font-semibold mt-1 tabular-nums">{formatBytes(activeWindow.ramBytes)}</div>
              </div>
              <div className="p-2.5 bg-[#181818] border border-[#2A2A2A]">
                <div className="text-neutral-400">Zużycie CPU:</div>
                <div className="text-white font-semibold mt-1 tabular-nums">{activeWindow.cpuPercent}%</div>
              </div>
            </div>

            <div className="pt-2 text-neutral-400 text-[11px] font-sans">
              💡 <em>Wskazówka:</em> Wciśnij <kbd className="px-1.5 py-0.5 bg-[#252525] border border-[#3A3A3A] text-white font-mono text-[10px]">Delete</kbd> lub kliknij środkowym przyciskiem myszy (<strong className="text-amber-300">MMB</strong>) na dowolnym procesie w TabMaster, aby natychmiast go zabić!
            </div>
          </div>
        </div>

        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="absolute top-4 right-4 z-40 bg-[#1A1A1A] border-l-4 border-l-[#0078D7] border border-[#333333] px-4 py-2.5 text-xs text-neutral-200 shadow-xl flex items-center space-x-2 animate-fade-in font-sans">
            <Zap size={14} className="text-[#0078D7] shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* TabMaster HUD Modal Layer */}
        <TabMasterPopup
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          mode={mode}
          onSetMode={setMode}
          items={filteredItems}
          selectedIndex={selectedIndex}
          onSelectIndex={setSelectedIndex}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSwitchToItem={handleSwitchToItem}
          onKillProcess={handleKillProcess}
        />

        {/* Windows 7 Aero Taskbar (Bottom) */}
        <div className="relative h-10 bg-gradient-to-t from-[#0e1724]/95 via-[#142337]/90 to-[#1e344f]/85 border-t border-white/10 px-2 flex items-center justify-between z-30 shadow-lg backdrop-blur-md">
          {/* Start Orb & Taskbar Items */}
          <div className="flex items-center space-x-1.5 h-full">
            {/* Windows 7 Start Orb */}
            <button 
              onClick={() => showToast('Menu Start (Windows 7 Professional SP1 x64)')}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 via-sky-400 to-blue-700 flex items-center justify-center shadow-md hover:brightness-125 transition-all mr-1.5 border border-white/20"
              title="Start"
            >
              <div className="grid grid-cols-2 gap-0.5 w-3.5 h-3.5">
                <div className="bg-rose-400 rounded-xs" />
                <div className="bg-emerald-400 rounded-xs" />
                <div className="bg-sky-300 rounded-xs" />
                <div className="bg-amber-300 rounded-xs" />
              </div>
            </button>

            {/* Pinned / Active Taskbar Buttons */}
            {windows.slice(0, 5).map((win) => {
              const isActive = activeWindow.id === win.id;
              return (
                <button
                  key={win.id}
                  onClick={() => handleSwitchToItem(win)}
                  className={`h-7 px-2.5 max-w-[150px] truncate text-[11px] flex items-center space-x-1.5 transition-colors border ${
                    isActive 
                      ? 'bg-white/20 border-white/30 text-white font-medium shadow-inner' 
                      : 'bg-black/20 hover:bg-white/10 border-transparent text-neutral-300'
                  }`}
                  title={win.title}
                >
                  <span className="truncate">{win.procName.replace('.exe', '')}</span>
                </button>
              );
            })}
          </div>

          {/* System Tray (Notification Area) */}
          <div className="flex items-center space-x-3 text-xs text-neutral-300 pr-2">
            {/* TabMaster System Tray Icon */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsOpen(true);
                  setSearchQuery('');
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setShowTrayMenu((prev) => !prev);
                }}
                className="p-1 hover:bg-white/10 rounded-xs transition-colors flex items-center justify-center text-[#60cdff]"
                title="TabMaster (Alt+Tab Daemon) - Prawy przycisk otwiera menu"
              >
                <Zap size={15} />
              </button>

              {/* Tray Context Menu */}
              {showTrayMenu && (
                <div 
                  className="absolute bottom-9 right-0 w-48 bg-[#1E1E1E] border border-[#3E3E3E] shadow-2xl py-1 text-xs text-[#E0E0E0] z-50 font-sans"
                  onClick={() => setShowTrayMenu(false)}
                >
                  <button 
                    onClick={() => {
                      setIsOpen(true);
                      setMode('windows');
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#0078D7] hover:text-white transition-colors"
                  >
                    Pokaż TabMaster (Alt+Tab)
                  </button>
                  <div className="h-px bg-[#333333] my-1" />
                  <button 
                    onClick={() => {
                      setMode('windows');
                      setIsOpen(true);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#0078D7] hover:text-white transition-colors flex items-center justify-between"
                  >
                    <span>Tryb: Windows</span>
                    {mode === 'windows' && <span className="text-[#0078D7] font-bold">✓</span>}
                  </button>
                  <button 
                    onClick={() => {
                      setMode('processes');
                      setIsOpen(true);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#0078D7] hover:text-white transition-colors flex items-center justify-between"
                  >
                    <span>Tryb: Processes</span>
                    {mode === 'processes' && <span className="text-[#0078D7] font-bold">✓</span>}
                  </button>
                  <div className="h-px bg-[#333333] my-1" />
                  <button 
                    onClick={() => showToast('Odświeżono bufor procesów i okien (SetEvent)')}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#0078D7] hover:text-white transition-colors"
                  >
                    Odśwież bufor teraz
                  </button>
                  <button 
                    onClick={() => showToast('TabMaster Daemon działa w tle (PID 2012, RAM: 1.4 MB)')}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#0078D7] hover:text-white transition-colors text-[#999999]"
                  >
                    O programie TabMaster
                  </button>
                </div>
              )}
            </div>

            {/* Tray Clock */}
            <div className="text-[11px] font-mono tabular-nums text-neutral-300">
              {currentTime}
            </div>

            {/* Desktop peek bar (Windows 7 signature edge) */}
            <div 
              onClick={() => showToast('Pokaż pulpit (Win+D)')}
              className="w-2.5 h-6 bg-white/10 hover:bg-white/30 border-l border-white/20 cursor-pointer ml-1"
              title="Show Desktop"
            />
          </div>
        </div>
      </div>

      {/* SLA & Hardware Metrics Panel */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="bg-[#181818] border border-[#2D2D2D] p-3 flex items-center space-x-3">
          <div className="w-8 h-8 rounded-none bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
            <Zap size={16} />
          </div>
          <div>
            <div className="text-neutral-400 text-[11px]">Czas reakcji (Latency):</div>
            <div className="text-emerald-400 font-bold font-mono tabular-nums">&lt; 0.1 ms (BitBlt)</div>
          </div>
        </div>

        <div className="bg-[#181818] border border-[#2D2D2D] p-3 flex items-center space-x-3">
          <div className="w-8 h-8 rounded-none bg-sky-950/60 border border-sky-800/60 flex items-center justify-center text-sky-400">
            <HardDrive size={16} />
          </div>
          <div>
            <div className="text-neutral-400 text-[11px]">RAM TabMaster Daemon:</div>
            <div className="text-white font-bold font-mono tabular-nums">~1.4 MB</div>
          </div>
        </div>

        <div className="bg-[#181818] border border-[#2D2D2D] p-3 flex items-center space-x-3">
          <div className="w-8 h-8 rounded-none bg-blue-950/60 border border-blue-800/60 flex items-center justify-center text-blue-400">
            <ShieldCheck size={16} />
          </div>
          <div>
            <div className="text-neutral-400 text-[11px]">Zarządzanie pamięcią:</div>
            <div className="text-neutral-200 font-bold font-mono">0 GDI / RAM Leaks</div>
          </div>
        </div>

        <div className="bg-[#181818] border border-[#2D2D2D] p-3 flex items-center space-x-3">
          <div className="w-8 h-8 rounded-none bg-amber-950/60 border border-amber-800/60 flex items-center justify-center text-amber-400">
            <Cpu size={16} />
          </div>
          <div>
            <div className="text-neutral-400 text-[11px]">Core 2 Duo + GMA SLA:</div>
            <div className="text-emerald-400 font-bold font-mono">PASS (100% Zero-Lag)</div>
          </div>
        </div>
      </div>
    </div>
  );
};
