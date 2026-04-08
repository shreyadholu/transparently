import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp, Application } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';
import { ResumeViewerModal } from '@/components/ResumeViewerModal';
import { StatusBadge } from '@/components/StatusBadge';
import { ListSkeleton } from '@/components/LoadingSkeleton';
import {
  User, CheckCircle2, XCircle, FileText, Search, Shield,
  ArrowLeft, Loader2, Download, Eye, SlidersHorizontal,
  MessageSquare, Send, ChevronDown, Award, Target, GraduationCap, TrendingUp, Briefcase, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

const REJECTION_REASONS = [
  'Skills Gap',
  'Experience Gap',
  'Low ATS Match',
  'Culture Alignment',
  'Location Conflict',
  'Education Gap',
];

const ApplicantReview = () => {
  const { applications, jobs, user, reviewApplication, updateApplicationStatus, addRecruiterNote, fetchRecruiterNotes, isSyncing } = useApp();
  const [selected, setSelected] = useState<Application | null>(null);
  const [rejectionReasons, setRejectionReasons] = useState<string[]>([]);
  const [showRejectMenu, setShowRejectMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [loadingResume, setLoadingResume] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [candidateSkills, setCandidateSkills] = useState<string[]>([]);
  const [candidateEducation, setCandidateEducation] = useState<{ degree?: string, university?: string } | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterMinScore, setFilterMinScore] = useState<number>(0);
  const [showFilters, setShowFilters] = useState(false);

  // Recruiter notes
  const [noteText, setNoteText] = useState('');
  const [notes, setNotes] = useState<any[]>([]);
  const [savingNote, setSavingNote] = useState(false);

  // Focus on my jobs' applications
  const myJobIds = jobs.filter(j => j.created_by === user?.id || !j.created_by).map(j => j.id);

  const filtered = applications.filter(app => {
    if (!myJobIds.includes(app.jobId)) return false;
    if (!app.studentName || app.studentName.trim() === '') return false;

    // Status filter
    if (filterStatus !== 'all' && app.status !== filterStatus) return false;
    // Score filter
    if (app.resumeScore < filterMinScore) return false;

    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const job = jobs.find(j => j.id === app.jobId);
    return app.studentName.toLowerCase().includes(q) ||
      app.studentEmail.toLowerCase().includes(q) ||
      (job && job.title.toLowerCase().includes(q));
  }).sort((a, b) => b.resumeScore - a.resumeScore); // Sort by score desc

  const handleSelectCandidate = async (app: Application) => {
    setSelected(app);
    setRejectionReasons([]);
    setShowRejectMenu(false);
    setResumeUrl(null);
    setCandidateSkills([]);
    setCandidateEducation(null);
    setLoadingResume(true);

    try {
      // Fetch profile data including skills (using new skills column)
      const { data: profileData } = await supabase
        .from('student_profiles')
        .select('resume_url, degree, university, skills')
        .eq('user_id', app.studentId)
        .single();

      if (profileData?.resume_url) setResumeUrl(profileData.resume_url);
      if (profileData?.degree || profileData?.university) {
        setCandidateEducation({ degree: profileData.degree, university: profileData.university });
      }
      
      // Use skills from the profile column directly
      setCandidateSkills(profileData?.skills || []);

      // Fetch notes
      const fetchedNotes = await fetchRecruiterNotes(app.id);
      setNotes(fetchedNotes);
    } catch (err) {
      console.error('Error fetching candidate data:', err);
    } finally {
      setLoadingResume(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      toast.error('Invalid application ID');
      return;
    }
    try {
      await updateApplicationStatus(id, 'selected');
      reviewApplication(id, 'selected');
      toast.success('Candidate approved!');
    } catch (err) { console.error(err); }
  };

  const handleAdvanceStage = async (id: string, nextStatus: 'screened' | 'shortlisted' | 'interview') => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      toast.error('Invalid application ID');
      return;
    }
    await updateApplicationStatus(id, nextStatus);
    toast.success(`Application moved to ${nextStatus}`);
  };

  const handleReject = async (id: string) => {
    if (rejectionReasons.length === 0) return;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      toast.error('Invalid application ID');
      return;
    }

    try {
      setSavingNote(true);
      const { error: appError } = await supabase.from('applications').update({ status: 'rejected' }).eq('id', id);
      if (appError) { toast.error('Failed to update status.'); return; }

      await supabase.from('application_feedback').insert([{
        application_id: id,
        recruiter_notes: rejectionReasons.join(', ')
      }]);

      // Update the local state of the selected student
      setSelected(prev => prev ? { ...prev, status: 'rejected', feedback: { ...prev.feedback, rejectionReasons } } : null);
      
      // Update the parent state if necessary through a re-fetch (optional, but good for sync)
      // fetchApplicants(); 
      
      setShowRejectMenu(false);
      setSavingNote(false);
      toast.success('Application declined with feedback.');
    } catch (err) {
      setSavingNote(false);
      toast.error('An unexpected error occurred.');
      console.error(err);
    }
  };

  const handleSaveNote = async () => {
    if (!noteText.trim() || !selected) return;
    setSavingNote(true);
    await addRecruiterNote(selected.studentId, selected.id, noteText.trim());
    const updatedNotes = await fetchRecruiterNotes(selected.id);
    setNotes(updatedNotes);
    setNoteText('');
    setSavingNote(false);
    toast.success('Note saved');
  };

  const toggleReason = (reason: string) => {
    setRejectionReasons(prev => prev.includes(reason) ? prev.filter(r => r !== reason) : [...prev, reason]);
  };

  const getNextStage = (status: string): { label: string; value: 'screened' | 'shortlisted' | 'interview' } | null => {
    const map: Record<string, { label: string; value: 'screened' | 'shortlisted' | 'interview' }> = {
      applied: { label: 'Move to Screened', value: 'screened' },
      screened: { label: 'Shortlist', value: 'shortlisted' },
      shortlisted: { label: 'Schedule Interview', value: 'interview' },
    };
    return map[status] || null;
  };

  // ── Loading state ──
  if (isSyncing) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-3xl font-bold">Applicant Review</h1></div>
        <ListSkeleton rows={5} />
      </div>
    );
  }

  // ── Detail View ──
  if (selected) {
    const job = jobs.find(j => j.id === selected.jobId);
    const nextStage = getNextStage(selected.status);
    const isActionable = ['applied', 'screened', 'shortlisted', 'interview'].includes(selected.status);

    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        {/* Resume Modal */}
        {resumeUrl && (
          <ResumeViewerModal
            isOpen={showResumeModal}
            onClose={() => setShowResumeModal(false)}
            resumeUrl={resumeUrl}
            candidateName={selected.studentName}
          />
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-all">
               <ArrowLeft className="w-4 h-4" />
            </div>
            Back to Applicants
          </button>
          <div className="flex gap-2">
            {isActionable && (
              <>
                {nextStage && (
                  <button onClick={() => handleAdvanceStage(selected.id, nextStage.value)} className="px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-primary/20 transition-colors">
                    <Award className="w-4 h-4" /> {nextStage.label}
                  </button>
                )}
                {selected.status === 'interview' && (
                  <button onClick={() => handleApprove(selected.id)} className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-colors">
                    <Shield className="w-4 h-4" /> Select Candidate
                  </button>
                )}
                <button onClick={() => setShowRejectMenu(!showRejectMenu)} className="px-4 py-2 bg-destructive text-destructive-foreground rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-destructive/20 hover:bg-destructive/90 transition-colors">
                  <XCircle className="w-4 h-4" /> Decline
                </button>
              </>
            )}
            {!isActionable && (
              <StatusBadge status={selected.status} size="md" />
            )}
          </div>
        </div>

        {/* Rejection Prominent Banner */}
        {selected.status === 'rejected' && (
           <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-destructive/10 border border-destructive/20 rounded-2xl p-6 flex items-center justify-between shadow-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-64 bg-destructive/5 rounded-full -translate-y-16 translate-x-16 rotate-12" />
             <div className="flex items-center gap-5 relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-destructive text-white flex items-center justify-center shadow-lg shadow-destructive/20 rotate-3">
                  <XCircle className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-destructive uppercase tracking-widest leading-none">Application Declined</h3>
                  <p className="text-xs font-bold text-destructive/70 mt-2 uppercase tracking-wide opacity-80">This candidate has been removed from the pipeline.</p>
                </div>
             </div>
             <div className="hidden md:flex flex-col items-end relative z-10">
                <span className="text-[10px] font-black text-destructive uppercase tracking-[0.2em] opacity-40">Decision Persisted</span>
                <span className="text-sm font-bold text-destructive">Manual Recruiter Action</span>
             </div>
           </motion.div>
        )}

        {/* Reject Menu */}
        <AnimatePresence>
          {showRejectMenu && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="bg-card border border-destructive/30 rounded-xl p-4 flex flex-col md:flex-row md:items-end gap-4">
                <div className="flex-1">
                  <p className="text-sm font-bold text-destructive mb-3 uppercase tracking-wider flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Select Primary Reasons for Decline:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {REJECTION_REASONS.map(reason => (
                      <button key={reason} onClick={() => toggleReason(reason)} className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                        rejectionReasons.includes(reason) ? 'bg-destructive/10 text-destructive border-destructive/30 shadow-inner' : 'bg-muted/50 text-muted-foreground border-border hover:border-destructive/20'
                      }`}>
                        {reason}
                      </button>
                    ))}
                  </div>
                </div>
                <button 
                  onClick={() => handleReject(selected.id)} 
                  disabled={rejectionReasons.length === 0 || savingNote} 
                  className="px-8 py-3 bg-destructive text-destructive-foreground rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl shadow-destructive/20 disabled:opacity-30 self-end transition-all active:scale-95"
                >
                  {savingNote ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Confirm Decline"}
                </button>
              </div>
            </motion.div>

          )}
        </AnimatePresence>

        {/* 1. Top Header: Personal Info (No Score) */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-16">
            {/* Name & Email */}
            <div className="flex items-center gap-4 min-w-[240px]">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <User className="w-7 h-7 text-primary" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-bold truncate leading-tight">{selected.studentName}</h2>
                <p className="text-sm text-muted-foreground truncate font-medium">{selected.studentEmail}</p>
              </div>
            </div>

            {/* Position */}
            <div className="flex flex-col gap-1 min-w-[200px] lg:border-l lg:pl-10 border-border/50">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] opacity-50 mb-1">Position Applied</p>
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary shrink-0" />
                <span className="font-bold text-sm text-foreground/90 truncate">{job?.title}</span>
              </div>
              <p className="text-xs text-muted-foreground font-medium truncate pl-6">{job?.company}</p>
            </div>

            {/* Education */}
            <div className="flex flex-col gap-1 min-w-[200px] lg:border-l lg:pl-10 border-border/50">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] opacity-50 mb-1">Education</p>
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-accent shrink-0" />
                <span className="font-bold text-sm text-foreground/90 truncate">
                  {candidateEducation?.degree || 'No Degree Listed'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-medium truncate pl-6">
                {candidateEducation?.university || 'No University Listed'}
              </p>
            </div>
          </div>
        </div>

        {/* 2. Middle Row: ATS Score (Left) & Skills (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ATS Score (Left - 4 columns) */}
          <div className="lg:col-span-4 bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-4 flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-primary" /> Profile Match
            </h3>
            <div className="flex items-center gap-6 py-2">
              <div className="relative w-20 h-20 shrink-0">
                <svg viewBox="0 0 80 80" className="-rotate-90 w-20 h-20">
                  <circle cx="40" cy="40" r="32" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/10" />
                  <motion.circle 
                    cx="40" cy="40" r="32" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeDasharray={201} 
                    initial={{ strokeDashoffset: 201 }} 
                    animate={{ strokeDashoffset: 201 - (selected.resumeScore / 100) * 201 }} 
                    transition={{ duration: 1.2, ease: 'circOut' }} 
                    className="text-primary"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl font-black text-primary leading-none">{selected.resumeScore}</span>
                  <span className="text-[9px] font-bold text-primary mt-0.5 opacity-70">%</span>
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground leading-tight mb-1">{selected.resumeScore >= 70 ? 'High Compatibility' : selected.resumeScore >= 40 ? 'Moderate Match' : 'Potential Gap'}</p>
                <p className="text-[11px] text-muted-foreground font-medium leading-relaxed opacity-80">AI-driven assessment of candidate experience vs role requirements.</p>
              </div>
            </div>
          </div>

          {/* Skills (Right - 8 columns) */}
          <div className="lg:col-span-8 bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col">
            <div className="px-6 py-3.5 border-b border-border/50 flex items-center justify-between bg-muted/5">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-2">
                <Target className="w-3.5 h-3.5 text-secondary" /> Detected Industry Keywords
              </h3>
              <span className="text-[9px] font-bold bg-secondary/10 text-secondary px-2 py-0.5 rounded-md border border-secondary/20">
                {candidateSkills.length} Total
              </span>
            </div>
            <div className="p-6">
              {candidateSkills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {candidateSkills.map(s => {
                    const isMatch = job?.skills.some(js => js.toLowerCase() === s.toLowerCase());
                    return (
                      <span key={s} className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${
                        isMatch 
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-sm' 
                          : 'bg-muted/30 text-muted-foreground/70 border-border/60'
                      }`}>
                        {s} {isMatch && '✓'}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground font-medium italic opacity-60">No skills parsed from document.</p>
              )}
            </div>
          </div>
        </div>

        {/* 3. Bottom Row: Feedback (Left) & Resume (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Candidate Feedback (Left - 8 columns) */}
          <div className="lg:col-span-8 bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col">
            <div className="px-6 py-3.5 border-b border-border/50 flex items-center justify-between bg-accent/5">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-accent" /> Recruiter Feedback Portal
              </h3>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-accent/10 border border-accent/20">
                 <Shield className="w-3 h-3 text-accent" />
                 <span className="text-[9px] font-bold text-accent uppercase tracking-tighter">Shared with Student</span>
              </div>
            </div>
            <div className="p-6">
              <div className="flex gap-2 mb-6">
                <input
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveNote()}
                  placeholder="Type your feedback message here..."
                  className="glass-input flex-1 px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-accent/20 transition-all shadow-inner"
                />
                <button
                  onClick={handleSaveNote}
                  disabled={!noteText.trim() || savingNote}
                  className="px-5 py-2.5 bg-accent text-accent-foreground rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-40 transition-all shadow-md active:scale-95 group"
                >
                  <Send className="w-3.5 h-3.5 text-white group-hover:translate-x-0.5 transition-transform" /> <span className="text-white">Post</span>
                </button>
              </div>
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
                {notes.length > 0 ? notes.map(note => (
                  <div key={note.id} className="p-4 rounded-xl bg-muted/20 border border-border/40 hover:border-accent/20 transition-all">
                    <p className="text-sm font-medium text-foreground/80 leading-relaxed italic">"{note.note}"</p>
                    <div className="flex items-center justify-between mt-3 opacity-50">
                       <span className="text-[9px] font-black uppercase tracking-widest">Global Talent Team</span>
                       <span className="text-[9px] font-bold uppercase">
                        {new Date(note.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                )) : (
                   <div className="py-12 text-center opacity-30">
                     <MessageSquare className="w-10 h-10 mx-auto mb-2" />
                     <p className="text-xs font-bold uppercase tracking-widest">No Feedback Shared Yet</p>
                   </div>
                )}
              </div>
            </div>
          </div>

          {/* Resume Viewer (Right - 4 columns) */}
          <div className="lg:col-span-4 flex flex-col space-y-4">
            <div className="bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5 border border-primary/20 rounded-2xl p-6 flex flex-col items-center justify-center text-center flex-1 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -translate-y-12 translate-x-12 blur-2xl" />
              <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center border border-primary/10 mb-5 shadow-sm group-hover:scale-110 transition-transform">
                <FileText className="w-7 h-7 text-primary" />
              </div>
              <h4 className="text-base font-bold text-foreground mb-1.5 leading-tight">Professional Resume</h4>
              <p className="text-[11px] text-muted-foreground font-medium mb-6 leading-relaxed px-2 opacity-80 italic">
                Verified candidate document. Review for full project history and credentials.
              </p>
              {loadingResume ? (
                <div className="py-4">
                   <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : resumeUrl ? (
                <button
                  onClick={() => setShowResumeModal(true)}
                  className="w-full py-3.5 rounded-xl bg-primary text-white text-xs font-black flex items-center justify-center gap-2.5 hover:shadow-lg hover:shadow-primary/20 transition-all transform active:scale-95 uppercase tracking-[0.1em]"
                >
                  <Eye className="w-4 h-4" /> Open Preview
                </button>
              ) : (
                <div className="py-4 px-4 bg-muted/30 rounded-lg border border-dashed border-border w-full">
                   <p className="text-[10px] font-bold text-muted-foreground uppercase">File Unattainable</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // ── List View ──
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Applicant Review</h1>
        <p className="text-muted-foreground mt-1 text-sm">Review candidates for your active postings</p>
      </div>

      {/* Search + Filter Bar */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, or job..."
              className="glass-input w-full pl-10 pr-4 py-2.5 text-sm focus:outline-none"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors border ${
              showFilters ? 'bg-primary/10 text-primary border-primary/30' : 'bg-card text-muted-foreground border-border hover:border-primary/30'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" /> Filters
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="bg-card border border-border rounded-xl p-4 flex flex-wrap gap-4 items-end">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Status</label>
                  <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className="glass-input px-3 py-2 text-sm appearance-none pr-8 min-w-[140px]"
                  >
                    <option value="all">All Statuses</option>
                    <option value="applied">Applied</option>
                    <option value="screened">Screened</option>
                    <option value="shortlisted">Shortlisted</option>
                    <option value="interview">Interview</option>
                    <option value="selected">Selected</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Min Score</label>
                  <input
                    type="number"
                    min={0} max={100}
                    value={filterMinScore}
                    onChange={e => setFilterMinScore(Number(e.target.value))}
                    className="glass-input px-3 py-2 text-sm w-24"
                    placeholder="0"
                  />
                </div>
                <button
                  onClick={() => { setFilterStatus('all'); setFilterMinScore(0); }}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Clear filters
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {(searchQuery || filterStatus !== 'all' || filterMinScore > 0) && (
          <p className="text-xs text-muted-foreground">
            Showing {filtered.length} of {applications.filter(a => myJobIds.includes(a.jobId)).length} applicants
          </p>
        )}
      </div>

      {/* Applicant List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-16 text-center">
            <FileText className="w-14 h-14 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-bold mb-1">No applicants found</h3>
            <p className="text-muted-foreground text-sm">Candidates who apply to your jobs will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-12">
            {filtered.map((app, i) => {
              const job = jobs.find(j => j.id === app.jobId);
              return (
                <motion.button
                  key={app.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -4, scale: 1.01 }}
                  onClick={() => handleSelectCandidate(app)}
                  className="text-left bg-card border border-border shadow-sm rounded-2xl p-6 hover:border-primary/40 hover:shadow-md transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-3">
                    <StatusBadge status={app.status} size="sm" />
                  </div>

                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300 transform group-hover:rotate-3 shadow-inner">
                      <User className="w-7 h-7" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors truncate">
                        {app.studentName}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate font-semibold uppercase tracking-wider opacity-70">
                        {app.studentEmail}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1.5 opacity-60">
                         Applied For
                      </div>
                      <div className="flex items-center gap-2 text-sm text-foreground/90 font-bold truncate">
                        <Briefcase className="w-4 h-4 text-primary" />
                        {job?.title || 'Unknown Position'}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 py-1">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] opacity-40">Match Score</span>
                          <span className="text-sm font-black text-primary">{app.resumeScore}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden border border-border/30">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${app.resumeScore}%` }}
                            className="h-full bg-primary"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                         <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.15em] opacity-40 mb-1">Applied</span>
                         <span className="text-[10px] font-bold text-foreground/70">{new Date(app.appliedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-5 border-t border-dashed border-border/50 flex items-center justify-center w-full py-2 bg-primary/5 rounded-xl text-[11px] font-black text-primary uppercase tracking-[0.05em] group-hover:bg-primary group-hover:text-white transition-all duration-300 cursor-pointer">
                     Review Details
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ApplicantReview;
