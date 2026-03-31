import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Loader2, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { useRenderQueue } from '../../hooks/useRenderQueue';
import { RenderJob } from '../../types';

const JobToast: React.FC<{ job: RenderJob; onCancel: () => void; onDismiss: () => void }> = ({ job, onCancel, onDismiss }) => {
  const elapsed = job.startedAt
    ? ((job.completedAt || Date.now()) - job.startedAt) / 1000
    : 0;

  const slideCount = job.composition.slides.length;
  const label = slideCount === 1 ? 'Single Clip' : `${slideCount} Slides`;

  const handleDownload = () => {
    if (!job.blob) return;
    const url = URL.createObjectURL(job.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `collagen-${job.id}.mp4`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      className="glass rounded-2xl border border-white/10 p-4 w-80 shadow-2xl"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">{label}</span>
        <button
          onClick={job.status === 'rendering' ? onCancel : onDismiss}
          className="p-1 hover:bg-white/10 rounded-full transition-all"
        >
          <X size={14} className="text-white/40" />
        </button>
      </div>

      {job.status === 'rendering' && (
        <>
          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mb-2">
            <motion.div
              className="h-full bg-white rounded-full"
              style={{ width: `${job.progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-white/40">{Math.round(job.progress)}%</span>
            <span className="text-[10px] font-mono text-white/40">{elapsed.toFixed(1)}s</span>
          </div>
        </>
      )}

      {job.status === 'completed' && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-green-400" />
            <span className="text-xs text-white/60">Done in {elapsed.toFixed(1)}s</span>
          </div>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-black text-[10px] font-bold uppercase tracking-widest hover:bg-white/90 transition-all"
          >
            <Download size={12} /> Save
          </button>
        </div>
      )}

      {job.status === 'error' && (
        <div className="flex items-center gap-2">
          <AlertCircle size={16} className="text-red-400" />
          <span className="text-xs text-red-400">{job.error || 'Render failed'}</span>
        </div>
      )}

      {job.status === 'queued' && (
        <div className="flex items-center gap-2">
          <Loader2 size={14} className="text-white/40 animate-spin" />
          <span className="text-xs text-white/40">Queued...</span>
        </div>
      )}

      {job.status === 'cancelled' && (
        <div className="flex items-center gap-2">
          <XCircle size={16} className="text-white/30" />
          <span className="text-xs text-white/30">Cancelled</span>
        </div>
      )}
    </motion.div>
  );
};

export const RenderToast: React.FC = () => {
  const { jobs, cancel, dismiss } = useRenderQueue();

  const visibleJobs = jobs.filter(j => j.status !== 'cancelled');

  if (visibleJobs.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      <AnimatePresence mode="popLayout">
        {visibleJobs.map(job => (
          <JobToast
            key={job.id}
            job={job}
            onCancel={() => cancel(job.id)}
            onDismiss={() => dismiss(job.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};
