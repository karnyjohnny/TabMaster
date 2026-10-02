import React, { useState } from 'react';
import { Terminal, Copy, Check, Cpu, CheckCircle2, Download, Shield } from 'lucide-react';

export const CompilerGuide: React.FC = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const CMD_W64DEVKIT_64 = `windres -O coff resource.rc -o resource.o

gcc -Os -s -Wall -Wextra -std=c99 -mwindows \\
    -fno-ident -fno-asynchronous-unwind-tables \\
    -ffunction-sections -fdata-sections \\
    -o tabmaster_x64.exe main.c resource.o \\
    -Wl,--gc-sections -Wl,--subsystem,windows \\
    -luser32 -lgdi32 -lpsapi -ldwmapi -lkernel32 -lshell32 -ladvapi32`;

  const CMD_MSYS2_32 = `i686-w64-mingw32-windres -F pe-i386 -O coff resource.rc -o resource32.o

i686-w64-mingw32-gcc -Os -s -Wall -Wextra -std=c99 -mwindows \\
    -fno-ident -fno-asynchronous-unwind-tables \\
    -ffunction-sections -fdata-sections \\
    -o tabmaster_x86.exe main.c resource32.o \\
    -Wl,--gc-sections -Wl,--subsystem,windows \\
    -luser32 -lgdi32 -lpsapi -ldwmapi -lkernel32 -lshell32 -ladvapi32`;

  const CMD_MAKEFILE_ALL = `# Kompilacja 64-bit:
make

# Kompilacja 32-bit:
make x86

# Czyszczenie:
make clean`;

  return (
    <div className="space-y-6 text-xs text-neutral-300">
      {/* Intro */}
      <div className="bg-[#181818] border border-[#2D2D2D] p-5 space-y-3">
        <div className="flex items-center space-x-2 text-sm font-semibold text-white">
          <Terminal className="text-[#0078D7]" size={18} />
          <span>Instrukcja Kompilacji: w64devkit i MSYS2 (x64 / x86)</span>
        </div>
        <p className="text-neutral-400 leading-relaxed font-sans text-xs">
          TabMaster został zaprojektowany z myślą o <strong>zerowej zależności od MSVC i bibliotek DLL innych firm</strong>. Do kompilacji używamy wyłącznie <strong>GCC w w64devkit</strong> lub <strong>MSYS2 MinGW-w64</strong>. Wygenerowany plik <code className="text-white">.exe</code> jest w 100% samodzielnym, przenośnym (portable) plikiem binarnym o rozmiarze zaledwie <strong>~28 KB</strong> (x64) lub <strong>~24 KB</strong> (x86).
        </p>
      </div>

      {/* Target Binaries Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 64-bit Target */}
        <div className="bg-[#161616] border border-[#2A2A2A] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white flex items-center gap-2">
              <Cpu size={15} className="text-[#0078D7]" />
              Wersja 64-bitowa (x86_64)
            </span>
            <span className="px-2 py-0.5 bg-blue-950/60 text-[#60cdff] border border-blue-800/40 text-[10px] font-mono">
              tabmaster_x64.exe (~28 KB)
            </span>
          </div>
          <p className="text-neutral-400 font-sans text-[11px]">
            Dedykowana dla systemów Windows 7 x64 SP1. Pozwala na inspekcję i zamykanie 64-bitowych aplikacji bez emulacji WoW64.
          </p>

          <div className="relative">
            <pre className="p-3 bg-[#111111] border border-[#222222] font-mono text-[11px] text-sky-300 overflow-x-auto leading-relaxed">
              <code>{CMD_W64DEVKIT_64}</code>
            </pre>
            <button
              onClick={() => copyToClipboard(CMD_W64DEVKIT_64, 'cmd64')}
              className="absolute top-2 right-2 p-1.5 bg-[#202020] hover:bg-[#303030] text-neutral-300 border border-[#333333] transition-colors"
              title="Kopiuj polecenie"
            >
              {copiedId === 'cmd64' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            </button>
          </div>
        </div>

        {/* 32-bit Target */}
        <div className="bg-[#161616] border border-[#2A2A2A] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white flex items-center gap-2">
              <Cpu size={15} className="text-emerald-400" />
              Wersja 32-bitowa (i686 / x86)
            </span>
            <span className="px-2 py-0.5 bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 text-[10px] font-mono">
              tabmaster_x86.exe (~24 KB)
            </span>
          </div>
          <p className="text-neutral-400 font-sans text-[11px]">
            Zoptymalizowana pod 32-bitowe instalacje Windows 7 oraz laptopy z procesorami starszej generacji (Core Solo / wczesny Core Duo).
          </p>

          <div className="relative">
            <pre className="p-3 bg-[#111111] border border-[#222222] font-mono text-[11px] text-emerald-300 overflow-x-auto leading-relaxed">
              <code>{CMD_MSYS2_32}</code>
            </pre>
            <button
              onClick={() => copyToClipboard(CMD_MSYS2_32, 'cmd32')}
              className="absolute top-2 right-2 p-1.5 bg-[#202020] hover:bg-[#303030] text-neutral-300 border border-[#333333] transition-colors"
              title="Kopiuj polecenie"
            >
              {copiedId === 'cmd32' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            </button>
          </div>
        </div>
      </div>

      {/* Makefile Workflow */}
      <div className="bg-[#161616] border border-[#2A2A2A] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-white flex items-center gap-2">
            <Terminal size={15} className="text-indigo-400" />
            Automatyzacja Makefile (w64devkit)
          </span>
        </div>
        <p className="text-neutral-400 font-sans text-[11px]">
          W katalogu ze źródłami znajduje się gotowy plik <code className="text-white">Makefile</code>. Wystarczy wpisać w terminalu:
        </p>

        <div className="relative">
          <pre className="p-3 bg-[#111111] border border-[#222222] font-mono text-[11px] text-indigo-300 overflow-x-auto">
            <code>{CMD_MAKEFILE_ALL}</code>
          </pre>
          <button
            onClick={() => copyToClipboard(CMD_MAKEFILE_ALL, 'cmdmake')}
            className="absolute top-2 right-2 p-1.5 bg-[#202020] hover:bg-[#303030] text-neutral-300 border border-[#333333] transition-colors"
            title="Kopiuj polecenie"
          >
            {copiedId === 'cmdmake' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          </button>
        </div>
      </div>

      {/* Autostart Setup on Windows 7 */}
      <div className="bg-[#161616] border border-[#2A2A2A] p-4 space-y-3">
        <div className="flex items-center space-x-2 text-white font-semibold">
          <Shield size={16} className="text-amber-400" />
          <span>Automatyczny Start z Windows 7 (Autostart)</span>
        </div>
        <ol className="list-decimal list-inside space-y-1.5 text-neutral-400 font-sans text-[11px]">
          <li>Skompiluj plik <code className="text-white">tabmaster.exe</code> (lub pobierz binarkę).</li>
          <li>Skopiuj plik do wybranego folderu, np. <code className="text-neutral-300 font-mono">C:\Narzędzia\TabMaster\tabmaster.exe</code>.</li>
          <li>Wciśnij kombinację <kbd className="px-1.5 py-0.5 bg-[#222222] border border-[#333333] text-white font-mono">Win + R</kbd>, wpisz <code className="text-amber-300 font-mono">shell:startup</code> i naciśnij Enter.</li>
          <li>Utwórz w tym folderze skrót do <code className="text-white font-mono">tabmaster.exe</code>.</li>
          <li>Program będzie bezszelestnie czuwał w zasobniku systemowym (system tray) od razu po zalogowaniu!</li>
        </ol>
      </div>
    </div>
  );
};
