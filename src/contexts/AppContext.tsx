import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { analyzeResumeStrict, ResumeAnalysisResult, validateFile, extractActualSkills, checkResumeAuthenticity } from '@/lib/resumeAnalysis';
import { analyzeResumeWithAI, AIResumeAnalysis } from '@/ai/aiResumeAnalyzer';
import { extractTextFromPDF } from '@/lib/pdfExtractor';
import { supabase } from '@/lib/supabase';

// ─── Types ──────────────────────────────────────────────────────────────────
export type Role = 'student' | 'recruiter';

export interface User {
  id?: string;
  name: string;
  email: string;
  role: Role;
  skills: string[];
  resumeScore: number;
  resumeUploaded: boolean;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location?: string;
  salary_min?: number;
  salary_max?: number;
  created_by?: string;
  skills: string[];
  criteria: string;
  postedAt: string;
}

export type ApplicationStatus = 'pending' | 'under_review' | 'selected' | 'approved' | 'rejected';

export interface Application {
  id: string;
  jobId: string;
  studentId: string;     // Added
  studentName: string;
  studentEmail: string;
  studentSkills: string[];
  resumeScore: number;
  status: ApplicationStatus;
  feedback?: FeedbackData;
  appliedAt: string;
}

export interface FeedbackData {
  skillGaps: string[];
  formatScore: number;
  keywordScore: number;
  overallScore: number;
  suggestions: string[];
  rejectionReasons?: string[];
}

// ─── Persisted dashboard data fetched from Supabase ─────────────────────────
export interface ResumeProfileData {
  resume_url: string | null;
  resume_score: number | null;
  contact_score: number | null;
  experience_score: number | null;
  keyword_score: number | null;
  skill_coverage_score: number | null;
  strengths: string[] | null;
  weak_areas: string[] | null;
  improvement_tips: string[] | null;
  critical_issue: string | null;
}

