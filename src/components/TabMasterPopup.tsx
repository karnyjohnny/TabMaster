import React, { useEffect, useRef } from 'react';
import { MockItem, formatBytes } from '../data/mockWindows';
import { 
  Globe, 
  Code, 
  Music, 
  Terminal, 
  Film, 
  Folder, 
  Activity, 
  Zap, 
  Cpu, 
  Search, 
  X,
  AlertTriangle
} from 'lucide-react';

interface TabMasterPopupProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'windows' | 'processes';
  onSetMode: (mode: 'windows' | 'processes') => void;
  items: MockItem[];
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSwitchToItem: (item: MockItem) => void;
  onKillProcess: (item: MockItem) => void;
  altIsHeld?: boolean;
}

export const TabMasterPopup: React.FC<TabMasterPopupProps> = ({
  isOpen,
  onClose,
  mode,
  onSetMode,
  items,
  selectedIndex,
  onSelectIndex,
  searchQuery,
  onSearchChange,
  onSwitchToItem,
  onKillProcess,
  altIsHeld = false
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input automatically when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 30);
    }
  }, [isOpen]);

  // Window-level keyup listener: Releasing ALT automatically activates selected window!
  useEffect(() => {
    if (!isOpen) return;

    const handleWindowKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt' || e.code === 'AltLeft' || e.code === 'AltRight') {
        if (items[selectedIndex]) {
          onSwitchToItem(items[selectedIndex]);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keyup', handleWindowKeyUp);
    return () => window.removeEventListener('keyup', handleWindowKeyUp);
  }, [isOpen, items, selectedIndex, onSwitchToItem, onClose]);

  // Keep selected row in view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-selected="true"]') as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  const renderIcon = (type: string, isHung?: boolean) => {
    const size = 16;
    if (isHung) {
      return <AlertTriangle size={size} className="text-amber-400 shrink-0" />;
    }
    switch (type) {
      case 'chrome':
        return <Globe size={size} className="text-blue-400 shrink-0" />;
      case 'code':
        return <Code size={size} className="text-emerald-400 shrink-0" />;
      case 'audio':
        return <Music size={size} className="text-amber-300 shrink-0" />;
      case 'terminal':
        return <Terminal size={size} className="text-neutral-300 shrink-0" />;
      case 'video':
        return <Film size={size} className="text-rose-400 shrink-0" />;
      case 'folder':
        return <Folder size={size} className="text-amber-400 shrink-0" />;
      case 'activity':
        return <Activity size={size} className="text-cyan-400 shrink-0" />;
      case 'zap':
        return <Zap size={size} className="text-sky-400 shrink-0" />;
      default:
        return <Cpu size={size} className="text-neutral-400 shrink-0" />;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (selectedIndex < items.length - 1) {
        onSelectIndex(selectedIndex + 1);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (selectedIndex > 0) {
        onSelectIndex(selectedIndex - 1);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        onSelectIndex(selectedIndex > 0 ? selectedIndex - 1 : items.length - 1);
      } else {
        onSelectIndex(selectedIndex < items.length - 1 ? selectedIndex + 1 : 0);
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onSetMode('windows');
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      onSetMode('processes');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (items[selectedIndex]) {
        onSwitchToItem(items[selectedIndex]);
      }
    } else if (e.key === 'Delete') {
      e.preventDefault();
      if (items[selectedIndex]) {
        onKillProcess(items[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs select-none p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={handleKeyDown}
    >
      {/* TabMaster HUD Window Container */}
      <div 
        className="w-full max-w-[680px] h-[480px] bg-[#141414] text-[#F5F5F5] border border-[#373737] rounded-none shadow-2xl flex flex-col overflow-hidden font-sans relative"
        style={{
          boxShadow: '0 20px 50px rgba(0,0,0,0.85), 0 0 1px 1px rgba(255,255,255,0.06)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Bar: Search Input */}
        <div className="pt-3 px-3 pb-2 bg-[#141414]">
          <div className="relative flex items-center bg-[#1C1C1C] border border-[#373737] px-3 py-2">
            <Search size={15} className="text-[#888888] shrink-0 mr-2" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={
                mode === 'windows' 
                  ? "Type to filter windows instantly (e.g. chrome, code, explorer)..." 
                  : "Type to search running processes..."
              }
              className="w-full bg-transparent text-sm text-[#F5F5F5] placeholder-[#666666] outline-hidden font-sans"
              spellCheck={false}
            />
            {searchQuery && (
              <button 
                onClick={() => onSearchChange('')}
                className="text-[#888888] hover:text-white transition-colors"
                title="Wyczyść wyszukiwanie"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Dual Mode Switcher Tabs */}
        <div className="px-3 pb-2 flex items-center justify-between border-b border-[#282828] bg-[#141414]">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => onSetMode('windows')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${
                mode === 'windows'
                  ? 'bg-[#0f3c6e] text-white border-b-2 border-[#0078D7]'
                  : 'bg-[#1C1C1C] text-[#969696] hover:text-[#d0d0d0] hover:bg-[#252525]'
              }`}
            >
              <span>🗔</span>
              <span>Windows</span>
              <span className="text-[10px] text-[#80a0c0] font-mono">(← / Alt+1)</span>
            </button>

            <button
              onClick={() => onSetMode('processes')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${
                mode === 'processes'
                  ? 'bg-[#0f3c6e] text-white border-b-2 border-[#0078D7]'
                  : 'bg-[#1C1C1C] text-[#969696] hover:text-[#d0d0d0] hover:bg-[#252525]'
              }`}
            >
              <span>⚡</span>
              <span>Processes (RAM Hogs)</span>
              <span className="text-[10px] text-[#80a0c0] font-mono">(→ / Alt+2)</span>
            </button>
          </div>

          <div className="text-[11px] text-[#888888] font-mono tabular-nums">
            {items.length} {mode === 'windows' ? 'windows' : 'processes'}
          </div>
        </div>

        {/* Middle: Vertical Items List */}
        <div 
          ref={listRef}
          className="flex-1 overflow-y-auto divide-y divide-[#1F1F1F] bg-[#141414] focus:outline-hidden"
          tabIndex={0}
        >
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#777777]">
              <Search size={28} className="mb-2 text-[#555555]" />
              <p className="text-sm">Brak pasujących elementów dla zapytania "{searchQuery}"</p>
              <button 
                onClick={() => onSearchChange('')}
                className="mt-2 text-xs text-[#0078D7] hover:underline"
              >
                Wyczyść filtr
              </button>
            </div>
          ) : (
            items.map((item, index) => {
              const isSelected = index === selectedIndex;
              const isHighRam = item.ramBytes > 300 * 1024 * 1024;
              const isMediumRam = item.ramBytes > 100 * 1024 * 1024 && !isHighRam;

              return (
                <div
                  key={item.id}
                  data-selected={isSelected}
                  onClick={() => {
                    onSelectIndex(index);
                    onSwitchToItem(item);
                  }}
                  onMouseEnter={() => onSelectIndex(index)}
                  onMouseDown={(e) => {
                    // Middle Mouse Button (button 1) instant kill!
                    if (e.button === 1) {
                      e.preventDefault();
                      onKillProcess(item);
                    }
                  }}
                  className={`relative flex items-center justify-between px-3 py-2 cursor-pointer transition-colors text-xs ${
                    isSelected 
                      ? 'bg-[#0f3c6e] text-white' 
                      : index % 2 === 1 
                        ? 'bg-[#181818] hover:bg-[#222222]' 
                        : 'bg-[#141414] hover:bg-[#202020]'
                  }`}
                >
                  {/* Left Active Accent Bar */}
                  {isSelected && (
                    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#0078D7]" />
                  )}

                  {/* Left: Icon & Title */}
                  <div className="flex items-center min-w-0 flex-1 mr-3 space-x-2.5">
                    <div className="w-4 h-4 flex items-center justify-center shrink-0">
                      {renderIcon(item.iconType, item.isHung)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-1.5">
                        <span className={`truncate ${isSelected ? 'font-semibold text-white' : 'text-[#EEEEEE]'}`}>
                          {item.title}
                        </span>
                        {item.isHung && (
                          <span className="text-[10px] text-amber-300 font-mono shrink-0">
                            [HUNG]
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Center-Right: Process Name */}
                  <div className="w-28 text-right shrink-0 pr-3 truncate text-[#969696] font-mono text-[11px]">
                    {item.procName}
                  </div>

                  {/* Right: RAM & CPU Metrics */}
                  <div className="flex items-center space-x-3 shrink-0 text-right">
                    <span 
                      className={`font-mono tabular-nums text-[11px] min-w-[55px] ${
                        isHighRam 
                          ? 'text-rose-400 font-bold' 
                          : isMediumRam 
                            ? 'text-amber-400' 
                            : isSelected ? 'text-emerald-300' : 'text-emerald-400/90'
                      }`}
                    >
                      {formatBytes(item.ramBytes)}
                    </span>

                    {/* Quick kill button for touchscreen/mouse convenience */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onKillProcess(item);
                      }}
                      title="TerminateProcess (Del / Middle-Click)"
                      className="px-1.5 py-0.5 text-[10px] bg-red-950/40 text-red-400 hover:bg-red-900/80 hover:text-white border border-red-800/40 transition-colors"
                    >
                      KILL
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer: Shortcut Cheat Sheet */}
        <div className="h-8 px-3 bg-[#1C1C1C] border-t border-[#2D2D2D] flex items-center justify-between text-[11px] text-[#888888] font-mono">
          <div className="flex items-center space-x-2">
            <span className={altIsHeld ? "text-[#0078D7] font-bold animate-pulse" : "text-[#70b4f8] font-medium"}>
              {altIsHeld ? "⚡ Puść Alt: przełącz!" : "Puść Alt / Enter: przełącz"}
            </span>
            <span>·</span>
            <span>Tab / ↑↓ navigate</span>
            <span>·</span>
            <span>←→ tabs</span>
            <span>·</span>
            <span className="text-rose-400">Del/MMB kill</span>
            <span>·</span>
            <span>Esc close</span>
          </div>

          <div className="hidden sm:flex items-center space-x-2 text-[10px] text-[#666666]">
            {altIsHeld && (
              <span className="px-1.5 py-0.2 bg-blue-950/80 text-blue-300 border border-blue-700/60 font-semibold">
                ALT WCIŚNIĘTY
              </span>
            )}
            <span>GDI Double-Buffered</span>
            <span>·</span>
            <span className="text-emerald-500 font-semibold">0.08ms blit</span>
          </div>
        </div>
      </div>
    </div>
  );
};
