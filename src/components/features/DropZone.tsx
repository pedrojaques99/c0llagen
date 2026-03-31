import React from 'react';
import { motion } from 'motion/react';
import { Upload } from 'lucide-react';

interface DropZoneProps {
  onUpload: () => void;
}

export const DropZone: React.FC<DropZoneProps> = ({ onUpload }) => {
  return (
    <motion.div 
      key="empty"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onUpload}
      className="aspect-video rounded-[10px] border-[4.11111px] border-solid border-white/10 flex flex-col items-center justify-center text-white/20 gap-6 hover:border-white/20 transition-all duration-300 px-[30px] py-[10px] cursor-pointer"
    >
      <Upload size={24} strokeWidth={1} />
      <p className="text-[10px] uppercase tracking-[0.4em] font-medium">Upload Moodboard</p>
    </motion.div>
  );
};
