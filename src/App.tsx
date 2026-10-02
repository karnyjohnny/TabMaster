/**
 * TabMaster - Ultra-Lightweight Alt+Tab & Process Manager for Windows 7 in Pure C
 * License: MIT
 */

import React, { useState } from 'react';
import { DesktopSimulator } from './components/DesktopSimulator';
import { SourceViewer } from './components/SourceViewer';
import { ArchitectureGuide } from './components/ArchitectureGuide';
import { CompilerGuide } from './components/CompilerGuide';
import { IconGallery } from './components/IconGallery';
import { 
  Zap, 
  Monitor, 
  FileCode, 
  Cpu, 
  Terminal, 
  Image as ImageIcon, 
  Archive, 
  Github,
  Check
} from 'lucide-react';
import JSZip from 'jszip';
import { C_SOURCE_FILES } from './data/sourceFiles';

type ActiveTab = 'simulator' | 'source' | 'architecture' | 'compiler' | 'icons';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('simulator');
  const [isZipping, setIsZipping] = useState(false);

  const handleDownloadAllZip = async () => {
    try {
      setIsZipping(true);
      const zip = new JSZip();
      const folder = zip.folder('TabMaster_Win7_Source');

      for (const file of C_SOURCE_FILES) {
        folder?.file(file.filename, file.content);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tabmaster-c-winapi-project.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#E0E0E0] flex flex-col font-sans selection:bg-[#0078D7] selection:text-white">
      {/* 3-Zone Top Bar Contract */}
      <header className="h-14 border-b border-[#262626] bg-[#141414] px-4 md:px-8 flex items-center justify-between sticky top-0 z-40">
        {/* Zone 1: Wordmark */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-none bg-[#0078D7] flex items-center justify-center text-white shadow-xs">
            <Zap size={18} />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
              TabMaster
              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#202020] text-[#60cdff] border border-[#333333]">
                Pure C · Win7
              </span>
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center space-x-1 text-xs">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-3 py-1.5 transition-colors flex items-center gap-1.5 ${
              activeTab === 'simulator'
                ? 'bg-[#222222] text-white border-b-2 border-[#0078D7] font-medium'
                : 'text-neutral-400 hover:text-white hover:bg-[#1A1A1A]'
            }`}
          >
            <Monitor size={14} className={activeTab === 'simulator' ? 'text-[#0078D7]' : 'text-neutral-500'} />
            <span>Symulator Alt+Tab</span>
          </button>

          <button
            onClick={() => setActiveTab('source')}
            className={`px-3 py-1.5 transition-colors flex items-center gap-1.5 ${
              activeTab === 'source'
                ? 'bg-[#222222] text-white border-b-2 border-[#0078D7] font-medium'
                : 'text-neutral-400 hover:text-white hover:bg-[#1A1A1A]'
            }`}
          >
            <FileCode size={14} className={activeTab === 'source' ? 'text-[#0078D7]' : 'text-neutral-500'} />
            <span>Kod Źródłowy C</span>
          </button>

          <button
            onClick={() => setActiveTab('architecture')}
            className={`px-3 py-1.5 transition-colors flex items-center gap-1.5 ${
              activeTab === 'architecture'
                ? 'bg-[#222222] text-white border-b-2 border-[#0078D7] font-medium'
                : 'text-neutral-400 hover:text-white hover:bg-[#1A1A1A]'
            }`}
          >
            <Cpu size={14} className={activeTab === 'architecture' ? 'text-[#0078D7]' : 'text-neutral-500'} />
            <span>Architektura SLA</span>
          </button>

          <button
            onClick={() => setActiveTab('compiler')}
            className={`px-3 py-1.5 transition-colors flex items-center gap-1.5 ${
              activeTab === 'compiler'
                ? 'bg-[#222222] text-white border-b-2 border-[#0078D7] font-medium'
                : 'text-neutral-400 hover:text-white hover:bg-[#1A1A1A]'
            }`}
          >
            <Terminal size={14} className={activeTab === 'compiler' ? 'text-[#0078D7]' : 'text-neutral-500'} />
            <span>Kompilacja (w64devkit)</span>
          </button>

          <button
            onClick={() => setActiveTab('icons')}
            className={`px-3 py-1.5 transition-colors flex items-center gap-1.5 ${
              activeTab === 'icons'
                ? 'bg-[#222222] text-white border-b-2 border-[#0078D7] font-medium'
                : 'text-neutral-400 hover:text-white hover:bg-[#1A1A1A]'
            }`}
          >
            <ImageIcon size={14} className={activeTab === 'icons' ? 'text-[#0078D7]' : 'text-neutral-500'} />
            <span>Ikony & Tray</span>
          </button>
        </nav>

        {/* Zone 3: Primary Actions */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleDownloadAllZip}
            disabled={isZipping}
            className="px-3.5 py-1.5 bg-[#0078D7] hover:bg-[#0063b1] text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-xs"
            title="Pobierz kompletne źródła C z Makefile i ikonami jako plik ZIP"
          >
            <Archive size={14} />
            <span>{isZipping ? 'Pakowanie...' : 'Pobierz .ZIP Projektu'}</span>
          </button>
        </div>
      </header>

      {/* Mobile Nav Bar */}
      <div className="md:hidden flex items-center space-x-1 px-4 py-2 bg-[#181818] border-b border-[#262626] overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('simulator')}
          className={`px-2.5 py-1 shrink-0 ${activeTab === 'simulator' ? 'bg-[#0078D7] text-white' : 'text-neutral-400'}`}
        >
          Symulator
        </button>
        <button
          onClick={() => setActiveTab('source')}
          className={`px-2.5 py-1 shrink-0 ${activeTab === 'source' ? 'bg-[#0078D7] text-white' : 'text-neutral-400'}`}
        >
          Kod C
        </button>
        <button
          onClick={() => setActiveTab('architecture')}
          className={`px-2.5 py-1 shrink-0 ${activeTab === 'architecture' ? 'bg-[#0078D7] text-white' : 'text-neutral-400'}`}
        >
          Architektura
        </button>
        <button
          onClick={() => setActiveTab('compiler')}
          className={`px-2.5 py-1 shrink-0 ${activeTab === 'compiler' ? 'bg-[#0078D7] text-white' : 'text-neutral-400'}`}
        >
          Kompilator
        </button>
        <button
          onClick={() => setActiveTab('icons')}
          className={`px-2.5 py-1 shrink-0 ${activeTab === 'icons' ? 'bg-[#0078D7] text-white' : 'text-neutral-400'}`}
        >
          Ikony
        </button>
      </div>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 space-y-6">
        {/* Quick Context Sub-Banner */}
        <div className="bg-[#141414] border border-[#262626] p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
          <div>
            <h1 className="text-sm font-semibold text-white">
              TabMaster: Zamiennik Alt+Tab i Pogromca Pamięciożernych Procesów dla Windows 7
            </h1>
            <p className="text-neutral-400 mt-0.5 font-sans">
              Ultra-niskopoziomowy kod w czystym C (WinAPI) z podwójnym buforowaniem GDI, czasem reakcji &lt; 0.1 ms oraz zabijaniem procesów pod klawiszem Delete / MMB.
            </p>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <span className="px-2 py-0.5 bg-neutral-900 border border-neutral-700 text-neutral-300 font-mono text-[11px]">
              Intel Core 2 Duo / GMA 4500MHD
            </span>
            <span className="px-2 py-0.5 bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 font-mono text-[11px]">
              RAM: 1.4 MB
            </span>
            <span className="px-2 py-0.5 bg-blue-950/60 border border-blue-800/40 text-blue-300 font-mono text-[11px]">
              Licencja MIT
            </span>
          </div>
        </div>

        {/* Active Tab View */}
        {activeTab === 'simulator' && <DesktopSimulator />}
        {activeTab === 'source' && <SourceViewer />}
        {activeTab === 'architecture' && <ArchitectureGuide />}
        {activeTab === 'compiler' && <CompilerGuide />}
        {activeTab === 'icons' && <IconGallery />}
      </main>

      {/* Footer */}
      <footer className="h-12 border-t border-[#222222] bg-[#111111] px-4 md:px-8 flex items-center justify-between text-xs text-neutral-500 font-sans">
        <div>
          <span>TabMaster © 2026 · Open Source WinAPI Engineering · Licencja MIT</span>
        </div>
        <div className="flex items-center space-x-3 text-[11px]">
          <span>GCC (w64devkit / MSYS2)</span>
          <span>·</span>
          <span>Target: Windows 7 SP1+ (x64 / x86)</span>
        </div>
      </footer>
    </div>
  );
}
