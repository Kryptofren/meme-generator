
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MemeText } from './types';

// Absolute path to the template image on GitHub Pages
const DEFAULT_TEMPLATE = 'https://kryptofren.github.io/meme-generator/meme.png';

const App: React.FC = () => {
  const [memeText, setMemeText] = useState<MemeText>({ top: '', bottom: '' });
  const [fontSizeScale, setFontSizeScale] = useState<number>(0.8);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const loadAndDrawImage = (src: string) => {
    setImageError(false);
    setImageLoaded(false);
    
    const img = new Image();
    // Enable anonymous CORS to allow canvas export
    img.crossOrigin = 'anonymous'; 
    img.src = src;
    
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
      setImageError(false);
      drawMeme();
    };
    
    img.onerror = () => {
      console.error("Error loading image:", src);
      setImageError(true);
      setImageLoaded(false);
    };
  };

  useEffect(() => {
    loadAndDrawImage(DEFAULT_TEMPLATE);
  }, []);

  const drawMeme = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions to match the source template
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);

    const baseFontSize = Math.floor(canvas.height * 0.055); 
    
    const wrapText = (
      context: CanvasRenderingContext2D, 
      rawText: string, 
      centerX: number, 
      centerY: number, 
      boxWidth: number, 
      boxHeight: number,
      initialFontSize: number
    ) => {
      // 1. Prepare text (uppercase) to match rendering
      const text = rawText.trim().toUpperCase();
      const words = text.split(/\s+/);
      if (words.length === 0 || text === '') return;

      // 2. Define internal bounds
      const hPadding = boxWidth * 0.12;
      const vPadding = boxHeight * 0.12;
      const maxWidth = boxWidth - (hPadding * 2);
      const maxHeight = boxHeight - (vPadding * 2);

      let currentFontSize = initialFontSize;
      let lines: string[] = [];
      let lineHeight = 0;
      let totalBlockHeight = 0;

      // 3. Robust loop to find a font size that fits both width and height
      const findBestFit = () => {
        while (currentFontSize > 6) {
          context.font = `800 ${currentFontSize}px Inter, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
          lineHeight = currentFontSize * 1.15;
          lines = [];
          let currentLine = '';

          for (let n = 0; n < words.length; n++) {
            const testLine = currentLine + words[n] + ' ';
            const metrics = context.measureText(testLine.trim());
            
            if (metrics.width > maxWidth && n > 0) {
              lines.push(currentLine.trim());
              currentLine = words[n] + ' ';
              
              // If a single word is too wide, we'll need to shrink the font and restart
              const wordMetrics = context.measureText(words[n]);
              if (wordMetrics.width > maxWidth) {
                currentFontSize -= 1;
                return false; 
              }
            } else {
              currentLine = testLine;
            }
          }
          lines.push(currentLine.trim());
          
          totalBlockHeight = lines.length * lineHeight;
          if (totalBlockHeight <= maxHeight) return true;
          currentFontSize -= 1;
        }
        return true;
      };

      // Keep retrying findBestFit if it returns false (due to forced word shrink)
      while (!findBestFit()) {}

      // 4. Horizontal and vertical alignment
      context.textAlign = 'center';
      context.textBaseline = 'top'; 
      context.fillStyle = '#000000';

      // Start from the top of the calculated block, centered within the box
      const startY = centerY - (totalBlockHeight / 2);

      context.save();
      // Clip to prevent any rendering outside the target box
      context.beginPath();
      context.rect(centerX - (boxWidth / 2), centerY - (boxHeight / 2), boxWidth, boxHeight);
      context.clip();

      lines.forEach((line, index) => {
        const lineY = startY + (index * lineHeight);
        context.fillText(line, centerX, lineY);
      });

      context.restore();
    };

    // Apu Drake Template is divided into 2x2 grid
    // Left side: Images (0 - 50%)
    // Right side: Text boxes (50% - 100%)
    const panelWidth = canvas.width / 2;
    const panelHeight = canvas.height / 2;
    
    const rightCenterX = canvas.width * 0.75; 
    const topCenterY = canvas.height * 0.25;
    const bottomCenterY = canvas.height * 0.75;

    const scaledFontSize = baseFontSize * fontSizeScale;

    if (memeText.top) {
      wrapText(ctx, memeText.top, rightCenterX, topCenterY, panelWidth, panelHeight, scaledFontSize);
    }
    if (memeText.bottom) {
      wrapText(ctx, memeText.bottom, rightCenterX, bottomCenterY, panelWidth, panelHeight, scaledFontSize);
    }
  }, [memeText, fontSizeScale]);

  useEffect(() => {
    if (imageLoaded) {
      drawMeme();
    }
  }, [memeText, fontSizeScale, imageLoaded, drawMeme]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const link = document.createElement('a');
      link.download = `apu-meme-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      alert("Download failed. Please right-click or long-press the image to save it manually.");
    }
  };

  const handleReset = () => {
    setMemeText({ top: '', bottom: '' });
    setFontSizeScale(0.8);
  };

  const handleRetryLoad = () => {
    loadAndDrawImage(DEFAULT_TEMPLATE);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-4">
      <header className="w-full max-w-4xl py-6 md:py-10 text-center">
        <h1 className="text-4xl md:text-6xl font-black mb-2 bg-gradient-to-br from-emerald-400 to-teal-500 bg-clip-text text-transparent uppercase tracking-tighter">
          APU MEME STUDIO
        </h1>
        <p className="text-slate-500 text-[10px] md:text-[12px] font-bold uppercase tracking-[0.4em] mb-4">
          Simple • Private • Smart Wrapping
        </p>
      </header>

      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-start mb-20">
        <div className="flex flex-col gap-6 order-2 lg:order-1">
          <section className="bg-slate-900 border border-slate-800 p-6 md:p-10 rounded-3xl shadow-2xl ring-1 ring-white/5">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-bold flex items-center gap-3 text-emerald-400">
                <i className="fa-solid fa-wand-magic-sparkles"></i>
                Editor
              </h2>
              <button 
                onClick={handleReset}
                className="text-[10px] font-black text-slate-500 hover:text-red-400 transition-all uppercase tracking-widest flex items-center gap-2 group"
              >
                <i className="fa-solid fa-rotate-left group-hover:rotate-[-45deg] transition-transform"></i>
                Reset All
              </button>
            </div>
            
            <div className="space-y-8">
              <div className="flex flex-col gap-4 pb-4 border-b border-slate-800/50">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Base Font Size</label>
                  <span className="text-[12px] bg-emerald-500/10 px-3 py-1 rounded-full text-emerald-400 font-mono font-bold">
                    {Math.round(fontSizeScale * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.3"
                  max="1.5"
                  step="0.01"
                  value={fontSizeScale}
                  onChange={(e) => setFontSizeScale(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 transition-all hover:bg-slate-700"
                />
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex justify-between">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Top Box (Refusal)</label>
                  <i className="fa-solid fa-circle-xmark text-red-500/30"></i>
                </div>
                <textarea
                  className="bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none text-white font-semibold transition-all resize-none shadow-inner"
                  placeholder="What does Apu dislike?..."
                  rows={3}
                  value={memeText.top}
                  onChange={(e) => setMemeText(prev => ({ ...prev, top: e.target.value }))}
                />
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex justify-between">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Bottom Box (Approval)</label>
                  <i className="fa-solid fa-circle-check text-emerald-500/30"></i>
                </div>
                <textarea
                  className="bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none text-white font-semibold transition-all resize-none shadow-inner"
                  placeholder="What does Apu love?..."
                  rows={3}
                  value={memeText.bottom}
                  onChange={(e) => setMemeText(prev => ({ ...prev, bottom: e.target.value }))}
                />
              </div>
            </div>

            <div className="mt-10 flex flex-col gap-4">
              <button
                onClick={handleDownload}
                disabled={!imageLoaded}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed text-white font-black py-5 rounded-2xl shadow-[0_10px_30px_-10px_rgba(16,185,129,0.3)] flex items-center justify-center gap-3 transition-all active:scale-95 text-lg"
              >
                <i className="fa-solid fa-cloud-arrow-down text-xl"></i>
                SAVE MEME
              </button>

              {imageError && (
                <button
                  onClick={handleRetryLoad}
                  className="w-full bg-slate-800/50 hover:bg-slate-800 text-slate-400 font-bold py-3 rounded-2xl border border-dashed border-slate-700 hover:border-slate-500 flex items-center justify-center gap-2 text-xs transition-all"
                >
                  <i className="fa-solid fa-rotate-right"></i>
                  RETRY LOADING TEMPLATE
                </button>
              )}
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-4 order-1 lg:order-2 lg:sticky lg:top-10">
          <div className="relative bg-slate-900 border-2 border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl min-h-[400px] flex items-center justify-center ring-1 ring-white/5 group">
            <div className="absolute top-4 left-4 z-10">
              <span className="bg-slate-950/80 backdrop-blur-md text-slate-400 text-[8px] font-black px-3 py-1.5 rounded-full border border-white/5 uppercase tracking-[0.2em]">
                Canvas Preview
              </span>
            </div>

            {imageError && (
              <div className="p-12 text-center flex flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 text-2xl">
                   <i className="fa-solid fa-triangle-exclamation"></i>
                </div>
                <p className="text-slate-100 text-lg font-bold">Template Load Error</p>
              </div>
            )}

            {!imageLoaded && !imageError && (
              <div className="flex flex-col items-center gap-6">
                <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
              </div>
            )}

            <div className={`p-4 md:p-8 w-full ${imageLoaded ? 'block animate-in zoom-in-95 fade-in duration-700' : 'hidden'}`}>
               <canvas 
                ref={canvasRef} 
                className="w-full h-auto max-h-[80vh] object-contain rounded-2xl bg-white shadow-2xl ring-4 ring-white/5 transition-transform group-hover:scale-[1.005]"
              />
            </div>
          </div>
        </div>
      </main>

      <footer className="w-full mt-auto py-12 flex flex-col items-center gap-4 border-t border-slate-900">
        <p className="text-slate-600 text-[9px] font-black uppercase tracking-[0.6em]">
          APU MEME STUDIO &bull; 2026
        </p>
      </footer>
    </div>
  );
};

export default App;
