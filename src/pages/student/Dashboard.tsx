import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import ResumeScoreRing from '@/components/ResumeScoreRing';
import {
  FileText, Target, Briefcase, Upload, Shield,
  Type, Search, Loader2, AlertCircle, CheckCircle2, XCircle,
  Lightbulb, ExternalLink, RefreshCw, TrendingUp
} from 'lucide-react';

// ─── Animation variants ───────────────────────────────────────────────────────
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item      = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 200, damping: 20 } } };

// ─── ATS Grade helper ────────────────────────────────────────────────────────
function getGrade(score: number): { label: string; colorClass: string; bgClass: string } {
  if (score >= 90) return { label: 'Excellent', colorClass: 'text-success', bgClass: 'bg-success/10' };
  if (score >= 70) return { label: 'Good',      colorClass: 'text-primary', bgClass: 'bg-primary/10' };
  if (score >= 50) return { label: 'Average',   colorClass: 'text-warning', bgClass: 'bg-warning/10' };
  return { label: 'Needs Work', colorClass: 'text-destructive', bgClass: 'bg-destructive/10' };
}

// ─── Component ────────────────────────────────────────────────────────────────
const StudentDashboard = () => {
  const { user, applications, jobs, handleFileUpload, isAnalyzing, resumeAnalysisResult, aiAnalysis, detectedSkills, hasProfile, isSyncing, resumeProfile } = useApp();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localResumeUrl, setLocalResumeUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Fetch resume_url for current user (for preview)
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('student_profiles')
      .select('resume_url')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.resume_url) setLocalResumeUrl(data.resume_url);
      });
  }, [user?.id, hasProfile]);

  // ─── Derived display values ───────────────────────────────────────────────
  const resumeScore = aiAnalysis?.overall_score ?? resumeAnalysisResult?.resume_health.overall_score ?? resumeProfile?.resume_score ?? 0;
  const contactScore = aiAnalysis?.contact_info_score ?? resumeAnalysisResult?.structural_integrity.contact_info_score ?? resumeProfile?.contact_score ?? 0;
  const experienceScore = aiAnalysis?.experience_score ?? resumeAnalysisResult?.structural_integrity.experience_headers_score ?? resumeProfile?.experience_score ?? 0;
  const keywordScore = aiAnalysis?.keyword_score ?? resumeAnalysisResult?.structural_integrity.keyword_density_score ?? resumeProfile?.keyword_score ?? 0;
  const skillCoverageScore = aiAnalysis?.skill_coverage_score ?? resumeProfile?.skill_coverage_score ?? 0;

  const displaySkills = (aiAnalysis?.skills && aiAnalysis.skills.length > 0) ? aiAnalysis.skills : detectedSkills.length > 0 ? detectedSkills : user?.skills ?? [];
  const strengths  = aiAnalysis?.strengths ?? resumeProfile?.strengths ?? [];
  const weakAreas  = aiAnalysis?.weak_areas ?? resumeProfile?.weak_areas ?? [];
  const tips       = aiAnalysis?.feedback.suggestions ?? resumeProfile?.improvement_tips ?? [];
  const critIssue  = aiAnalysis?.feedback.critical_issue ?? resumeProfile?.critical_issue ?? null;
  const resumeUrl  = localResumeUrl;

  const grade = getGrade(resumeScore);
  const appliedCount  = applications.filter(a => a.studentEmail === user?.email).length;
  const approvedCount = applications.filter(a => a.studentEmail === user?.email && (a.status === 'approved' || a.status === 'selected')).length;
  const pendingCount  = applications.filter(a => a.studentEmail === user?.email && (a.status === 'pending' || a.status === 'under_review')).length;
  const hasResume = hasProfile || user?.resumeUploaded;

  // ─── File upload handler ──────────────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    const result = await handleFileUpload(file);
    if (!result.success) {
      setUploadError(result.error || 'Upload failed. Please try again.');
    } else {
      supabase
        .from('student_profiles')
        .select('resume_url')
        .eq('user_id', user?.id)
        .single()
        .then(({ data }) => { if (data?.resume_url) setLocalResumeUrl(data.resume_url); });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ─── Loading state ────────────────────────────────────────────────────────
  if (isSyncing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-muted-foreground text-sm font-medium">Loading your profile...</p>
      </div>
    );
  }

  const stats = [
    { icon: Briefcase, label: 'Available Jobs', value: jobs.length, onClick: () => navigate('/student/jobs') },
    { icon: FileText,  label: 'Applications',   value: appliedCount, onClick: () => navigate('/student/activity') },
    { icon: Target,    label: 'Shortlisted',    value: approvedCount, onClick: undefined },
    { icon: Shield,    label: 'Under Review',   value: pendingCount, onClick: undefined },
  ];

  // ════════════════════════════════════════════════════════════════════════════
  // EMPTY STATE — No resume uploaded
  // ════════════════════════════════════════════════════════════════════════════
  if (!hasResume && !resumeAnalysisResult && !aiAnalysis) {
    return (
      <motion.div variants={container} initial="hidden" animate="show" className="max-w-5xl mx-auto space-y-8">
        <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />

        <motion.div variants={item} className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome, {user?.name}</h1>
          <p className="text-muted-foreground">Upload your resume to begin your career journey.</p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} onClick={s.onClick} className={`p-4 rounded-xl bg-card border border-border shadow-sm flex items-center gap-4 transition-colors ${s.onClick ? 'cursor-pointer hover:border-primary/50' : ''}`}>
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <s.icon className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{s.label}</p>
                <p className="text-xl font-bold text-foreground">{s.value}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Upload card */}
        <motion.div variants={item} className="bg-card border border-border shadow-sm rounded-2xl p-8 lg:p-12 flex flex-col items-center text-center mt-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
            <Upload className="w-8 h-8 text-primary" />
          </div>

          <h2 className="text-2xl font-semibold mb-2 text-foreground">Upload your Resume</h2>
          <p className="text-muted-foreground mb-8 max-w-md">
            Our AI ATS scanner will extract your skills, score your formatting, and provide professional suggestions to improve your chances.
          </p>

          {uploadError && (
            <div className="mb-6 w-full max-w-md p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3 text-sm text-destructive font-medium text-left">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{uploadError}</span>
            </div>
          )}

          {isAnalyzing ? (
            <div className="w-full max-w-md py-12 border-2 border-dashed border-primary/30 bg-primary/5 rounded-xl flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">Analyzing with AI...</p>
                <p className="text-xs text-muted-foreground mt-1">Extracting keywords and calculating your score</p>
              </div>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full max-w-md py-12 border-2 border-dashed border-border hover:border-primary hover:bg-muted/50 rounded-xl flex flex-col items-center gap-3 transition-all duration-200 group"
            >
              <div className="w-10 h-10 rounded-full bg-background border border-border shadow-sm flex items-center justify-center group-hover:scale-105 transition-transform">
                <Upload className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Click or drag PDF to upload</p>
                <p className="text-xs text-muted-foreground mt-1">Maximum file size 5MB</p>
              </div>
            </button>
          )}
        </motion.div>
      </motion.div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ACTIVE STATE — Full Dashboard
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="max-w-6xl mx-auto space-y-6 pb-12">
      <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Review your ATS score, detected skills, and feedback.</p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isAnalyzing}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-colors disabled:opacity-50 border border-border"
        >
          {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {isAnalyzing ? 'Analyzing...' : 'Update Resume'}
        </button>
      </motion.div>

      {/* Upload error */}
      {uploadError && (
        <motion.div variants={item} className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3 text-sm text-destructive font-medium">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{uploadError}</span>
        </motion.div>
      )}

      {/* Analyzing indicator */}
      {isAnalyzing && (
        <motion.div variants={item} className="p-4 rounded-lg bg-primary/10 border border-primary/20 flex items-center gap-4">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground">AI Intelligence is currently scanning your new document...</p>
            <p className="text-xs text-muted-foreground mt-1">Updating your profile and ATS score data.</p>
          </div>
        </motion.div>
      )}

      {/* ── Stats row ──────────────────────────────────────────────────── */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} onClick={s.onClick} className={`p-4 rounded-xl bg-card border border-border shadow-sm flex items-center gap-4 transition-colors ${s.onClick ? 'cursor-pointer hover:border-primary/50' : ''}`}>
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <s.icon className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{s.label}</p>
              <p className="text-xl font-bold text-foreground">{s.value}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* ── Grid Layout ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Score & Sub-scores */}
        <motion.div variants={item} className="lg:col-span-4 space-y-6">
          <div className="bg-card border border-border shadow-sm rounded-2xl p-6 flex flex-col items-center">
            <div className="flex items-center justify-between w-full mb-6 relative">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground" /> ATS Score
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${grade.bgClass} ${grade.colorClass} border-current/20`}>
                {grade.label}
              </span>
            </div>
            
            <ResumeScoreRing score={resumeScore} size={160} strokeWidth={12} />
            
            {critIssue && (
              <div className="mt-6 w-full p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-foreground font-medium leading-snug">{critIssue}</p>
              </div>
            )}
            
            {/* Sub-scores */}
            <div className="mt-8 w-full space-y-4">
              {[
                { label: 'Contact Info', score: contactScore },
                { label: 'Experience Details', score: experienceScore },
                { label: 'Keyword Density', score: keywordScore },
                { label: 'Skill Coverage', score: skillCoverageScore },
              ].map((m, i) => (
                <div key={m.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-muted-foreground">{m.label}</span>
                    <span className="text-xs font-bold text-foreground">{m.score}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${m.score}%` }}
                      transition={{ duration: 1, ease: 'easeOut', delay: 0.2 + i * 0.1 }}
                      className="h-full rounded-full bg-primary"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Right Column: Skills, Strengths, Weaknesses, Tips */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Skills Grid */}
          <motion.div variants={item} className="bg-card border border-border shadow-sm rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Search className="w-4 h-4 text-muted-foreground" /> Extracted Technical Skills
              </h2>
              <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-muted text-foreground">
                {displaySkills.length} Detected
              </span>
            </div>
            
            {displaySkills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {displaySkills.map((skill) => (
                  <span key={skill} className="inline-flex items-center text-xs font-medium px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground border border-border">
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-border rounded-xl">
                <p className="text-sm font-medium text-foreground">No technical skills detected</p>
                <p className="text-xs text-muted-foreground mt-1">Ensure your resume contains recognizable industry keywords.</p>
              </div>
            )}
          </motion.div>

          {/* Audit Layout: Strengths & Weaknesses side-by-side */}
          {(strengths.length > 0 || weakAreas.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.div variants={item} className="bg-card border border-border shadow-sm rounded-2xl p-6">
                <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success" /> Key Strengths
                </h2>
                <ul className="space-y-3">
                  {strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-success flex-shrink-0 mt-2" />
                      <span className="text-foreground">{s}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>

              <motion.div variants={item} className="bg-card border border-border shadow-sm rounded-2xl p-6">
                <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-destructive" /> Areas for Improvement
                </h2>
                <ul className="space-y-3">
                  {weakAreas.map((w, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-destructive flex-shrink-0 mt-2" />
                      <span className="text-foreground">{w}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>
          )}

          {/* Actionable Tips */}
          {tips.length > 0 && (
            <motion.div variants={item} className="bg-card border border-border shadow-sm rounded-2xl p-6">
              <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-warning" /> Actionable AI Recommendations
              </h2>
              <div className="space-y-3">
                {tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 rounded-xl border border-border bg-muted/30">
                    <div className="w-6 h-6 rounded-md bg-background border border-border flex items-center justify-center flex-shrink-0 text-xs font-bold text-foreground">
                      {i + 1}
                    </div>
                    <p className="text-sm text-foreground leading-relaxed pt-0.5">{tip}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Resume Preview */}
          {resumeUrl && (
            <motion.div variants={item} className="bg-card border border-border shadow-sm rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" /> Document Preview
                </h2>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowPreview(v => !v)}
                    className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
                  >
                    {showPreview ? 'Collapse Preview' : 'Expand Preview'}
                  </button>
                  <a
                    href={resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open PDF
                  </a>
                </div>
              </div>

              <AnimatePresence>
                {showPreview && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="rounded-xl overflow-hidden border border-border bg-muted h-[600px] mt-2">
                      <iframe src={`${resumeUrl}#toolbar=0`} className="w-full h-full border-none" title="Resume Document" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

        </div>
      </div>
    </motion.div>
  );
};

export default StudentDashboard;
