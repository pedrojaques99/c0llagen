import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Upload } from 'lucide-react';

interface DropZoneProps {
  onUpload: () => void;
  onFilesDropped: (files: File[]) => void;
}

export const DropZone: React.FC<DropZoneProps> = ({ onUpload, onFilesDropped }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files as FileList).filter((file: File) => file.type.startsWith('image/'));
    if (files.length > 0) {
      onFilesDropped(files);
    }
  };

  return (
    <motion.div 
      key="empty"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={onUpload}
      className={`aspect-video w-full max-w-[500px] rounded-[10px] border-[4.11111px] border-solid flex flex-col items-center justify-center gap-6 transition-all duration-300 px-[30px] py-[10px] cursor-pointer
        ${isDragging 
          ? 'border-white/40 border-dashed bg-white/5 text-white/40' 
          : 'border-white/10 text-white/20 hover:border-white/20 hover:bg-white/[0.02]'}`}
    >
      <motion.div
        animate={isDragging ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
      >
        <Upload size={32} strokeWidth={1} />
      </motion.div>
      <div className="text-center">
        <p className="text-[10px] uppercase tracking-[0.4em] font-medium">Upload or Drop Moodboard</p>
        <p className="text-[8px] text-white/10 uppercase tracking-[0.2em] mt-2">Supports multiple images</p>
      </div>
    </motion.div>
  );
};
