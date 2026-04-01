import React from 'react';
import { ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface BreadcrumbItem {
  id: string;
  label: string;
  onClick?: () => void;
  active?: boolean;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  return (
    <nav className="flex items-center gap-1.5" aria-label="Breadcrumb">
      <AnimatePresence mode="popLayout">
        {items.map((item, index) => (
          <React.Fragment key={item.id}>
            {index > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 4 }}
                className="text-muted"
              >
                <ChevronRight size={14} strokeWidth={1.5} />
              </motion.div>
            )}
            
            <motion.div
              layout
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className={`flex items-center ${item.active ? 'pointer-events-none' : ''}`}
            >
              <button
                onClick={item.onClick}
                disabled={item.active}
                className={`
                  text-[11px] font-mono tracking-widest uppercase transition-colors px-1 py-0.5 rounded
                  ${item.active 
                    ? 'text-ink cursor-default' 
                    : 'text-muted hover:text-ink hover:bg-border cursor-pointer'
                  }
                `}
              >
                {item.label}
              </button>
            </motion.div>
          </React.Fragment>
        ))}
      </AnimatePresence>
    </nav>
  );
};
