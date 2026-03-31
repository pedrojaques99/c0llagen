import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const Modal = ({ isOpen, onClose, children }: ModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-bg/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-12"
          onClick={onClose}
        >
          <motion.button 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute top-6 right-6 p-4 rounded-full bg-white text-black hover:scale-110 transition-transform z-10 shadow-2xl"
            onClick={onClose}
          >
            <X size={24} strokeWidth={1.5} />
          </motion.button>
          <div onClick={(e) => e.stopPropagation()} className="max-w-full max-h-full">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
