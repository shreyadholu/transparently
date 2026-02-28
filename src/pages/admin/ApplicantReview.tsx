import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp, Application } from '@/contexts/AppContext';
import { User, CheckCircle2, XCircle, FileText, Search, Shield } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';

const REJECTION_REASONS = [
  'Skill Mismatch',
  'Experience Gap',
  'Missing Keywords',
  'Formatting Issues',
  'Location Mismatch',
];

const ApplicantReview = () => {
  const { applications, jobs, reviewApplication } = useApp();
  const [selected, setSelected] = useState<Application | null>(null);
  const [rejectionReasons, setRejectionReasons] = useState<string[]>([]);
  const [showRejectMenu, setShowRejectMenu] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = applications.filter(app => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const job = jobs.find(j => j.id === app.jobId);
    return app.studentName.toLowerCase().includes(q) ||
      app.studentEmail.toLowerCase().includes(q) ||
      job?.title.toLowerCase().includes(q) || false;
  });

  const handleOpenSheet = (app: Application) => {
    setSelected(app);
    setRejectionReasons([]);
    setShowRejectMenu(false);
    setSheetOpen(true);
  };

  const handleApprove = (id: string) => {
    reviewApplication(id, 'approved');
    setSheetOpen(false);
    setSelected(null);
  };

  const handleReject = (id: string) => {
    if (rejectionReasons.length === 0) return;
    reviewApplication(id, 'rejected', rejectionReasons);
    setSheetOpen(false);
    setSelected(null);
    setRejectionReasons([]);
    setShowRejectMenu(false);
  };

  const toggleReason = (reason: string) => {
    setRejectionReasons(prev =>
      prev.includes(reason) ? prev.filter(r => r !== reason) : [...prev, reason]
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Applicant Review</h1>
        <p className="text-muted-foreground mt-1">Review and provide transparent feedback</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by name, email, or job title..."
          className="glass-input w-full pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="elevated-card p-12 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No applicants found</p>
          </div>
        ) : (
          filtered.map((app, i) => {
            const job = jobs.find(j => j.id === app.jobId);
            return (
              <motion.button
                key={app.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => handleOpenSheet(app)}
                className="w-full text-left p-4 rounded-xl elevated-card flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{app.studentName}</p>
                  <p className="text-xs text-muted-foreground truncate">{job?.title} · Score: {app.resumeScore}%</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                  app.status === 'approved' ? 'bg-success/10 text-success' :
                  app.status === 'rejected' ? 'bg-destructive/10 text-destructive' :
                  'bg-warning/10 text-warning'
                }`}>
                  {app.status}
                </span>
              </motion.button>
            );
          })
        )}
      </div>

      {/* Slide-over Panel */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md bg-card/95 backdrop-blur-xl border-l border-border/50 p-0 overflow-y-auto">
          <SheetTitle className="sr-only">Candidate Details</SheetTitle>
          {selected && (
            <div className="p-6 space-y-6">
              <h2 className="text-lg font-bold">Candidate Details</h2>

              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-lg">{selected.studentName}</p>
                  <p className="text-sm text-muted-foreground">{selected.studentEmail}</p>
                </div>
              </div>

              <div className="elevated-card p-4">
                <p className="text-sm text-muted-foreground mb-2">Applied For</p>
                <p className="font-medium">{jobs.find(j => j.id === selected.jobId)?.title}</p>
                <p className="text-xs text-muted-foreground">{jobs.find(j => j.id === selected.jobId)?.company}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.studentSkills.map(s => (
                    <span key={s} className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">{s}</span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">Resume Score</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${selected.resumeScore}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="h-full bg-primary rounded-full"
                    />
                  </div>
                  <span className="text-sm font-mono font-bold text-primary">{selected.resumeScore}%</span>
                </div>
              </div>

              {selected.status === 'pending' && (
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleApprove(selected.id)}
                      className="flex-1 py-3 bg-success/20 text-success border border-success/30 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5"
                    >
                      <Shield className="w-4 h-4" /> Approve for Interview
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowRejectMenu(!showRejectMenu)}
                      className="flex-1 py-3 bg-destructive/20 text-destructive border border-destructive/30 rounded-lg text-sm font-medium flex items-center justify-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" /> Decline with Feedback
                    </motion.button>
                  </div>

                  <AnimatePresence>
                    {showRejectMenu && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="elevated-card p-4 space-y-3">
                          <p className="text-sm font-semibold text-destructive">Select Reason(s):</p>
                          <div className="space-y-2">
                            {REJECTION_REASONS.map(reason => (
                              <motion.button
                                key={reason}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => toggleReason(reason)}
                                className={`w-full px-4 py-2.5 rounded-lg text-xs font-medium border transition-all text-left ${
                                  rejectionReasons.includes(reason)
                                    ? 'bg-destructive/20 text-destructive border-destructive/40'
                                    : 'bg-muted/30 text-muted-foreground border-border/30 hover:border-destructive/30'
                                }`}
                              >
                                {reason}
                              </motion.button>
                            ))}
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleReject(selected.id)}
                            disabled={rejectionReasons.length === 0}
                            className="w-full py-2.5 bg-destructive text-destructive-foreground rounded-lg text-sm font-semibold disabled:opacity-40 transition-opacity"
                          >
                            Confirm Decline ({rejectionReasons.length})
                          </motion.button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {selected.status !== 'pending' && (
                <div className={`p-4 rounded-lg text-sm font-medium text-center ${
                  selected.status === 'approved' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                }`}>
                  {selected.status === 'approved' ? 'Approved for Interview ✓' : 'Declined ✗'}
                  {selected.status === 'rejected' && selected.feedback?.rejectionReasons && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      {selected.feedback.rejectionReasons.join(' · ')}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default ApplicantReview;
