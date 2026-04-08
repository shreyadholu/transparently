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

export type ApplicationStatus = 'applied' | 'screened' | 'shortlisted' | 'interview' | 'selected' | 'rejected';

export interface Application {
  id: string;
  jobId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentSkills: string[];
  resumeScore: number;
  status: ApplicationStatus;
  feedback?: FeedbackData;
  appliedAt: string;
}

export interface RoadmapStep {
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
}

export interface GrowthRoadmap {
  steps: RoadmapStep[];
  estimated_time: string;
  project_idea: string;
}

export interface FeedbackData {
  skillGaps: string[];
  formatScore: number;
  keywordScore: number;
  overallScore: number;
  suggestions: string[];
  rejectionReasons?: string[];
  growthRoadmap?: GrowthRoadmap;
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
  degree: string | null;
  university: string | null;
  skills: string[] | null;
}

export interface RecruiterNote {
  id: string;
  candidate_id: string;
  recruiter_id: string;
  application_id?: string;
  note: string;
  created_at: string;
}

interface AppState {
  user: User | null;
  jobs: Job[];
  applications: Application[];
  isAnalyzing: boolean;
  isSyncing: boolean;
  hasProfile: boolean;
  resumeAnalysisResult: ResumeAnalysisResult | null;
  aiAnalysis: AIResumeAnalysis | null;
  resumeProfile: ResumeProfileData | null;
  detectedSkills: string[];
  resumeUrl: string | null;
  login: (name: string, email: string, role: Role, id?: string) => void;
  logout: () => void;
  addJob: (job: Omit<Job, 'id' | 'postedAt'>) => void;
  deleteJob: (jobId: string) => void;
  applyToJob: (jobId: string) => Promise<void>;
  updateApplicationStatus: (appId: string, status: ApplicationStatus) => Promise<void>;
  reviewApplication: (appId: string, status: 'selected' | 'rejected', rejectionReasons?: string[]) => void;
  updateSkills: (skills: string[]) => void;
  uploadResume: () => void;
  handleFileUpload: (file: File) => Promise<{ success: boolean; error?: string }>;
  clearAnalysis: () => void;
  setDetectedSkills: (skills: string[]) => void;
  syncJobsFromSupabase: () => Promise<void>;
  syncApplicationsFromSupabase: () => Promise<void>;
  addRecruiterNote: (candidateId: string, applicationId: string, note: string) => Promise<void>;
  fetchRecruiterNotes: (applicationId: string) => Promise<RecruiterNote[]>;
  updateEducation: (degree: string, university: string) => Promise<{ success: boolean; error?: string }>;
}

const AppContext = createContext<AppState | null>(null);