interface AppState {
  user: User | null;
  jobs: Job[];
  applications: Application[];
  isAnalyzing: boolean;
  isSyncing: boolean;
  hasProfile: boolean;                        // ← true if student_profiles row exists
  resumeAnalysisResult: ResumeAnalysisResult | null;
  aiAnalysis: AIResumeAnalysis | null;        // ← full Gemini output (current session)
  resumeProfile: ResumeProfileData | null;    // ← persisted data from Supabase
  detectedSkills: string[];
  resumeUrl: string | null;
  login: (name: string, email: string, role: Role, id?: string) => void;
  logout: () => void;
  addJob: (job: Omit<Job, 'id' | 'postedAt'>) => void;
  deleteJob: (jobId: string) => void;
  applyToJob: (jobId: string) => void;
  reviewApplication: (appId: string, status: 'approved' | 'rejected', rejectionReasons?: string[]) => void;
  updateSkills: (skills: string[]) => void;
  uploadResume: () => void;
  handleFileUpload: (file: File) => Promise<{ success: boolean; error?: string }>;
  clearAnalysis: () => void;
  setDetectedSkills: (skills: string[]) => void;
  syncJobsFromSupabase: () => Promise<void>;
  syncApplicationsFromSupabase: () => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

// ─── Seed jobs ───────────────────────────────────────────────────────────────
const INITIAL_JOBS: Job[] = [
  { id: '1', title: 'Frontend Developer', company: 'TechCorp', location: 'Remote', salary_min: 80000, salary_max: 120000, skills: ['React', 'TypeScript', 'Tailwind CSS', 'React Native'], criteria: '3+ years experience with modern frontend frameworks', postedAt: new Date().toISOString() },
  { id: '2', title: 'Full Stack Engineer', company: 'InnovateLab', location: 'New York, NY', salary_min: 100000, salary_max: 150000, skills: ['Node.js', 'React', 'PostgreSQL', 'Docker'], criteria: 'Experience building scalable web applications', postedAt: new Date().toISOString() },
  { id: '3', title: 'UI/UX Designer', company: 'DesignHub', location: 'San Francisco, CA', salary_min: 90000, salary_max: 130000, skills: ['Figma', 'CSS', 'User Research', 'Prototyping'], criteria: 'Strong portfolio with B2B SaaS experience', postedAt: new Date().toISOString() },
  { id: '4', title: 'Data Scientist', company: 'DataFlow', location: 'Remote', salary_min: 120000, salary_max: 180000, skills: ['Python', 'TensorFlow', 'SQL', 'Statistics'], criteria: 'MS in CS or related field preferred', postedAt: new Date().toISOString() },
];

// ─── Helper ───────────────────────────────────────────────────────────────────
function generateFeedback(studentSkills: string[], jobSkills: string[]): FeedbackData {
  const matchedSkills = studentSkills.filter(s => jobSkills.some(js => js.toLowerCase() === s.toLowerCase()));
  const skillGaps = jobSkills.filter(js => !studentSkills.some(s => s.toLowerCase() === js.toLowerCase()));
  const keywordScore = Math.round((matchedSkills.length / Math.max(jobSkills.length, 1)) * 100);
  const formatScore = Math.floor(Math.random() * 30) + 60;
  const overallScore = Math.round((keywordScore * 0.6 + formatScore * 0.4));
  const suggestions = [
    ...skillGaps.map(s => `Learn ${s} through online courses or projects`),
    overallScore < 70 ? 'Improve resume formatting with action verbs and metrics' : 'Consider adding quantifiable achievements',
    'Build a portfolio project showcasing your skills',
  ].slice(0, 4);
  return { skillGaps, formatScore, keywordScore, overallScore, suggestions };
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try { return JSON.parse(localStorage.getItem('transparently_user') || 'null'); } catch { return null; }
  });

  const [jobs, setJobs] = useState<Job[]>(() => {
    try { return JSON.parse(localStorage.getItem('transparently_jobs') || 'null') || INITIAL_JOBS; } catch { return INITIAL_JOBS; }
  });

  const [applications, setApplications] = useState<Application[]>(() => {
    try { return JSON.parse(localStorage.getItem('transparently_applications') || '[]'); } catch { return []; }
  });

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [resumeAnalysisResult, setResumeAnalysisResult] = useState<ResumeAnalysisResult | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIResumeAnalysis | null>(null);
  const [resumeProfile, setResumeProfile] = useState<ResumeProfileData | null>(null);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [detectedSkills, setDetectedSkills] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('transparently_detected_skills') || '[]'); } catch { return []; }
  });

  // Persist user and jobs to localStorage
  useEffect(() => {
    if (user) localStorage.setItem('transparently_user', JSON.stringify(user));
    else localStorage.removeItem('transparently_user');
  }, [user]);
  useEffect(() => { localStorage.setItem('transparently_jobs', JSON.stringify(jobs)); }, [jobs]);
  useEffect(() => { localStorage.setItem('transparently_applications', JSON.stringify(applications)); }, [applications]);
  useEffect(() => { localStorage.setItem('transparently_detected_skills', JSON.stringify(detectedSkills)); }, [detectedSkills]);

  // ─── On Login: Check for existing profile & restore dashboard data ──────────
  useEffect(() => {
    if (!user?.id) return;

    const fetchProfileData = async () => {
      setIsSyncing(true);
      try {
        // 1. Check student_profiles (profile check on login)
        const { data: profile, error: profileErr } = await supabase
          .from('student_profiles')
          .select('resume_url, resume_score, contact_score, experience_score, keyword_score, skill_coverage_score, strengths, weak_areas, improvement_tips, critical_issue')
          .eq('user_id', user.id)
          .single();

        if (profileErr && profileErr.code !== 'PGRST116') {
          console.error('Profile fetch error:', profileErr.message);
        }

        if (profile && profile.resume_url) {
          // Profile EXISTS → restore state
          setHasProfile(true);
          setResumeProfile(profile as ResumeProfileData);
          setResumeUrl(profile.resume_url);
          setUser(prev => prev ? {
            ...prev,
            resumeUploaded: true,
            resumeScore: profile.resume_score || 0,
          } : null);
          console.log('✅ Profile restored from Supabase');
        } else {
          // Profile does NOT exist or has no resume
          setHasProfile(false);
          console.log('ℹ️ No profile found — showing upload screen');
        }

        // 2. Restore skills from skills table
        const { data: skillsData, error: skillsErr } = await supabase
          .from('skills')
          .select('skill_name')
          .eq('user_id', user.id);

        if (skillsErr) {
          console.error('Skills fetch error:', skillsErr.message);
        } else if (skillsData && skillsData.length > 0) {
          const names = skillsData.map(s => s.skill_name as string);
          setDetectedSkills(names);
          setUser(prev => prev ? { ...prev, skills: names } : null);
          console.log('✅ Skills restored:', names.length);
        }
      } catch (err) {
        console.error('Error in fetchProfileData:', err);
      } finally {
        setIsSyncing(false);
      }
    };

    fetchProfileData();
    syncApplicationsFromSupabase();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Auth ────────────────────────────────────────────────────────────────
  const login = (name: string, email: string, role: Role, id?: string) => {
    setUser({ id, name, email, role, skills: [], resumeScore: 0, resumeUploaded: false });
    // Reset session analysis state on each new login
    setAiAnalysis(null);
    setResumeAnalysisResult(null);
    setResumeProfile(null);
    setHasProfile(false);
    setResumeUrl(null);
  };

  const logout = () => {
    setUser(null);
    setAiAnalysis(null);
    setResumeAnalysisResult(null);
    setResumeProfile(null);
    setHasProfile(false);
    setResumeUrl(null);
    setDetectedSkills([]);
  };

  // ─── Jobs ────────────────────────────────────────────────────────────────
  const addJob = (job: Omit<Job, 'id' | 'postedAt'>) =>
    setJobs(prev => [...prev, { ...job, id: Date.now().toString(), postedAt: new Date().toISOString() }]);

  const deleteJob = (jobId: string) => setJobs(prev => prev.filter(j => j.id !== jobId));

  // ─── Applications ─────────────────────────────────────────────────────
  const applyToJob = (jobId: string) => {
    if (!user) return;
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    const feedback = generateFeedback(user.skills, job.skills);
    const app: Application = {
      id: Date.now().toString(), jobId,
      studentId: user.id || '',
      studentName: user.name, studentEmail: user.email,
      studentSkills: user.skills, resumeScore: feedback.overallScore,
      status: 'pending', feedback, appliedAt: new Date().toISOString(),
    };
    setApplications(prev => [...prev, app]);
    setUser(prev => prev ? { ...prev, resumeScore: feedback.overallScore } : null);
  };

  const reviewApplication = (appId: string, status: 'approved' | 'rejected', rejectionReasons?: string[]) => {
    setApplications(prev => prev.map(a =>
      a.id === appId
        ? { ...a, status, feedback: a.feedback ? { ...a.feedback, rejectionReasons: status === 'rejected' ? rejectionReasons : undefined } : undefined }
        : a
    ));
  };

  const updateSkills = (skills: string[]) => setUser(prev => prev ? { ...prev, skills } : null);
  const uploadResume = () => setUser(prev => prev ? { ...prev, resumeUploaded: true } : null);
  const clearAnalysis = () => { setResumeAnalysisResult(null); setIsAnalyzing(false); };

  // ─── ★ MAIN UPLOAD HANDLER (single source of truth) ─────────────────────
  const handleFileUpload = async (file: File): Promise<{ success: boolean; error?: string }> => {
    const validation = validateFile(file);
    if (!validation.valid) return { success: false, error: validation.error };

    // STEP 1: Get current user using: supabase.auth.getUser() OR context state
    // Note: Since this app currently uses a custom 'users' table approach for login,
    // supabase.auth.getUser() will throw an AuthSessionMissingError. We catch and ignore it 
    // if our context user.id exists.
    let authUser = null;
    let authError = null;
    try {
      const { data, error } = await supabase.auth.getUser();
      authUser = data?.user || null;
      authError = error;
    } catch (err) {
      // Ignore
    }
    
    // We MUST use either the authUser.id or the AppContext user.id
    const userId = authUser?.id || user?.id;

    if (!userId) {
      console.error('❌ User Error:', authError || "User not logged in");
      return { success: false, error: 'User not logged in' };
    }

    if (authError && !authUser) {
      console.log('ℹ️ Ignoring Supabase Auth error because custom user.id is present:', userId);
    }

    console.log('👤 user_id:', userId);

    try {
      setIsAnalyzing(true);
      setResumeAnalysisResult(null);
      setAiAnalysis(null);

      // STEP 2: Upload file to Action path
      const filePath = `${userId}/resume.pdf`;
      const { data: uploadResult, error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file, { 
          upsert: true,
          contentType: 'application/pdf'
        });

      if (uploadError) {
        console.error('❌ upload result error:', uploadError);
        return { success: false, error: `Failed to upload: ${uploadError.message}` };
      }
      console.log('✅ upload result:', uploadResult);

      // STEP 3: Get public URL
      const { data: urlData } = supabase.storage.from('resumes').getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;
      console.log('🔗 url:', publicUrl);
      setResumeUrl(publicUrl);

      // ──── STEP 2: Extract text from PDF ─────────────────────────────────
      let resumeText = '';
      try {
        resumeText = await extractTextFromPDF(file);
        console.log('📄 [PDF] Extracted text length:', resumeText.length);
      } catch (pdfErr) {
        console.warn('⚠️ [PDF] pdfjs failed, trying file.text():', pdfErr);
        try { resumeText = await file.text(); } catch (_) { /* fallback failed */ }
      }

      if (resumeText.length < 50) {
        console.warn('⚠️ [PDF] Very short extracted text — may be an image-based PDF');
      }

      // Authenticity check
      const auth = checkResumeAuthenticity(resumeText);
      if (!auth.isValid && resumeText.length > 200) {
        return { success: false, error: "This doesn't look like a resume. Please upload a PDF with Education, Experience, Skills, or Projects sections." };
      }

      // ──── STEP 3: AI Analysis (Gemini primary, regex fallback) ──────────
      let geminiResult: AIResumeAnalysis | null = null;
      let regexResult: ResumeAnalysisResult | null = null;

      try {
        console.log('🤖 [Gemini] Running AI analysis...');
        geminiResult = await analyzeResumeWithAI(resumeText);
        setAiAnalysis(geminiResult);
        console.log('✅ [Gemini] Score:', geminiResult.overall_score, '| Skills:', geminiResult.skills.length);
      } catch (geminiErr) {
        console.warn('⚠️ [Gemini] Failed, falling back to regex:', geminiErr);
      }

      // Always run regex for the ResumeAnalysisResult shape (used by some UI components)
      try {
        regexResult = await analyzeResumeStrict(file);
        setResumeAnalysisResult(regexResult);
      } catch (regexErr) {
        console.error('❌ [Regex] Also failed:', regexErr);
      }

      // ──── STEP 4: Extract skills ─────────────────────────────────────────
      // Prefer Gemini skills (more accurate); fall back to regex
      const extractedSkills: string[] =
        (geminiResult?.skills && geminiResult.skills.length > 0)
          ? geminiResult.skills
          : extractActualSkills(resumeText);

      console.log('🎯 [Skills] Extracted', extractedSkills.length, 'skills:', extractedSkills);
      // ──── UPDATE UI STATE ────
      setDetectedSkills(extractedSkills);
      setUser(prev => prev ? {
        ...prev,
        resumeUploaded: true,
        resumeScore: geminiResult?.overall_score ?? regexResult?.resume_health.overall_score ?? 0,
        skills: extractedSkills,
      } : null);

      // STEP 4: Save data in student_profiles using UPSERT
      const profilePayload = {
        user_id:              userId,
        resume_url:           publicUrl,
        resume_text:          resumeText.slice(0, 10000),
        resume_score:         geminiResult?.overall_score ?? regexResult?.resume_health.overall_score ?? 0,
        contact_score:        geminiResult?.contact_info_score ?? regexResult?.structural_integrity.contact_info_score ?? 0,
        experience_score:     geminiResult?.experience_score ?? regexResult?.structural_integrity.experience_headers_score ?? 0,
        keyword_score:        geminiResult?.keyword_score ?? regexResult?.structural_integrity.keyword_density_score ?? 0,
        skill_coverage_score: geminiResult?.skill_coverage_score ?? 0,
        strengths:            geminiResult?.strengths ?? [],
        weak_areas:           geminiResult?.weak_areas ?? [],
        improvement_tips:     geminiResult?.feedback.suggestions ?? [],
        critical_issue:       geminiResult?.feedback.critical_issue ?? null,
      };

      const { data: dbResult, error: dbError } = await supabase
        .from('student_profiles')
        .upsert(profilePayload, { onConflict: "user_id" })
        .select();

      if (dbError) {
        console.error('❌ db error:', dbError);
      } else {
        console.log('✅ db success:', dbResult);
        setHasProfile(true);
        setResumeProfile(profilePayload as ResumeProfileData);
      }

      // STEP 5: Save skills
      // First DELETE all skills for that user_id
      const { error: skillDeleteError } = await supabase
        .from('skills')
        .delete()
        .eq('user_id', userId);

      if (skillDeleteError) {
        console.error('❌ skill delete error:', skillDeleteError);
      }

      // Then INSERT new skills
      if (extractedSkills.length > 0) {
        const skillsToInsert = extractedSkills.map(skill => ({
          user_id: userId,
          skill_name: skill.trim()
        }));

        const { data: skillInsertResult, error: skillInsertError } = await supabase
          .from('skills')
          .insert(skillsToInsert)
          .select();

        if (skillInsertError) {
          console.error('❌ skill insert error:', skillInsertError);
        } else {
          console.log('✅ skill insert result:', skillInsertResult);
        }
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Unexpected error in handleFileUpload:', error);
      return { success: false, error: 'Failed to process resume. Please try again.' };
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ─── Sync jobs from Supabase ───────────────────────────────────────────
  const syncJobsFromSupabase = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) { console.error('Jobs sync error:', error); return; }
      if (data && data.length > 0) {
        setJobs(data.map(job => ({
          id: job.id,
          title: job.title,
          company: job.company,
          location: job.location,
          salary_min: job.salary_min,
          salary_max: job.salary_max,
          created_by: job.created_by,
          skills: job.required_skills || job.skills || [],
          criteria: job.description || job.criteria || '',
          postedAt: job.created_at,
        })));
      }
    } catch (err) { console.error('Error syncing jobs:', err); }
  }, []);

  // ─── Sync applications from Supabase ─────────────────────────────────────
  const syncApplicationsFromSupabase = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select(`id, status, job_id, student_id, score, created_at, users(full_name, email), jobs(title, company), application_feedback(recruiter_notes)`)
        .order('created_at', { ascending: false });
      
      if (error) { console.error('Apps sync error:', error); return; }
      if (data) {
        const mappedApps = data.map((row: any) => {
          const notes = row.application_feedback?.[0]?.recruiter_notes;
          const rejectionReasons = notes ? notes.split(', ') : undefined;
          
          return {
            id: row.id,
            jobId: row.job_id,
            studentId: row.student_id,
            studentName: row.users?.full_name || 'Unknown User',
            studentEmail: row.users?.email || '',
            studentSkills: [], // We don't fetch skills here to map, but they fetch them in the profile viewer
            resumeScore: row.score || 0,
            status: row.status,
            feedback: {
              skillGaps: [],
              formatScore: 85,
              keywordScore: row.score ? Math.min(row.score + 10, 100) : 70,
              overallScore: row.score || 0,
              suggestions: [],
              rejectionReasons
            },
            appliedAt: row.created_at || new Date().toISOString(),
          } as Application;
        });
        setApplications(mappedApps);
      }
    } catch (err) { console.error('Error syncing applications:', err); }
  }, []);

  // ─── Context Value ────────────────────────────────────────────────────
  return (
    <AppContext.Provider value={{
      user, jobs, applications,
      isAnalyzing, isSyncing, hasProfile,
      resumeAnalysisResult, aiAnalysis, resumeProfile,
      detectedSkills, resumeUrl,
      login, logout, addJob, deleteJob,
      applyToJob, reviewApplication,
      updateSkills, uploadResume, handleFileUpload,
      clearAnalysis, setDetectedSkills,
      syncJobsFromSupabase, syncApplicationsFromSupabase,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
