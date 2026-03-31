import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, Film, Send, Image as ImageIcon, Sparkles } from 'lucide-react';
import { Button, IconButton } from '../ui/Button';
import { PROMPT_PRESETS } from '../../services/gemini';

interface FrameAnimateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAnimate: (start: string, end: string, prompt: string) => void;
  sourceImage: string;
}

export const FrameAnimateModal: React.FC<FrameAnimateModalProps> = ({
  isOpen,
  onClose,
  onAnimate,
  sourceImage,
}) => {
  const [startImage, setStartImage] = useState<string>(sourceImage);
  const [endImage, setEndImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const endInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setter(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-8">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-2xl"
          onClick={onClose}
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 40 }}
          className="relative w-full max-w-4xl glass rounded-[3rem] overflow-hidden flex flex-col max-h-[85vh] border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.5)]"
        >
          <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-2xl">
                <Film className="text-black" size={24} strokeWidth={1.5} />
              </div>
              <div className="flex flex-col">
                <h2 className="text-xl font-bold tracking-tight text-white">Frame Animation</h2>
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 mt-1">Veo 3 Pro Engine</span>
              </div>
            </div>
            <IconButton onClick={onClose} icon={<X size={20} strokeWidth={1.5} />} />
          </div>

          <div className="p-12 overflow-y-auto flex flex-col gap-12 custom-scrollbar">
            <div className="grid grid-cols-2 gap-12">
              <div className="flex flex-col gap-4">
                <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/40">Start Frame</span>
                <div className="relative aspect-video rounded-[2rem] overflow-hidden glass border-white/10 group shadow-2xl">
                  <img src={startImage} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="Start" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 backdrop-blur-sm">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/80 flex items-center gap-2">
                      <ImageIcon size={14} /> Source Active
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/40">End Frame</span>
                <div 
                  onClick={() => endInputRef.current?.click()}
                  className="relative aspect-video rounded-[2rem] overflow-hidden glass border-dashed border-white/20 hover:border-white/40 transition-all duration-500 cursor-pointer flex flex-col items-center justify-center gap-4 group shadow-2xl"
                >
                  {endImage ? (
                    <>
                      <img src={endImage} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="End" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 backdrop-blur-sm">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/80 flex items-center gap-2">
                          <Upload size={14} /> Change Frame
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 border border-white/10">
                        <Upload size={24} className="text-white/40 group-hover:text-white transition-colors" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 group-hover:text-white/80 transition-colors">Upload End Frame</span>
                    </>
                  )}
                  <input 
                    type="file" 
                    ref={endInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={(e) => handleFileChange(e, setEndImage)} 
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-white/40">Cinematic Vision</span>
                <div className="flex gap-2">
                  {PROMPT_PRESETS.map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => setPrompt(preset.prompt)}
                      className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-bold uppercase tracking-widest text-white/40 hover:bg-white/10 hover:text-white transition-all flex items-center gap-2"
                    >
                      <Sparkles size={10} className="text-white/20" />
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the cinematic transition between frames..."
                className="w-full bg-white/[0.02] border border-white/10 rounded-[2rem] p-8 text-sm outline-none focus:border-white/20 transition-all min-h-[160px] resize-none text-white placeholder:text-white/10 shadow-inner"
              />
            </div>
          </div>

          <div className="p-8 bg-white/[0.02] border-t border-white/5 flex justify-end items-center gap-6">
            <span className="text-[10px] font-serif italic text-white/20">Veo 3 will interpolate motion between frames</span>
            <Button 
              onClick={() => endImage && prompt && onAnimate(startImage, endImage, prompt)}
              disabled={!endImage || !prompt.trim()}
              variant="primary"
              size="lg"
              badge="AI"
              badgeVariant="gemini"
              icon={<Send size={18} strokeWidth={1.5} />}
            >
              Generate Cinematic Video
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