// ─── Helper: compute ATS feedback (now powered by Python Backend) ────────────
async function generateAIFeedback(studentSkills: string[], job: Job): Promise<FeedbackData> {
  const matchedSkills = studentSkills.filter(s => job.skills.some(js => js.toLowerCase() === s.toLowerCase()));
  const skillGaps = job.skills.filter(js => !studentSkills.some(s => s.toLowerCase() === js.toLowerCase()));
  const keywordScore = Math.round((matchedSkills.length / Math.max(job.skills.length, 1)) * 100);
  const formatScore = Math.floor(Math.random() * 30) + 60;
  const overallScore = Math.round((keywordScore * 0.6 + formatScore * 0.4));
  
  const suggestions = [
    ...skillGaps.map(s => `Learn ${s} through online courses or projects`),
    overallScore < 70 ? 'Improve resume formatting with action verbs and metrics' : 'Consider adding quantifiable achievements',
    'Build a portfolio project showcasing your skills',
  ].slice(0, 4);

  let growthRoadmap: GrowthRoadmap | undefined;
  try {
    const response = await fetch('http://localhost:8000/roadmap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_skills: studentSkills,
        job_title: job.title,
        job_skills: job.skills
      })
    });
    if (response.ok) {
      growthRoadmap = await response.json();
    }
  } catch (err) {
    console.error('Roadmap generation failed:', err);
  }

  return { skillGaps, formatScore, keywordScore, overallScore, suggestions, growthRoadmap };
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('transparently_user');
      console.log('📦 Initial user from localStorage:', stored ? 'Found' : 'None');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.error('Error reading localStorage:', e);
      return null;
    }
  });

  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // isSyncing starts TRUE if user exists — prevents UI flash of "Upload Resume" screen
  const [isSyncing, setIsSyncing] = useState<boolean>(() => {
    try { return !!JSON.parse(localStorage.getItem('transparently_user') || 'null'); } catch { return false; }
  });
  const [hasProfile, setHasProfile] = useState(false);
  const [resumeAnalysisResult, setResumeAnalysisResult] = useState<ResumeAnalysisResult | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIResumeAnalysis | null>(null);
  const [resumeProfile, setResumeProfile] = useState<ResumeProfileData | null>(null);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [detectedSkills, setDetectedSkills] = useState<string[]>([]);

  // Persist user to localStorage
  useEffect(() => {
    if (user) localStorage.setItem('transparently_user', JSON.stringify(user));
    else localStorage.removeItem('transparently_user');
  }, [user]);

  // ─── On Login / Page Load: Full hydration from Supabase ────────────────────
  useEffect(() => {
    if (!user?.id) {
      setIsSyncing(false);
      return;
    }

    let cancelled = false;

    const hydrateFromDatabase = async () => {
      setIsSyncing(true);
      try {
        console.log('🔄 Hydrating state from Supabase for user:', user.id);

        // 1. Fetch student profile
        const { data: profile, error: profileErr } = await supabase
          .from('student_profiles')
          .select('resume_url, resume_score, contact_score, experience_score, keyword_score, skill_coverage_score, strengths, weak_areas, improvement_tips, critical_issue, degree, university, resume_text, skills')
          .eq('user_id', user.id)
          .single();

        if (cancelled) return;

        if (profileErr && profileErr.code !== 'PGRST116') {
          console.error('Profile fetch error:', profileErr.message);
        }

        if (profile && profile.resume_url) {
          console.log('📄 Profile found, resume score:', profile.resume_score);

          // 2. Fetch skills directly from profile column (new strategy)
          let skillNames = profile.skills || [];
          console.log('📊 Skills from profile column:', skillNames.length);

          // Fallback: if skills are missing but profile exists, re-extract from resume_text
          if (skillNames.length === 0 && profile.resume_text) {
            console.warn('⚠️ No skills in profile column — attempting recovery from cached resume_text');
            const recovered = extractActualSkills(profile.resume_text);
            if (recovered.length > 0) {
              console.log('🔄 Recovered', recovered.length, 'skills from resume_text');
              skillNames = recovered;
            }
          }

          // 3. Set all state atomically
          setHasProfile(true);
          setResumeProfile(profile as ResumeProfileData);
          setResumeUrl(profile.resume_url);
          setDetectedSkills(skillNames);
          
          setUser(prev => {
            if (!prev) return null;
            console.log('🔄 Final State Update: Setting user.skills to:', skillNames.length, 'items');
            return {
              ...prev,
              resumeUploaded: true,
              resumeScore: profile.resume_score || 0,
              skills: skillNames,
            };
          });

          console.log('✅ Hydration complete for user:', user.name);
        } else {
          setHasProfile(false);
          setDetectedSkills([]);
          console.log('ℹ️ No profile found for user:', user.name);
        }

        // 4. Sync applications
        await syncApplicationsFromSupabase();
        // 5. Sync jobs
        await syncJobsFromSupabase();

      } catch (err) {
        console.error('Error in hydrateFromDatabase:', err);
      } finally {
        if (!cancelled) setIsSyncing(false);
      }
    };

    hydrateFromDatabase();

    return () => { cancelled = true; };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Auth ────────────────────────────────────────────────────────────────
  const login = (name: string, email: string, role: Role, id?: string) => {
    console.log('🔑 Login attempt for:', name, 'ID:', id);
    // Set syncing BEFORE setting user to prevent flash
    setIsSyncing(true);
    // Initially set skills to empty, but hydration will fill them
    setUser({ id, name, email, role, skills: [], resumeScore: 0, resumeUploaded: false });
    // Don't clear analysis state here — it will be hydrated from DB
    setAiAnalysis(null);
    setResumeAnalysisResult(null);
  };

  const logout = () => {
    setUser(null);
    setAiAnalysis(null);
    setResumeAnalysisResult(null);
    setResumeProfile(null);
    setHasProfile(false);
    setResumeUrl(null);
    setDetectedSkills([]);
    setApplications([]);
    setIsSyncing(false);
  };

  // ─── Jobs ────────────────────────────────────────────────────────────────
  const addJob = (job: Omit<Job, 'id' | 'postedAt'>) =>
    setJobs(prev => [...prev, { ...job, id: Date.now().toString(), postedAt: new Date().toISOString() }]);

  const deleteJob = (jobId: string) => setJobs(prev => prev.filter(j => j.id !== jobId));

  // ─── Applications ─────────────────────────────────────────────────────
  const applyToJob = async (jobId: string) => {
    if (!user) return;
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;

    const feedback = await generateAIFeedback(user.skills, job);

    // Persist to Supabase with new 'applied' status
    const { data, error } = await supabase.from('applications').insert([{
      job_id: jobId,
      student_id: user.id,
      status: 'applied',
      score: feedback.overallScore,
      feedback: feedback // Critical: Store the generated feedback including roadmap
    }]).select().single();

    if (error) {
      console.error('Failed to persist application:', error.message);
      return;
    }

    const app: Application = {
      id: data?.id || Date.now().toString(),
      jobId,
      studentId: user.id || '',
      studentName: user.name,
      studentEmail: user.email,
      studentSkills: user.skills,
      resumeScore: feedback.overallScore,
      status: 'applied',
      feedback,
      appliedAt: data?.created_at || new Date().toISOString(),
    };

    setApplications(prev => [...prev, app]);
    setUser(prev => prev ? { ...prev, resumeScore: feedback.overallScore } : null);
  };

  // ─── Update Application Status (multi-stage pipeline) ──────────────────
  const updateApplicationStatus = async (appId: string, status: ApplicationStatus) => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(appId)) {
      console.error('Invalid application ID:', appId);
      return;
    }

    const { error } = await supabase
      .from('applications')
      .update({ status })
      .eq('id', appId);

    if (error) {
      console.error('Failed to update status:', error.message);
      return;
    }

    setApplications(prev => prev.map(a => a.id === appId ? { ...a, status } : a));
  };

  const reviewApplication = (appId: string, status: 'selected' | 'rejected', rejectionReasons?: string[]) => {
    setApplications(prev => prev.map(a =>
      a.id === appId
        ? {
            ...a,
            status,
            feedback: {
              ...(a.feedback || {
                skillGaps: [],
                formatScore: 0,
                keywordScore: 0,
                overallScore: a.resumeScore || 0,
                suggestions: [],
              }),
              rejectionReasons: status === 'rejected' ? rejectionReasons : undefined
            }
          }
        : a
    ));
  };

  const updateSkills = (skills: string[]) => {
    setUser(prev => prev ? { ...prev, skills } : null);
    setDetectedSkills(skills);
    // Persist directly to student_profiles
    if (user?.id) {
      (async () => {
        const { error } = await supabase
          .from('student_profiles')
          .update({ skills })
          .eq('user_id', user.id!);
          
        if (error) console.error('❌ Failed to update skills in profile:', error.message);
        else console.log('✅ Skills updated in student_profiles');
      })();
    }
  };

  const uploadResume = () => setUser(prev => prev ? { ...prev, resumeUploaded: true } : null);
  const clearAnalysis = () => { setResumeAnalysisResult(null); setIsAnalyzing(false); };

  // ─── ★ MAIN UPLOAD HANDLER (single source of truth) ─────────────────────
  const handleFileUpload = async (file: File): Promise<{ success: boolean; error?: string }> => {
    const validation = validateFile(file);
    if (!validation.valid) return { success: false, error: validation.error };

    const userId = user?.id;
    if (!userId) {
      return { success: false, error: 'User not logged in' };
    }

    try {
      setIsAnalyzing(true);
      setResumeAnalysisResult(null);
      setAiAnalysis(null);

      // STEP 1: Upload file to storage
      const filePath = `${userId}/resume.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file, { upsert: true, contentType: 'application/pdf' });

      if (uploadError) {
        return { success: false, error: `Failed to upload: ${uploadError.message}` };
      }

      // STEP 2: Get public URL
      const { data: urlData } = supabase.storage.from('resumes').getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;
      setResumeUrl(publicUrl);

      // STEP 3: Extract text from PDF
      let resumeText = '';
      try {
        resumeText = await extractTextFromPDF(file);
      } catch (pdfErr) {
        try { resumeText = await file.text(); } catch (_) { /* fallback failed */ }
      }

      if (resumeText.length < 50) {
        console.warn('⚠️ Very short extracted text — may be image-based PDF');
      }

      // Authenticity check
      const auth = checkResumeAuthenticity(resumeText);
      if (!auth.isValid && resumeText.length > 200) {
        return { success: false, error: "This doesn't look like a resume. Please upload a PDF with Education, Experience, Skills, or Projects sections." };
      }

      // STEP 4: AI Analysis via Python FastAPI Backend
      let geminiResult: AIResumeAnalysis | null = null;
      let regexResult: ResumeAnalysisResult | null = null;

      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('http://localhost:8000/analyze', {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          geminiResult = await response.json();
          setAiAnalysis(geminiResult);
        } else {
          throw new Error('Python Backend Analysis Failed');
        }
      } catch (geminiErr) {
        console.warn('⚠️ Python Backend failed, falling back to regex:', geminiErr);
        try {
          const regexResult = await analyzeResumeStrict(file);
          setResumeAnalysisResult(regexResult);
        } catch (regexErr) {
          console.error('❌ Regex also failed:', regexErr);
        }
      }

      // STEP 5: Extract skills
      const rawSkills: string[] = (geminiResult?.skills && geminiResult.skills.length > 0)
        ? geminiResult.skills
        : extractActualSkills(resumeText);
      
      // Critical: deduplicate by lowercase, keep first occurrence casing
      const seen = new Set<string>();
      const extractedSkills = rawSkills.filter(s => {
        const key = s.trim().toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      console.log('📋 Extracted skills (deduped):', extractedSkills.length, extractedSkills);

      // Update UI state
      setDetectedSkills(extractedSkills);
      setUser(prev => prev ? {
        ...prev,
        resumeUploaded: true,
        resumeScore: geminiResult?.overall_score ?? regexResult?.resume_health.overall_score ?? 0,
        skills: extractedSkills,
      } : null);

      // STEP 6: Persist profile to database
      const profilePayload = {
        user_id: userId,
        resume_url: publicUrl,
        resume_text: resumeText.slice(0, 10000),
        resume_score: geminiResult?.overall_score ?? regexResult?.resume_health.overall_score ?? 0,
        contact_score: geminiResult?.contact_info_score ?? regexResult?.structural_integrity.contact_info_score ?? 0,
        experience_score: geminiResult?.experience_score ?? regexResult?.structural_integrity.experience_headers_score ?? 0,
        keyword_score: geminiResult?.keyword_score ?? regexResult?.structural_integrity.keyword_density_score ?? 0,
        skill_coverage_score: geminiResult?.skill_coverage_score ?? 0,
        strengths: geminiResult?.strengths ?? [],
        weak_areas: geminiResult?.weak_areas ?? [],
        improvement_tips: geminiResult?.feedback.suggestions ?? [],
        critical_issue: geminiResult?.feedback.critical_issue ?? null,
        degree: null,
        university: null,
        skills: extractedSkills,
      };

      const { data: profileRecord, error: dbError } = await supabase
        .from('student_profiles')
        .upsert(profilePayload, { onConflict: 'user_id' })
        .select();

      if (dbError) {
        console.error('❌ Profile save error:', dbError);
      } else {
        setHasProfile(true);
        setResumeProfile({ ...profilePayload, skills: extractedSkills } as ResumeProfileData);
        console.log('✅ Profile & Skills saved to student_profiles successfully');
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
        .select(`id, status, job_id, student_id, score, created_at, users!fk_student(full_name, email), jobs!fk_app_job(title, company), application_feedback(recruiter_notes)`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Apps sync error:', error.message);
        return;
      }

      if (data) {
        const mappedApps = data.map((row: {
          id: string;
          job_id: string;
          student_id: string;
          score: number;
          status: string;
          created_at: string;
          users?: { full_name: string; email: string };
          application_feedback?: { recruiter_notes: string }[];
        }) => {
          const notes = row.application_feedback?.[0]?.recruiter_notes;
          const rejectionReasons = notes ? notes.split(', ') : undefined;

          return {
            id: row.id,
            jobId: row.job_id,
            studentId: row.student_id,
            studentName: row.users?.full_name || 'Unknown User',
            studentEmail: row.users?.email || '',
            studentSkills: [],
            resumeScore: row.score || 0,
            status: row.status as ApplicationStatus,
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

  // ─── Recruiter Notes ─────────────────────────────────────────────────────
  const addRecruiterNote = async (candidateId: string, applicationId: string, note: string) => {
    if (!user?.id) return;
    const { error } = await supabase.from('recruiter_notes').insert([{
      candidate_id: candidateId,
      recruiter_id: user.id,
      application_id: applicationId,
      note,
    }]);
    if (error) console.error('Failed to save note:', error);
  };

  const fetchRecruiterNotes = async (applicationId: string): Promise<RecruiterNote[]> => {
    const { data, error } = await supabase
      .from('recruiter_notes')
      .select('*')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: false });

    if (error) { console.error('Failed to fetch notes:', error); return []; }
    return (data || []) as RecruiterNote[];
  };

  const updateEducation = async (degree: string, university: string): Promise<{ success: boolean; error?: string }> => {
    if (!user?.id) return { success: false, error: 'User not logged in' };
    
    setResumeProfile(prev => prev ? { ...prev, degree, university } : null);

    const { error } = await supabase
      .from('student_profiles')
      .update({ degree, university })
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to update education:', error.message);
      return { success: false, error: 'Failed to save education details' };
    }
    return { success: true };
  };

  // ─── Context Value ────────────────────────────────────────────────────
  return (
    <AppContext.Provider value={{
      user, jobs, applications,
      isAnalyzing, isSyncing, hasProfile,
      resumeAnalysisResult, aiAnalysis, resumeProfile,
      detectedSkills, resumeUrl,
      login, logout, addJob, deleteJob,
      applyToJob, updateApplicationStatus, reviewApplication,
      updateSkills, uploadResume, handleFileUpload,
      clearAnalysis, setDetectedSkills,
      syncJobsFromSupabase, syncApplicationsFromSupabase,
      addRecruiterNote, fetchRecruiterNotes, updateEducation,
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
