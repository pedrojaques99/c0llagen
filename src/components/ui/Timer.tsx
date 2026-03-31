import React, { useState, useEffect } from 'react';

export const Timer = ({ startTime }: { startTime: number }) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((Date.now() - startTime) / 1000);
    }, 100);
    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <span className="font-mono text-[10px] tabular-nums tracking-widest text-white/40">
      {elapsed.toFixed(1).padStart(4, '0')}s
    </span>
  );
};
