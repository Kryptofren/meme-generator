
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MemeText } from './types';

const DEFAULT_TEMPLATE = 'https://kryptofren.github.io/meme-generator/meme.png';

const App: React.FC = () => {
  const [memeText, setMemeText] = useState<MemeText>({ top: '', bottom: '' });
  const [fontSizeScale, setFontSizeScale] = useState<number>(0.8);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Enhanced font loading verification for cross-platform measurement accuracy
  useEffect(() => {
    let isMounted = true;
    const checkFonts = async () => {
      try {
        // Explicitly load the Inter 800 weight used for the meme branding
        await document.fonts.load('800 16px Inter');
        await document.fonts.ready;
        if (isMounted) {
          setFontsLoaded(true);
          // Redraw after a tiny delay to ensure metrics are fully synchronized
          setTimeout(() => { if (isMounted) drawMeme(); }, 50);
        }
      } catch (e) {
        console.warn("Font loading detection failed, using fallback", e);
        if (isMounted) setFontsLoaded(true);
      }
    };
    checkFonts();
    
    // Listen for late-loading fonts
    const handleFontsChange = () => {
        if (isMounted) {
            setFontsLoaded(true);
            drawMeme();
        }
    };
    document.fonts.addEventListener('loadingdone', handleFontsChange);

    return () => { 
        isMounted = false; 
        document.fonts.removeEventListener('loadingdone', handleFontsChange);
    };
  }, []);

  const loadAndDrawImage = (src: string) => {
    setImageError(false);
    setImageLoaded(false);
    
    const img = new Image();
    img.crossOrigin = 'anonymous'; 
    img.src = src;
    
    img.onload = async () => {
      if ('decode' in img) {
        try {
          await img.decode();
        } catch (e) {
          console.error("Image decode failed", e);
        }
      }
      imageRef.current = img;
      setImageLoaded(true);
    };
    
    img.onerror = () => {
      console.error("Error loading image:", src);
      setImageError(true);
    };
  };

  useEffect(() => {
    loadAndDrawImage(DEFAULT_TEMPLATE);
  }, []);

  const drawMeme = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !fontsLoaded) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0);

    const baseFontSize = Math.floor(canvas.height * 0.065); 
    const currentFontSize = baseFontSize * fontSizeScale;

    /**
     * Accurately wraps text by measuring pixel width of segments.
     * Handles long phrases and ultra-long words gracefully.
     */
    const wrapText = (
      context: CanvasRenderingContext2D, 
      rawText: string, 
      centerX: number, 
      centerY: number, 
      boxWidth: number, 
      boxHeight: number,
      fSize: number
    ) => {
      const text = rawText.trim().toUpperCase();
      if (!text) return;

      const fontString = `800 ${fSize}px Inter, "Arial Black", Gadget, sans-serif`;
      context.font = fontString;
      
      const words = text.split(/\s+/);
      const paddingX = boxWidth * 0.15;
      // Safety margin to prevent sub-pixel rounding issues on different browsers
      const targetMaxWidth = (boxWidth - (paddingX * 2)) * 0.97;
      
      const lineHeight = fSize * 1.15; 
      const lines: string[] = [];
      let currentLine = '';

      const pushLineWithWordSplit = (wordToSplit: string) => {
        let charLine = '';
        const chars = wordToSplit.split('');
        for (const char of chars) {
          const testCharLine = charLine + char;
          if (context.measureText(testCharLine).width > targetMaxWidth) {
            if (charLine) lines.push(charLine);
            charLine = char;
          } else {
            charLine = testCharLine;
          }
        }
        return charLine;
      };

      for (const word of words) {
        context.font = fontString;
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const metrics = context.measureText(testLine);
        
        if (metrics.width > targetMaxWidth) {
          if (currentLine) {
            lines.push(currentLine);
            // After pushing current, check if the new word itself is too wide
            if (context.measureText(word).width > targetMaxWidth) {
              currentLine = pushLineWithWordSplit(word);
            } else {
              currentLine = word;
            }
          } else {
            // The word alone is too wide for an empty line
            currentLine = pushLineWithWordSplit(word);
          }
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);
      
      const totalHeight = lines.length * lineHeight;
      context.textAlign = 'center';
      context.textBaseline = 'middle'; 
      context.fillStyle = '#000000';
      context.font = fontString;

      const startY = centerY - (totalHeight / 2) + (lineHeight / 2);

      context.save();
      // Clipping path matches the template's white background area exactly
      context.beginPath();
      context.rect(centerX - boxWidth / 2 + 5, centerY - boxHeight / 2 + 5, boxWidth - 10, boxHeight - 10);
      context.clip();

      lines.forEach((line, index) => {
        const lineY = startY + (index * lineHeight);
        context.fillText(line, centerX, lineY);
      });

      context.restore();
    };

    const panelWidth = canvas.width / 2;
    const panelHeight = canvas.height / 2;
    const rightCenterX = canvas.width * 0.75; 
    const topCenterY = canvas.height * 0.25;
    const bottomCenterY = canvas.height * 0.75;

    if (memeText.top) {
      wrapText(ctx, memeText.top, rightCenterX, topCenterY, panelWidth, panelHeight, currentFontSize);
    }
    if (memeText.bottom) {
      wrapText(ctx, memeText.bottom, rightCenterX, bottomCenterY, panelWidth, panelHeight, currentFontSize);
    }
  }, [memeText, fontSizeScale, fontsLoaded, imageLoaded]);

  useEffect(() => {
    drawMeme();
  }, [drawMeme]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const link = document.createElement('a');
      link.download = `apu-meme-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    } catch (e) {
      alert("Download failed. Please right-click the image and choose 'Save image as'.");
    }
  };

  const handleReset = () => {
    setMemeText({ top: '', bottom: '' });
    setFontSizeScale(0.8);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-4">
      <header className="w-full max-w-4xl py-6 md:py-10 text-center">
        <h1 className="text-4xl md:text-6xl font-black mb-2 bg-gradient-to-br from-emerald-400 to-teal-500 bg-clip-text text-transparent uppercase tracking-tighter">
          APU MEME STUDIO
        </h1>
        <p className="text-slate-500 text-[10px] md:text-[12px] font-bold uppercase tracking-[0.4em] mb-4">
          Simple • Private • Precision Wrap
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
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Font Size</label>
                  <span className="text-[12px] bg-emerald-500/10 px-3 py-1 rounded-full text-emerald-400 font-mono font-bold">
                    {Math.round(fontSizeScale * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="2.0"
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
                disabled={!imageLoaded || !fontsLoaded}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed text-white font-black py-5 rounded-2xl shadow-[0_10px_30px_-10px_rgba(16,185,129,0.3)] flex items-center justify-center gap-3 transition-all active:scale-95 text-lg"
              >
                <i className="fa-solid fa-cloud-arrow-down text-xl"></i>
                DOWNLOAD MEME
              </button>
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-4 order-1 lg:order-2 lg:sticky lg:top-10">
          <div className="relative bg-slate-900 border-2 border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl min-h-[400px] flex items-center justify-center ring-1 ring-white/5 group">
            <div className="absolute top-4 left-4 z-10">
              <span className="bg-slate-950/80 backdrop-blur-md text-slate-400 text-[8px] font-black px-3 py-1.5 rounded-full border border-white/5 uppercase tracking-[0.2em]">
                Preview
              </span>
            </div>

            {imageError && (
              <div className="p-12 text-center flex flex-col items-center gap-6">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 text-2xl">
                   <i className="fa-solid fa-triangle-exclamation"></i>
                </div>
                <p className="text-slate-100 text-lg font-bold">Template Load Error</p>
              </div>
            )}

            {(!imageLoaded || !fontsLoaded) && !imageError && (
              <div className="flex flex-col items-center gap-6">
                <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Preparing Studio...</p>
              </div>
            )}

            <div className={`p-4 md:p-8 w-full ${(imageLoaded && fontsLoaded) ? 'block animate-in zoom-in-95 fade-in duration-700' : 'hidden'}`}>
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
