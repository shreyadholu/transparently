import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

interface ResumeViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  resumeUrl: string;
  candidateName?: string;
}

export function ResumeViewerModal({ isOpen, onClose, resumeUrl, candidateName }: ResumeViewerModalProps) {
  const [zoom, setZoom] = useState(100);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  const zoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const zoomOut = () => setZoom(prev => Math.max(prev - 25, 50));
  const resetZoom = () => setZoom(100);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex flex-col"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

          {/* Toolbar */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="relative z-10 flex items-center justify-between px-6 py-3 bg-card/95 border-b border-border backdrop-blur-md"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-bold text-foreground">
                {candidateName ? `${candidateName}'s Resume` : 'Resume Document'}
              </h3>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md font-medium">
                {zoom}%
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={zoomOut}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={resetZoom}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Reset Zoom"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                onClick={zoomIn}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <div className="w-px h-6 bg-border mx-2" />

              <a
                href={resumeUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
              >
                <Download className="w-4 h-4" /> Download
              </a>

              <button
                onClick={onClose}
                className="ml-2 p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Close (ESC)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>

          {/* PDF Viewer */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="relative z-10 flex-1 flex items-center justify-center p-4 overflow-auto"
            onClick={e => e.stopPropagation()}
          >
            <div
              className="bg-white rounded-lg shadow-2xl overflow-hidden transition-all duration-200"
              style={{
                width: `${Math.min(zoom * 8, 1200)}px`,
                height: `calc(100vh - 120px)`,
                maxWidth: '95vw',
              }}
            >
              <iframe
                src={`${resumeUrl}#toolbar=0&view=FitH`}
                className="w-full h-full border-0"
                title="Resume Document"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ResumeViewerModal;
