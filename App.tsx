
import React, { useState, useEffect, useMemo } from 'react';
import { PromptEntry, ProcessingState, Category } from './types';
import { analyzeImage, compressImage } from './geminiService';
import { Search, Upload, Copy, Trash2, Printer, Loader2, Filter, X, Check, Edit2, Camera, Layers, Maximize2, FileJson, Sparkles, History, RotateCcw } from 'lucide-react';

const CATEGORIES: Category[] = ['人物', '风景', '产品', '家居', '动漫', '建筑', '其他'];

const App: React.FC = () => {
  const [entries, setEntries] = useState<PromptEntry[]>([]);
  const [proc, setProc] = useState<ProcessingState>({ total: 0, current: 0, isProcessing: false });
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<Category | '全部'>('全部');
  const [isDragging, setIsDragging] = useState(false);
  
  const [previewEntry, setPreviewEntry] = useState<PromptEntry | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('nano_banana_db');
    if (saved) setEntries(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('nano_banana_db', JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // Don't paste if we're focused on an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      const items = e.clipboardData?.items;
      if (!items) return;
      
      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) files.push(file);
        }
      }
      
      if (files.length > 0) {
        const dataTransfer = new DataTransfer();
        files.forEach(file => dataTransfer.items.add(file));
        processFiles(dataTransfer.files);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [entries, proc.isProcessing]); // processFiles depends on these implicitly via closure if not using refs, but here it's fine to re-bind or just use a stable processFiles if it was wrapped in useCallback. Since it's not, we re-bind.

  const processFiles = async (files: FileList) => {
    if (proc.isProcessing) return;
    const fileArray = Array.from(files).slice(0, 20);
    setProc({ total: fileArray.length, current: 0, isProcessing: true });

    for (let i = 0; i < fileArray.length; i++) {
      try {
        setProc(prev => ({ ...prev, current: i + 1 }));
        const thumb = await compressImage(fileArray[i]);
        
        const reader = new FileReader();
        const base64: string = await new Promise((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(fileArray[i]);
        });

        const result = await analyzeImage(base64);
        
        const newEntry: PromptEntry = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          thumbnail: thumb,
          ...result,
          originalPrompt: result.fullPrompt,
          createdAt: Date.now()
        };

        setEntries(prev => [newEntry, ...prev]);
      } catch (error) {
        console.error('Failed to process image:', error);
      }
    }
    setProc({ total: 0, current: 0, isProcessing: false });
  };

  const handleCopy = (text: string, label: string = '已复制到剪贴板') => {
    navigator.clipboard.writeText(text);
    alert(label);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('确定要删除这条灵感记录吗？')) {
      setEntries(prev => prev.filter(e => e.id !== id));
      if (previewEntry?.id === id) setPreviewEntry(null);
    }
  };

  const handlePromptChange = (newPrompt: string) => {
    if (!previewEntry) return;
    const updatedEntry = { ...previewEntry, fullPrompt: newPrompt };
    setPreviewEntry(updatedEntry);
    setEntries(prev => prev.map(e => e.id === updatedEntry.id ? updatedEntry : e));
  };

  const resetToOriginal = () => {
    if (previewEntry && previewEntry.originalPrompt) {
      handlePromptChange(previewEntry.originalPrompt);
    }
  };

  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      const matchesSearch = 
        e.summary.toLowerCase().includes(search.toLowerCase()) || 
        e.fullPrompt.toLowerCase().includes(search.toLowerCase()) || 
        (e.cameraInfo?.toLowerCase().includes(search.toLowerCase())) ||
        (e.materialDescription?.toLowerCase().includes(search.toLowerCase())) ||
        e.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
      const matchesCat = catFilter === '全部' || e.category === catFilter;
      return matchesSearch && matchesCat;
    });
  }, [entries, search, catFilter]);

  const handleExport = () => {
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const getCategoryColor = (cat: Category) => {
    const map: Record<Category, string> = {
      '人物': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
      '风景': 'bg-green-500/10 text-green-400 border-green-500/20',
      '产品': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      '家居': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      '动漫': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      '建筑': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      '其他': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    };
    return map[cat];
  };

  const jsonString = useMemo(() => {
    if (!previewEntry) return '';
    const { id, thumbnail, createdAt, originalPrompt, ...rest } = previewEntry;
    return JSON.stringify(rest, null, 2);
  }, [previewEntry]);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-10 space-y-8 min-h-screen font-sans antialiased">
      {/* Header */}
      <header className="print:hidden flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900/40 backdrop-blur-2xl p-6 rounded-3xl border border-white/5 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-tr from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 rotate-3 transition-transform hover:rotate-0">
            <span className="text-3xl text-white">🍌</span>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent uppercase">Nano Banana</h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Vision Prompt Workstation</p>
          </div>
        </div>

        {proc.isProcessing && (
          <div className="flex items-center gap-4 bg-black/40 px-5 py-3 rounded-2xl border border-yellow-400/20 shadow-inner">
            <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-yellow-400 uppercase tracking-widest">Processing {proc.current}/{proc.total}</span>
              <div className="w-40 h-1 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-500 shadow-[0_0_8px_rgba(250,204,21,0.5)]" 
                  style={{ width: `${(proc.current / proc.total) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Upload Zone */}
      <section 
        className={`print:hidden relative group transition-all duration-500 ease-in-out ${isDragging ? 'scale-[1.02] rotate-1' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files) processFiles(e.dataTransfer.files); }}
      >
        <label className={`flex flex-col items-center justify-center w-full h-52 border-2 border-dashed rounded-[2.5rem] cursor-pointer transition-all ${isDragging ? 'border-yellow-400 bg-yellow-400/5 shadow-[0_0_30px_rgba(250,204,21,0.1)]' : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.07]'}`}>
          <div className="flex flex-col items-center justify-center text-center px-6">
            <div className="p-4 bg-white/5 rounded-2xl mb-4 group-hover:scale-110 group-hover:bg-yellow-400/10 group-hover:text-yellow-400 transition-all duration-300">
              <Upload className="w-8 h-8 text-slate-400 transition-colors" />
            </div>
            <p className="mb-2 text-base text-slate-200 font-bold">点击上传、拖拽 或 粘贴图片</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">GEMINI 3 PRO 视觉反推 • 支持批量操作</p>
          </div>
          <input type="file" className="hidden" multiple accept="image/*" onChange={(e) => e.target.files && processFiles(e.target.files)} disabled={proc.isProcessing} />
        </label>
      </section>

      {/* Controls */}
      <section className="print:hidden space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input 
              type="text" 
              placeholder="搜索关键词、材质、技术参数..." 
              className="w-full pl-12 pr-6 py-4 bg-slate-900/50 border border-white/5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-yellow-400/30 text-sm text-slate-100 placeholder:text-slate-600 transition-all shadow-inner"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <button 
            onClick={handleExport}
            className="flex items-center justify-center gap-2 px-8 py-4 bg-white/5 hover:bg-yellow-400 hover:text-slate-950 border border-white/10 rounded-2xl text-sm font-black transition-all group active:scale-95"
          >
            <Printer className="w-5 h-5 group-hover:scale-110 transition-transform" /> 导出 PDF
          </button>
        </div>

        {/* Category Filter Pills - One Line Scrollable */}
        <div className="flex items-center gap-3 p-1 overflow-hidden">
          <div className="flex items-center gap-2 pr-4 border-r border-white/10 mr-2 shrink-0">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Filter</span>
          </div>
          <div className="flex flex-nowrap gap-2 overflow-x-auto custom-scrollbar pb-2 w-full no-scrollbar">
            <button
              onClick={() => setCatFilter('全部')}
              className={`shrink-0 px-6 py-2.5 rounded-xl text-[11px] font-black transition-all border uppercase tracking-widest ${
                catFilter === '全部' 
                ? 'bg-yellow-400 text-slate-950 border-yellow-400 shadow-lg shadow-yellow-400/20' 
                : 'bg-white/5 text-slate-400 border-white/5 hover:border-white/20 hover:text-slate-200'
              }`}
            >
              All
            </button>
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setCatFilter(c)}
                className={`shrink-0 px-6 py-2.5 rounded-xl text-[11px] font-black transition-all border uppercase tracking-widest ${
                  catFilter === c 
                  ? 'bg-yellow-400 text-slate-950 border-yellow-400 shadow-lg shadow-yellow-400/20' 
                  : 'bg-white/5 text-slate-400 border-white/5 hover:border-white/20 hover:text-slate-200'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Table */}
      <main className="print:hidden bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-white/[0.02] text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/5">
                <th className="px-8 py-6">#</th>
                <th className="px-6 py-6">预览</th>
                <th className="px-6 py-6">分类</th>
                <th className="px-6 py-6">摘要</th>
                <th className="px-6 py-6">技术/材质</th>
                <th className="px-6 py-6">提示词</th>
                <th className="px-8 py-6 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {filteredEntries.map((entry, idx) => (
                <tr key={entry.id} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="px-8 py-6 text-xs text-slate-600 font-mono">{(idx + 1).toString().padStart(2, '0')}</td>
                  <td className="px-6 py-6">
                    <button 
                      className="relative group/img overflow-hidden rounded-2xl border border-white/10 shadow-lg aspect-square w-16"
                      onClick={() => setPreviewEntry(entry)}
                    >
                      <img 
                        src={entry.thumbnail} 
                        alt="thumb" 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-125" 
                      />
                      <div className="absolute inset-0 bg-yellow-400/20 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                        <Maximize2 className="w-5 h-5 text-white" />
                      </div>
                    </button>
                  </td>
                  <td className="px-6 py-6">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black border uppercase tracking-widest ${getCategoryColor(entry.category)}`}>
                      {entry.category}
                    </span>
                  </td>
                  <td className="px-6 py-6 text-sm font-bold text-slate-200 w-40 truncate">{entry.summary}</td>
                  <td className="px-6 py-6">
                    <div className="flex flex-col gap-1.5 max-w-[180px]">
                      <div className="flex items-center gap-2 text-[10px] text-yellow-400/70 bg-yellow-400/5 px-2 py-0.5 rounded border border-yellow-400/10">
                        <Camera className="w-3 h-3 shrink-0" />
                        <span className="truncate">{entry.cameraInfo || 'Auto'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-blue-400/70 bg-blue-400/5 px-2 py-0.5 rounded border border-blue-400/10">
                        <Layers className="w-3 h-3 shrink-0" />
                        <span className="truncate">{entry.materialDescription || 'Standard'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                    <div 
                      onClick={() => setPreviewEntry(entry)}
                      className="text-xs text-slate-400 max-w-xs truncate cursor-pointer hover:text-yellow-400 italic"
                    >
                      "{entry.fullPrompt}"
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => handleCopy(entry.fullPrompt)} className="p-3 hover:bg-white/10 rounded-xl text-slate-500 hover:text-yellow-400 transition-all"><Copy className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(entry.id)} className="p-3 hover:bg-red-500/10 rounded-xl text-slate-500 hover:text-red-400 transition-all"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredEntries.length === 0 && (
            <div className="flex flex-col items-center justify-center py-32 text-slate-700">
              <Sparkles className="w-16 h-16 opacity-5 mb-4" />
              <p className="text-sm font-black uppercase tracking-widest">暂无记录</p>
            </div>
          )}
        </div>
      </main>

      {/* Lightbox Workspace */}
      {previewEntry && (
        <div 
          className="print:hidden fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300 backdrop-blur-[40px] bg-slate-950/90"
          onClick={() => setPreviewEntry(null)}
        >
          <div 
            className="relative max-w-7xl w-full max-h-[92vh] flex flex-col md:flex-row gap-8 bg-[#0a0f1d] border border-white/10 rounded-[3rem] p-4 md:p-10 shadow-[0_0_120px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-500 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setPreviewEntry(null)}
              className="absolute top-8 right-8 z-[110] p-4 bg-white/5 hover:bg-red-500/20 hover:text-red-400 rounded-full text-slate-400 transition-all border border-white/10"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Left: Image Viewer - Fixed black preview by ensuring min height and flex sizing */}
            <div className="flex-[1.2] min-h-[300px] flex items-center justify-center bg-black/60 rounded-[2.5rem] overflow-hidden group/zoom relative border border-white/5">
              <img 
                src={previewEntry.thumbnail} 
                alt="preview" 
                className="max-w-full max-h-full object-contain transition-transform duration-1000 group-hover/zoom:scale-105"
                onLoad={(e) => (e.currentTarget.style.opacity = '1')}
                style={{ opacity: 0, transition: 'opacity 0.5s ease' }}
              />
            </div>

            {/* Right: Workspace */}
            <div className="flex-1 min-w-0 flex flex-col gap-6 overflow-y-auto pr-3 custom-scrollbar">
              <div className="space-y-2">
                <span className={`inline-block px-4 py-1 rounded-full text-[9px] font-black tracking-[0.2em] border uppercase ${getCategoryColor(previewEntry.category)}`}>
                  {previewEntry.category}
                </span>
                <h2 className="text-3xl font-black text-white tracking-tighter uppercase">灵感编辑器</h2>
              </div>

              {/* Editor */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Edit2 className="w-3 h-3" /> 提示词修改 (修改将自动保存并同步 JSON)
                  </span>
                  <div className="flex gap-2">
                    <button 
                      onClick={resetToOriginal}
                      className="text-[10px] font-black text-slate-400 hover:text-white bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 transition-all flex items-center gap-2"
                    >
                      <RotateCcw className="w-3 h-3" /> 恢复原始
                    </button>
                    <button 
                      onClick={() => handleCopy(previewEntry.fullPrompt, '已复制提示词')}
                      className="text-[10px] font-black text-yellow-400 bg-yellow-400/10 px-3 py-1.5 rounded-lg border border-yellow-400/20 transition-all flex items-center gap-2"
                    >
                      <Copy className="w-3 h-3" /> 复制指令
                    </button>
                  </div>
                </div>
                
                <textarea 
                  className="w-full bg-slate-950/60 text-sm text-slate-200 p-6 rounded-3xl border border-white/5 focus:border-yellow-400/50 focus:outline-none min-h-[180px] resize-none leading-relaxed italic shadow-inner"
                  value={previewEntry.fullPrompt}
                  onChange={(e) => handlePromptChange(e.target.value)}
                  placeholder="在此输入提示词..."
                />
              </div>

              {/* Tech Specs */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-yellow-400/5 p-4 rounded-2xl border border-yellow-400/10">
                  <span className="flex items-center gap-2 text-[9px] font-black text-slate-500 mb-1 uppercase tracking-widest"><Camera className="w-3 h-3" /> 技术参数</span>
                  <p className="text-xs font-bold text-yellow-400 truncate">{previewEntry.cameraInfo || 'AI 自动推测'}</p>
                </div>
                <div className="bg-blue-400/5 p-4 rounded-2xl border border-blue-400/10">
                  <span className="flex items-center gap-2 text-[9px] font-black text-slate-500 mb-1 uppercase tracking-widest"><Layers className="w-3 h-3" /> 材质分析</span>
                  <p className="text-xs font-bold text-blue-400 truncate">{previewEntry.materialDescription || '标准质感'}</p>
                </div>
              </div>

              {/* Real-time JSON View */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
                    <FileJson className="w-3 h-3" /> 结构化 JSON (方便后续集成)
                  </span>
                  <button 
                    onClick={() => handleCopy(jsonString, 'JSON 已复制')}
                    className="text-[9px] font-black text-blue-400 uppercase tracking-widest"
                  >
                    复制 JSON
                  </button>
                </div>
                <div className="bg-black/60 p-6 rounded-[2rem] font-mono text-[10px] text-slate-400 border border-white/5 max-h-40 overflow-y-auto custom-scrollbar shadow-inner">
                  <pre className="whitespace-pre-wrap leading-relaxed">{jsonString}</pre>
                </div>
              </div>

              <button 
                onClick={() => handleCopy(previewEntry.fullPrompt, '已复制生图提示词')}
                className="w-full py-5 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-slate-950 rounded-2xl font-black transition-all flex items-center justify-center gap-3 shadow-xl shadow-yellow-400/20 active:scale-[0.98] text-sm uppercase tracking-[0.2em] mt-auto"
              >
                <Sparkles className="w-5 h-5" /> Copy Prompt for AI Tools
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print View Wrapper */}
      <div className="hidden print:block font-serif text-black bg-white p-10">
        <div className="flex items-center justify-between border-b-[6px] border-black pb-10 mb-16">
          <div>
            <h1 className="text-5xl font-black uppercase tracking-tighter">NANO BANANA</h1>
            <p className="text-sm font-bold mt-2 uppercase tracking-widest text-gray-500">灵感库导出 / {new Date().toLocaleDateString()}</p>
          </div>
          <div className="text-7xl">🍌</div>
        </div>
        
        <div className="grid grid-cols-1 gap-14">
          {filteredEntries.map((entry, idx) => (
            <div key={entry.id} className="flex gap-10 pb-14 border-b border-gray-100 break-inside-avoid">
              <div className="w-56 h-56 bg-gray-50 rounded-3xl overflow-hidden flex-shrink-0 border-2 border-gray-100 p-2">
                <img src={entry.thumbnail} className="w-full h-full object-cover rounded-2xl" />
              </div>
              <div className="flex-1 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-3xl font-black leading-tight tracking-tight">#{idx + 1} {entry.summary}</h3>
                  <span className="text-xs font-black border-4 border-black px-4 py-1.5 rounded-full uppercase tracking-widest">{entry.category}</span>
                </div>
                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 italic">
                  “{entry.fullPrompt}”
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default App;
