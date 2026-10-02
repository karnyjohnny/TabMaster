import React, { useState } from 'react';
import { C_SOURCE_FILES, SourceFile } from '../data/sourceFiles';
import { 
  FileCode, 
  Copy, 
  Check, 
  Download, 
  Archive, 
  ExternalLink,
  Code2,
  Terminal,
  FileText
} from 'lucide-react';
import JSZip from 'jszip';

export const SourceViewer: React.FC = () => {
  const [selectedFileName, setSelectedFileName] = useState<string>('main.c');
  const [copied, setCopied] = useState<boolean>(false);
  const [isZipping, setIsZipping] = useState<boolean>(false);

  const currentFile = C_SOURCE_FILES.find((f) => f.filename === selectedFileName) || C_SOURCE_FILES[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = (file: SourceFile) => {
    const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadZip = async () => {
    try {
      setIsZipping(true);
      const zip = new JSZip();
      const folder = zip.folder('TabMaster_Win7_Source');

      // Add all C and config files
      for (const file of C_SOURCE_FILES) {
        folder?.file(file.filename, file.content);
      }

      // Generate the ZIP blob
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tabmaster-windows7-c-src.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to create ZIP', err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      {/* Header bar with file selector and action buttons */}
      <div className="bg-[#181818] border border-[#2D2D2D] p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
          {C_SOURCE_FILES.map((file) => {
            const isSelected = file.filename === selectedFileName;
            return (
              <button
                key={file.filename}
                onClick={() => setSelectedFileName(file.filename)}
                className={`px-3 py-1.5 text-xs font-mono transition-colors flex items-center gap-1.5 shrink-0 ${
                  isSelected
                    ? 'bg-[#0078D7] text-white font-semibold'
                    : 'bg-[#222222] text-neutral-400 hover:text-white hover:bg-[#2A2A2A]'
                }`}
              >
                {file.filename.endsWith('.h') && <Code2 size={13} className="text-amber-400" />}
                {file.filename.endsWith('.c') && <FileCode size={13} className="text-sky-400" />}
                {file.filename.endsWith('.bat') && <Terminal size={13} className="text-emerald-400" />}
                {file.filename === 'Makefile' && <Terminal size={13} className="text-indigo-400" />}
                {file.filename.endsWith('.md') && <FileText size={13} className="text-neutral-300" />}
                {file.filename.endsWith('.rc') && <FileCode size={13} className="text-rose-400" />}
                {file.filename.endsWith('.manifest') && <FileCode size={13} className="text-purple-400" />}
                <span>{file.filename}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 bg-[#252525] hover:bg-[#303030] text-neutral-200 border border-[#3A3A3A] text-xs flex items-center gap-1.5 transition-colors"
          >
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            <span>{copied ? 'Skopiowano!' : 'Kopiuj plik'}</span>
          </button>

          <button
            onClick={() => handleDownloadFile(currentFile)}
            className="px-3 py-1.5 bg-[#252525] hover:bg-[#303030] text-neutral-200 border border-[#3A3A3A] text-xs flex items-center gap-1.5 transition-colors"
          >
            <Download size={13} />
            <span>Pobierz plik</span>
          </button>

          <button
            onClick={handleDownloadZip}
            disabled={isZipping}
            className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Archive size={13} />
            <span>{isZipping ? 'Pakowanie...' : 'Pobierz ZIP (.zip)'}</span>
          </button>
        </div>
      </div>

      {/* File Description Bar */}
      <div className="px-3 py-2 bg-[#1C1C1C] border border-[#2A2A2A] text-xs flex items-center justify-between">
        <div className="flex items-center space-x-2 text-neutral-300">
          <span className="font-mono text-[#0078D7] font-semibold">{currentFile.filename}</span>
          <span>—</span>
          <span className="text-neutral-400">{currentFile.description}</span>
        </div>
        <div className="text-neutral-500 font-mono text-[11px] shrink-0">
          Rozmiar: {currentFile.size}
        </div>
      </div>

      {/* Code Display Area */}
      <div className="bg-[#121212] border border-[#262626] font-mono text-xs overflow-x-auto max-h-[580px] p-4 text-neutral-300 leading-relaxed select-text">
        <pre className="tab-4">
          <code>{currentFile.content}</code>
        </pre>
      </div>
    </div>
  );
};
