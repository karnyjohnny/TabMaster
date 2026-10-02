import React from 'react';
import { Download, Zap, Layers, Sparkles, Image as ImageIcon } from 'lucide-react';

export const IconGallery: React.FC = () => {
  // SVG Icon Data for TabMaster
  const svgIconCode = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#242424" />
      <stop offset="100%" stop-color="#121212" />
    </linearGradient>
    <linearGradient id="blueGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0094FF" />
      <stop offset="100%" stop-color="#0063B1" />
    </linearGradient>
  </defs>
  
  <!-- Outer Window Shadow & Dark Bezel -->
  <rect x="2" y="2" width="44" height="44" rx="3" fill="url(#bgGrad)" stroke="#3E3E3E" stroke-width="1.5" />
  
  <!-- Background Window Card -->
  <rect x="15" y="8" width="25" height="23" rx="2" fill="#1C1C1C" stroke="#484848" stroke-width="1" />
  <rect x="15" y="8" width="25" height="5" fill="#2A2A2A" />
  
  <!-- Foreground Active Window Card (Blue Accent) -->
  <rect x="8" y="17" width="25" height="23" rx="2" fill="#162232" stroke="#0078D7" stroke-width="1.5" />
  <rect x="8" y="17" width="25" height="5" fill="url(#blueGrad)" />
  
  <!-- Fast Switcher Lightning Indicator -->
  <path d="M21 24L17 31H21L20 37L25 29H20.5L22 24Z" fill="#60CDFF" />
</svg>`;

  const handleDownloadSvg = () => {
    const blob = new Blob([svgIconCode], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tabmaster_icon.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadIco = () => {
    // Triggers download from public/tabmaster.ico
    const a = document.createElement('a');
    a.href = '/tabmaster.ico';
    a.download = 'tabmaster.ico';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6 text-xs text-neutral-300">
      {/* Intro Header */}
      <div className="bg-[#181818] border border-[#2D2D2D] p-5 space-y-3">
        <div className="flex items-center space-x-2 text-sm font-semibold text-white">
          <ImageIcon className="text-[#0078D7]" size={18} />
          <span>Grafika: Ikony Programu oraz Zasobnika Systemowego (Tray Icon)</span>
        </div>
        <p className="text-neutral-400 leading-relaxed font-sans text-xs">
          W systemie Windows 7 czytelność w rozmiarach <strong>16x16</strong> pikseli (pasek zadań / zasobnik systemowy) oraz <strong>32x32 / 48x48</strong> (menu i menedżer plików) wymaga precyzyjnej separacji pikseli i wysokiego kontrastu. Poniżej przedstawiono zintegrowany zestaw ikon w formacie wielowarstwowym <code className="text-white">tabmaster.ico</code> oraz wektorowym <code className="text-white">SVG</code>.
        </p>
      </div>

      {/* Hero Showcase Images */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* App Emblem */}
        <div className="bg-[#161616] border border-[#2A2A2A] p-4 flex flex-col items-center justify-between text-center space-y-3">
          <div className="w-full flex items-center justify-between text-xs text-neutral-400">
            <span className="font-semibold text-white">Ikona Aplikacji (TabMaster Emblem)</span>
            <span className="font-mono text-[10px] text-blue-400">Master Asset</span>
          </div>

          <div className="w-48 h-48 rounded-md overflow-hidden border border-[#333333] shadow-xl bg-[#0D0D0D] flex items-center justify-center p-2 relative group">
            <img 
              src="/src/assets/images/tabmaster_app_icon_1790959640356.jpg" 
              alt="TabMaster Application Icon" 
              className="w-full h-full object-cover rounded-xs"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <button
              onClick={handleDownloadSvg}
              className="px-3 py-1.5 bg-[#252525] hover:bg-[#303030] text-neutral-200 border border-[#3A3A3A] flex items-center gap-1.5 transition-colors font-sans"
            >
              <Download size={13} />
              <span>Pobierz Wektor SVG</span>
            </button>
            <button
              onClick={handleDownloadIco}
              className="px-3 py-1.5 bg-[#0078D7] hover:bg-[#0063b1] text-white flex items-center gap-1.5 transition-colors font-sans font-medium"
            >
              <Download size={13} />
              <span>Pobierz tabmaster.ico</span>
            </button>
          </div>
        </div>

        {/* Visual Banner Preview */}
        <div className="bg-[#161616] border border-[#2A2A2A] p-4 flex flex-col items-center justify-between text-center space-y-3">
          <div className="w-full flex items-center justify-between text-xs text-neutral-400">
            <span className="font-semibold text-white">Banner GitHub README & Showcase</span>
            <span className="font-mono text-[10px] text-emerald-400">16:9 Display</span>
          </div>

          <div className="w-full h-48 rounded-md overflow-hidden border border-[#333333] shadow-xl bg-[#0D0D0D] flex items-center justify-center relative">
            <img 
              src="/src/assets/images/tabmaster_readme_banner_1790959655847.jpg" 
              alt="TabMaster README Banner" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="text-neutral-400 text-[11px] font-sans">
            Minimalistyczny Dark Mode HUD na pulpicie Windows 7 z niebieskim akcentem zaznaczenia.
          </div>
        </div>
      </div>

      {/* Multi-Resolution Raster Breakdown for Win32 ICO */}
      <div className="bg-[#161616] border border-[#2A2A2A] p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#2C2C2C] pb-2">
          <span className="font-semibold text-white flex items-center gap-2">
            <Layers size={15} className="text-[#0078D7]" />
            Struktura Warstw Win32 tabmaster.ico (DPI & Shell Scaling)
          </span>
          <span className="text-neutral-400 font-mono text-[10px]">16x16 · 32x32 · 48x48 RGBA</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {/* 16x16 Tray Icon */}
          <div className="bg-[#121212] border border-[#222222] p-4 flex flex-col items-center justify-center space-y-3 text-center">
            <div className="text-[11px] text-neutral-400 font-medium">16×16 Tray & Alt+Tab List</div>
            <div className="w-12 h-12 bg-[#1C1C1C] border border-[#333333] flex items-center justify-center">
              {/* Authentic 16x16 Render */}
              <div className="w-4 h-4 bg-[#141414] border border-[#0078D7] flex items-center justify-center shadow-xs">
                <div className="w-1.5 h-1.5 bg-[#60cdff]" />
              </div>
            </div>
            <div className="text-[10px] text-neutral-500 font-mono">
              Obsługuje zasobnik systemowy (NIF_ICON w Shell_NotifyIconW)
            </div>
          </div>

          {/* 32x32 Taskbar / Alt+Tab Large */}
          <div className="bg-[#121212] border border-[#222222] p-4 flex flex-col items-center justify-center space-y-3 text-center">
            <div className="text-[11px] text-neutral-400 font-medium">32×32 Taskbar & Aero Header</div>
            <div className="w-16 h-16 bg-[#1C1C1C] border border-[#333333] flex items-center justify-center">
              <div className="w-8 h-8 bg-[#141414] border border-[#0078D7] relative p-1 shadow-sm">
                <div className="w-full h-2 bg-[#0078D7] mb-1" />
                <div className="w-3 h-2 bg-[#60cdff]" />
              </div>
            </div>
            <div className="text-[10px] text-neutral-500 font-mono">
              W standardowym DPI (96 DPI) na pasku zadań
            </div>
          </div>

          {/* 48x48 Explorer Tiles / High DPI */}
          <div className="bg-[#121212] border border-[#222222] p-4 flex flex-col items-center justify-center space-y-3 text-center">
            <div className="text-[11px] text-neutral-400 font-medium">48×48 Explorer & Large Tiles</div>
            <div className="w-20 h-20 bg-[#1C1C1C] border border-[#333333] flex items-center justify-center">
              <div className="w-12 h-12 bg-[#141414] border-2 border-[#0078D7] relative p-1.5 shadow-md">
                <div className="w-full h-3 bg-[#0078D7] mb-1.5" />
                <div className="w-4 h-3 bg-[#60cdff]" />
              </div>
            </div>
            <div className="text-[10px] text-neutral-500 font-mono">
              Wysokie DPI (120/144 DPI) oraz ikony pulpitu
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
