import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp, Application, Job } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';
import { User, CheckCircle2, XCircle, FileText, Search, Shield, ArrowLeft, Loader2, Download } from 'lucide-react';

const REJECTION_REASONS = [
  'Skill Mismatch',
  'Experience Gap',
  'Missing Keywords',
  'Formatting Issues',
  'Location Mismatch',
];

const ApplicantReview = () => {
  const { applications, jobs, user, reviewApplication } = useApp();
  const [selected, setSelected] = useState<Application | null>(null);
  const [rejectionReasons, setRejectionReasons] = useState<string[]>([]);
  const [showRejectMenu, setShowRejectMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [loadingResume, setLoadingResume] = useState(false);

  // Focus only on applications for jobs created by THIS recruiter
  const myJobIds = jobs.filter(j => j.created_by === user?.id || !j.created_by).map(j => j.id);
  
  const filtered = applications.filter(app => {
    if (!myJobIds.includes(app.jobId)) return false;
    if (!app.studentName || app.studentName.trim() === '') return false;
    
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const job = jobs.find(j => j.id === app.jobId);
    return app.studentName.toLowerCase().includes(q) ||
      app.studentEmail.toLowerCase().includes(q) ||
      (job && job.title.toLowerCase().includes(q)) || false;
  });

  const handleSelectCandidate = async (app: Application) => {
    setSelected(app);
    setRejectionReasons([]);
    setShowRejectMenu(false);
    setResumeUrl(null);
    setLoadingResume(true);

    try {
      const { data, error } = await supabase
        .from('student_profiles')
        .select('resume_url')
        .eq('user_id', app.studentId)
        .single();
      
      if (!error && data?.resume_url) {
        setResumeUrl(data.resume_url);
      }
    } catch (err) {
      console.error("Error fetching resume URL:", err);
    } finally {
      setLoadingResume(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase.from("applications").update({ status: "selected" }).eq("id", id);
      if (error) return console.error(error);
      reviewApplication(id, 'approved');
    } catch (err) { console.error(err); }
  };

  const handleReject = async (id: string) => {
    if (rejectionReasons.length === 0) return;
    try {
      const { error: appError } = await supabase.from("applications").update({ status: "rejected" }).eq("id", id);
      if (appError) return console.error(appError);
      
      await supabase.from("application_feedback").insert([{
        application_id: id,
        recruiter_notes: rejectionReasons.join(', ')
      }]);
      
      reviewApplication(id, 'rejected', rejectionReasons);
      setShowRejectMenu(false);
    } catch (err) { console.error(err); }
  };

  const toggleReason = (reason: string) => {
    setRejectionReasons(prev => prev.includes(reason) ? prev.filter(r => r !== reason) : [...prev, reason]);
  };

  // -------------------------------------------------------------
  // RENDER: DETAIL VIEW
  // -------------------------------------------------------------
  if (selected) {
    const job = jobs.find(j => j.id === selected.jobId);
    
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="h-[calc(100vh-8rem)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Applicants
          </button>
          <div className="flex gap-2">
            {(selected.status === 'pending' || selected.status === 'under_review') ? (
              <>
                <button onClick={() => handleApprove(selected.id)} className="px-4 py-2 bg-success text-success-foreground rounded-lg text-sm font-semibold flex items-center shadow-lg shadow-success/20">
                  <Shield className="w-4 h-4 mr-2" /> Approve Candidate
                </button>
                <button onClick={() => setShowRejectMenu(!showRejectMenu)} className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-semibold flex items-center shadow-lg shadow-destructive/20">
                  <XCircle className="w-4 h-4 mr-2" /> Decline
                </button>
              </>
            ) : (
              <span className={`px-4 py-2 rounded-lg text-sm font-bold ${
                selected.status === 'selected' || selected.status === 'approved' ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
              }`}>
                {selected.status.toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* Reject Menu Inline */}
        <AnimatePresence>
          {showRejectMenu && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-4 overflow-hidden">
              <div className="elevated-card p-4 border-destructive/30 flex gap-4 items-end">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-destructive mb-2">Select rejection reasons to send feedback:</p>
                  <div className="flex flex-wrap gap-2">
                    {REJECTION_REASONS.map(reason => (
                      <button key={reason} onClick={() => toggleReason(reason)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        rejectionReasons.includes(reason) ? 'bg-destructive/20 text-destructive border-destructive/40' : 'bg-muted/30 text-muted-foreground border-border/30 hover:border-destructive/30'
                      }`}>
                        {reason}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={() => handleReject(selected.id)} disabled={rejectionReasons.length === 0} className="px-6 py-2 h-[fit-content] bg-destructive text-destructive-foreground rounded-lg text-sm font-semibold disabled:opacity-40 transition-opacity whitespace-nowrap">
                  Confirm Decline
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Master-Detail Split */}
        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
          
          {/* Left: Info */}
          <div className="w-full lg:w-1/3 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
            <div className="elevated-card p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{selected.studentName}</h2>
                  <p className="text-sm text-muted-foreground">{selected.studentEmail}</p>
                </div>
              </div>
              <div className="p-4 bg-muted/30 rounded-xl mb-6">
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Applied Position</p>
                <p className="font-medium text-primary">{job?.title}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider font-semibold">AI Match Score</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${selected.resumeScore}%` }} className="h-full bg-primary rounded-full transition-all duration-1000" />
                  </div>
                  <span className="text-lg font-mono font-bold text-primary">{selected.resumeScore}%</span>
                </div>
              </div>
            </div>

            {selected.feedback?.rejectionReasons && (
              <div className="elevated-card p-5 border-destructive/20 bg-destructive/5">
                <h3 className="text-sm font-bold text-destructive flex items-center gap-2 mb-2"><XCircle className="w-4 h-4" /> Feedback Given</h3>
                <ul className="list-disc pl-5 text-sm text-muted-foreground">
                  {selected.feedback.rejectionReasons.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}
          </div>

          {/* Right: Embedded Resume Viewer */}
          <div className="w-full lg:w-2/3 flex flex-col elevated-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between bg-card/50">
              <h3 className="text-sm font-bold flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Resume PDF</h3>
              {resumeUrl && (
                <a href={resumeUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                  Open in New Tab <Download className="w-3 h-3" />
                </a>
              )}
            </div>
            <div className="flex-1 relative bg-black/10">
              {loadingResume ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-10 h-10 animate-spin text-primary" />
                </div>
              ) : resumeUrl ? (
                <iframe 
                  src={`https://docs.google.com/gview?url=${encodeURIComponent(resumeUrl)}&embedded=true`} 
                  className="w-full h-full border-0" 
                  title="Resume Document"
                  sandbox="allow-scripts allow-same-origin allow-popups"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                  <FileText className="w-16 h-16 mb-4 opacity-20" />
                  <p>No resume PDF found for this applicant.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: LIST VIEW
  // -------------------------------------------------------------
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Applicant Review</h1>
        <p className="text-muted-foreground mt-1">Review candidates for your active postings</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search candidates by name, email, or job title..."
          className="glass-input w-full pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="elevated-card p-16 text-center">
            <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-bold mb-1">No applicants found</h3>
            <p className="text-muted-foreground text-sm">Candidates who apply to your jobs will appear here.</p>
          </div>
        ) : (
          filtered.map((app, i) => {
            const job = jobs.find(j => j.id === app.jobId);
            return (
              <motion.button
                key={app.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => handleSelectCandidate(app)}
                className="w-full text-left p-5 rounded-xl elevated-card flex items-center gap-5 group hover:border-primary/30 hover:bg-card/80 transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-base truncate">{app.studentName}</p>
                  <p className="text-sm text-primary font-medium truncate mb-0.5">{job?.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{app.studentEmail}</p>
                </div>
                
                <div className="text-right flex flex-col items-end gap-2 flex-shrink-0">
                  <span className={`text-xs px-3 py-1 rounded-full font-bold ${
                    app.status === 'approved' || app.status === 'selected' ? 'bg-success/20 text-success' :
                    app.status === 'rejected' ? 'bg-destructive/20 text-destructive' :
                    'bg-warning/20 text-warning'
                  }`}>
                    {app.status.toUpperCase()}
                  </span>
                  <p className="text-xs font-mono font-bold text-foreground/70">SCORE: {app.resumeScore}%</p>
                </div>
              </motion.button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ApplicantReview;

