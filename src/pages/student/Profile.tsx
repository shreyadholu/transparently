import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';
import {
  Upload, Plus, X, UserCircle, FileText, CheckCircle2,
  Loader2, AlertCircle, File, CloudUpload, Sparkles
} from 'lucide-react';

const Profile = () => {
  const { user, updateSkills, handleFileUpload, isAnalyzing, aiAnalysis, detectedSkills } = useApp();

  const [newSkill, setNewSkill] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Education form fields (saved separately to Supabase)
  const [education, setEducation] = useState('');
  const [university, setUniversity] = useState('');
  const [cgpa, setCgpa] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Load existing education data
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('student_profiles')
      .select('education, university, cgpa')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setEducation(data.education || '');
          setUniversity(data.university || '');
          setCgpa(data.cgpa ? String(data.cgpa) : '');
        }
      });
  }, [user?.id]);

  // Skills — prefer detected skills from context
  const displaySkills = detectedSkills.length > 0 ? detectedSkills : user?.skills ?? [];

  const handleAddSkill = () => {
    if (!newSkill.trim() || !user) return;
    const updated = [...new Set([...displaySkills, newSkill.trim()])];
    updateSkills(updated);
    setNewSkill('');
  };

  const handleRemoveSkill = (skill: string) => {
    if (!user) return;
    updateSkills(displaySkills.filter(s => s !== skill));
  };

  // ─── Drag + Drop ─────────────────────────────────────────────────────────
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  }, []);

  const processFile = async (file: File) => {
    setError(null);
    setSuccessMsg(null);
    // Delegate entirely to the AppContext handler (single source of truth)
    const result = await handleFileUpload(file);
    if (result.success) {
      setSuccessMsg('Resume uploaded & analyzed successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } else {
      setError(result.error || 'Upload failed. Please try again.');
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [user, handleFileUpload]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  // ─── Save education info ──────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    if (!user?.id) return;
    setProfileSaving(true);
    const { error: err } = await supabase.from('student_profiles').upsert({
      user_id: user.id,
      education: education || null,
      university: university || null,
      cgpa: cgpa ? parseFloat(cgpa) : null,
    }, { onConflict: 'user_id' });
    setProfileSaving(false);
    if (!err) {
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    }
  };

  const hasResume = user?.resumeUploaded;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <div className="border-b border-border pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">My Profile</h1>
        <p className="text-muted-foreground mt-1 text-sm font-medium">Manage your resume, skills, and personal information below.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Personal Info & Education */}
        <div className="lg:col-span-5 space-y-8">
          {/* User Info Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="elevated-card p-6 border-l-4 border-l-primary relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <UserCircle className="w-32 h-32" />
            </div>
            <div className="flex items-center gap-5 relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-sm">
                <UserCircle className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">{user?.name}</h2>
                <p className="text-muted-foreground text-sm font-medium">{user?.email}</p>
                {hasResume && (
                  <span className="inline-flex items-center gap-1.5 mt-2 text-xs text-success font-bold uppercase tracking-wider bg-success/10 px-2.5 py-1 rounded-md border border-success/20 shadow-sm">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Resume Active
                  </span>
                )}
              </div>
            </div>
          </motion.div>

          {/* Education Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="elevated-card p-7">
            <h3 className="font-semibold mb-6 flex items-center gap-2 pb-3 border-b border-border/50 text-sm uppercase tracking-widest text-muted-foreground">
              <FileText className="w-4 h-4 text-primary" /> Education Details
            </h3>
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">Education Level</label>
                <div className="relative">
                  <select
                    value={education}
                    onChange={(e) => setEducation(e.target.value)}
                    className="glass-input w-full pl-4 pr-10 py-3 text-sm font-medium focus:outline-none appearance-none"
                  >
                    <option value="">Select level...</option>
                    <option value="High School">High School</option>
                    <option value="Associate">Associate Degree</option>
                    <option value="Bachelor">Bachelor's Degree</option>
                    <option value="Master">Master's Degree</option>
                    <option value="PhD">PhD</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">University / Institution</label>
                <input
                  type="text"
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  placeholder="e.g. Stanford University"
                  className="glass-input w-full px-4 py-3 text-sm font-medium focus:outline-none placeholder:text-muted-foreground/50"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">CGPA (0.0 – 4.0)</label>
                <input
                  type="number" step="0.1" min="0" max="4.0"
                  value={cgpa}
                  onChange={(e) => setCgpa(e.target.value)}
                  placeholder="e.g. 3.8"
                  className="glass-input w-full px-4 py-3 text-sm font-medium focus:outline-none placeholder:text-muted-foreground/50"
                />
              </div>
              
              <div className="pt-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSaveProfile}
                  disabled={profileSaving}
                  className="w-full justify-center px-4 py-3.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold tracking-wide shadow-md flex items-center gap-2 disabled:opacity-70 transition-all hover:bg-primary/90 hover:shadow-lg"
                >
                  {profileSaving
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving Details...</>
                    : profileSaved
                      ? <><CheckCircle2 className="w-4 h-4" /> Profile Saved</>
                      : <><CheckCircle2 className="w-4 h-4" /> Save Education Details</>
                  }
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Column: Resume & Skills */}
        <div className="lg:col-span-7 space-y-8">
          {/* Resume Upload Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="elevated-card p-7">
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-border/50">
              <h3 className="font-semibold flex items-center gap-2 text-sm uppercase tracking-widest text-muted-foreground">
                <Upload className="w-4 h-4 text-primary" /> Resume Document
              </h3>
            </div>

            {/* Error / Success banners */}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-semibold flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
                </motion.div>
              )}
              {successMsg && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mb-6 p-4 rounded-xl bg-success/10 border border-success/20 text-success text-sm font-semibold flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> {successMsg}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Drop zone */}
            <label className={`cursor-pointer w-full block transition-all ${dragActive ? 'scale-[1.01]' : ''}`}>
              <input
                type="file" accept=".pdf"
                onChange={handleFileSelect}
                onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                className="hidden"
                disabled={isAnalyzing}
              />
              <motion.div
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                className={`w-full py-12 border-2 border-dashed rounded-2xl flex flex-col items-center gap-5 transition-all duration-300 bg-muted/10 ${
                  dragActive ? 'border-primary bg-primary/5 shadow-inner' : 'border-border hover:border-primary/50 hover:bg-muted/30'
                } ${isAnalyzing ? 'pointer-events-none opacity-70' : ''}`}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-12 h-12 animate-spin text-primary" />
                    <div className="text-center">
                      <p className="text-sm font-bold text-foreground">Analyzing with AI...</p>
                      <p className="text-xs font-medium text-muted-foreground mt-1">Scoring, extracting skills & generating insights</p>
                    </div>
                  </>
                ) : hasResume ? (
                  <>
                    <div className="w-16 h-16 rounded-2xl bg-success/10 border border-success/20 flex items-center justify-center mb-1 shadow-sm">
                      <CheckCircle2 className="w-8 h-8 text-success" />
                    </div>
                    <div className="text-center">
                      <p className="text-base font-bold text-foreground">Resume is uploaded and active</p>
                      <p className="text-sm font-medium text-muted-foreground mt-1.5">Click or drag a new PDF to replace</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-1 shadow-sm">
                      <CloudUpload className="w-8 h-8 text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="text-base font-bold text-foreground transition-colors">Drag & drop your PDF resume</p>
                      <p className="text-sm font-medium text-muted-foreground mt-1.5">or click here to browse files (max 5MB)</p>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 px-3 py-1 bg-background rounded-md text-xs font-bold uppercase tracking-wider text-muted-foreground border border-border shadow-sm">
                      <File className="w-3 h-3" /> PDF format only
                    </div>
                  </>
                )}
              </motion.div>
            </label>

            {/* AI Analysis Sub-card */}
            <AnimatePresence>
              {aiAnalysis && !isAnalyzing && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-8 pt-8 border-t border-border"
                >
                  <h4 className="font-semibold mb-5 flex items-center gap-2 text-sm uppercase tracking-widest text-muted-foreground">
                    <Sparkles className="w-4 h-4 text-accent" /> Analysis Summary
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { label: 'ATS Score',    value: `${aiAnalysis.overall_score}/100`,       color: 'text-primary' },
                      { label: 'Contact',      value: `${aiAnalysis.contact_info_score}%`,      color: 'text-accent'  },
                      { label: 'Experience',   value: `${aiAnalysis.experience_score}%`,        color: 'text-success' },
                      { label: 'Skills Found', value: `${aiAnalysis.skills.length}`,            color: 'text-warning' },
                    ].map(m => (
                      <div key={m.label} className="p-4 rounded-xl bg-muted/20 border border-border/50 flex flex-col items-center justify-center text-center shadow-sm">
                        <p className={`text-xl font-bold tracking-tight ${m.color}`}>{m.value}</p>
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-1">{m.label}</p>
                      </div>
                    ))}
                  </div>
                  {aiAnalysis.feedback.critical_issue && (
                    <div className="mt-5 p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-3 shadow-sm">
                      <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                      <p className="text-sm font-semibold text-destructive leading-relaxed">{aiAnalysis.feedback.critical_issue}</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Skills Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="elevated-card p-7 border-l-4 border-l-secondary">
            <h3 className="font-semibold flex items-center gap-2 text-sm uppercase tracking-widest text-muted-foreground mb-3">
              <Search className="w-4 h-4 text-secondary" /> Technical Skills
            </h3>
            <p className="text-sm font-medium text-muted-foreground mb-6">
              These skills are detected from your resume. You can manually refine this list.
            </p>
            
            <div className="p-5 rounded-xl border border-border bg-muted/10 mb-6 shadow-inner">
              <div className="flex flex-wrap gap-2.5 min-h-[3rem]">
                {displaySkills.map((skill) => (
                  <motion.span
                    key={skill} layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-lg bg-card text-foreground border border-border shadow-sm group hover:border-destructive/30 transition-colors"
                  >
                    {skill}
                    <button
                      onClick={() => handleRemoveSkill(skill)}
                      className="text-muted-foreground group-hover:text-destructive p-0.5 rounded-md transition-colors ml-1"
                      aria-label={`Remove ${skill}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </motion.span>
                ))}
                {displaySkills.length === 0 && (
                  <div className="w-full flex items-center justify-center text-sm font-medium text-muted-foreground my-8">
                    No skills detected. Upload your resume or add them manually.
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
                placeholder="Type a new skill..."
                className="glass-input flex-1 px-4 py-3.5 text-sm font-medium focus:outline-none placeholder:text-muted-foreground/50 rounded-xl"
              />
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={handleAddSkill}
                className="px-6 py-3.5 bg-card border border-border hover:border-primary text-foreground rounded-xl text-sm font-bold tracking-wide shadow-sm flex items-center justify-center gap-2 transition-colors hover:shadow-md"
              >
                <Plus className="w-4 h-4 text-primary" /> Add Skill
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
