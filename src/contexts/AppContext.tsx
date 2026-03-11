import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { analyzeResumeStrict, ResumeAnalysisResult, validateFile, extractActualSkills, checkResumeAuthenticity } from '@/lib/resumeAnalysis';
import { extractTextFromPDF } from '@/lib/pdfExtractor';
import { supabase } from '@/lib/supabase';

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
  skills: string[];
  criteria: string;
  postedAt: string;
}

export type ApplicationStatus = 'pending' | 'under_review' | 'selected' | 'approved' | 'rejected';

export interface Application {
  id: string;
  jobId: string;
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

interface AppState {
  user: User | null;
  jobs: Job[];
  applications: Application[];
  isAnalyzing: boolean;
  isSyncing: boolean; // Task 3: Loading state for "Syncing with Profile..."
  resumeAnalysisResult: ResumeAnalysisResult | null;
  detectedSkills: string[]; // Task 2: Source of Truth for detected skills
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
}

const AppContext = createContext<AppState | null>(null);

const INITIAL_JOBS: Job[] = [
  { id: '1', title: 'Frontend Developer', company: 'TechCorp', skills: ['React', 'TypeScript', 'Tailwind CSS', 'React Native'], criteria: '3+ years experience with modern frontend frameworks', postedAt: new Date().toISOString() },
  { id: '2', title: 'Full Stack Engineer', company: 'InnovateLab', skills: ['Node.js', 'React', 'PostgreSQL', 'Docker'], criteria: 'Experience building scalable web applications', postedAt: new Date().toISOString() },
  { id: '3', title: 'UI/UX Designer', company: 'DesignHub', skills: ['Figma', 'CSS', 'User Research', 'Prototyping'], criteria: 'Strong portfolio with B2B SaaS experience', postedAt: new Date().toISOString() },
  { id: '4', title: 'Data Scientist', company: 'DataFlow', skills: ['Python', 'TensorFlow', 'SQL', 'Statistics'], criteria: 'MS in CS or related field preferred', postedAt: new Date().toISOString() },
];

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

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('transparently_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [jobs, setJobs] = useState<Job[]>(() => {
    const saved = localStorage.getItem('transparently_jobs');
    return saved ? JSON.parse(saved) : INITIAL_JOBS;
  });

  const [applications, setApplications] = useState<Application[]>(() => {
    const saved = localStorage.getItem('transparently_applications');
    return saved ? JSON.parse(saved) : [];
  });

  // Analysis state for resume upload
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false); // Task 3: Loading state for "Syncing with Profile..."
  const [resumeAnalysisResult, setResumeAnalysisResult] = useState<ResumeAnalysisResult | null>(null);
  
  // Task 2: detectedSkills - Source of Truth for skills extracted from resume
  const [detectedSkills, setDetectedSkills] = useState<string[]>(() => {
    const saved = localStorage.getItem('transparently_detected_skills');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    if (user) localStorage.setItem('transparently_user', JSON.stringify(user));
    else localStorage.removeItem('transparently_user');
  }, [user]);

  useEffect(() => { localStorage.setItem('transparently_jobs', JSON.stringify(jobs)); }, [jobs]);
  useEffect(() => { localStorage.setItem('transparently_applications', JSON.stringify(applications)); }, [applications]);
  useEffect(() => { localStorage.setItem('transparently_detected_skills', JSON.stringify(detectedSkills)); }, [detectedSkills]);

  // Task 2: Fetch saved resume data from Supabase when user logs in
  useEffect(() => {
    const fetchSavedResumeData = async () => {
      if (!user?.id) return;
      
      setIsSyncing(true);
      try {
        // Fetch from student_profiles table
        const { data: profileData, error: profileError } = await supabase
          .from('student_profiles')
          .select('resume_url, resume_score, contact_score, experience_score, keyword_score, skill_coverage_score')
          .eq('user_id', user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.log('Error fetching student profile:', profileError.message);
        } else if (profileData) {
          // Restore resume state if resume_url exists
          if (profileData.resume_url) {
            setUser(prev => prev ? { 
              ...prev, 
              resumeUploaded: true,
              resumeScore: profileData.resume_score || 0
            } : null);
            console.log('Restored resume from database:', profileData.resume_url);
          }
        }

        // Fetch skills from skills table
        const { data: skillsData, error: skillsError } = await supabase
          .from('skills')
          .select('skill_name')
          .eq('user_id', user.id);

        if (skillsError) {
          console.log('Error fetching skills:', skillsError.message);
        } else if (skillsData && skillsData.length > 0) {
          const extractedSkills = skillsData.map(s => s.skill_name);
          setDetectedSkills(extractedSkills);
          setUser(prev => prev ? { ...prev, skills: extractedSkills } : null);
          console.log('Restored skills from database:', extractedSkills);
        }
        
        console.log('Successfully restored all resume data from Supabase');
      } catch (err) {
        console.error('Error fetching saved resume data:', err);
      } finally {
        setIsSyncing(false);
      }
    };

    fetchSavedResumeData();
  }, [user?.id]);

  const login = (name: string, email: string, role: Role, id?: string) => {
    setUser({ id, name, email, role, skills: ['React', 'TypeScript', 'CSS'], resumeScore: 72, resumeUploaded: false });
  };

  const logout = () => setUser(null);

  const addJob = (job: Omit<Job, 'id' | 'postedAt'>) => {
    setJobs(prev => [...prev, { ...job, id: Date.now().toString(), postedAt: new Date().toISOString() }]);
  };

  const deleteJob = (jobId: string) => {
    setJobs(prev => prev.filter(j => j.id !== jobId));
  };

  const applyToJob = (jobId: string) => {
    if (!user) return;
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    const feedback = generateFeedback(user.skills, job.skills);
    const app: Application = {
      id: Date.now().toString(),
      jobId,
      studentName: user.name,
      studentEmail: user.email,
      studentSkills: user.skills,
      resumeScore: feedback.overallScore,
      status: 'pending',
      feedback,
      appliedAt: new Date().toISOString(),
    };
    setApplications(prev => [...prev, app]);
    setUser(prev => prev ? { ...prev, resumeScore: feedback.overallScore } : null);
  };

  const reviewApplication = (appId: string, status: 'approved' | 'rejected', rejectionReasons?: string[]) => {
    setApplications(prev => prev.map(a =>
      a.id === appId ? { ...a, status, feedback: a.feedback ? { ...a.feedback, rejectionReasons: status === 'rejected' ? rejectionReasons : undefined } : undefined } : a
    ));
  };

  const updateSkills = (skills: string[]) => setUser(prev => prev ? { ...prev, skills } : null);
  const uploadResume = () => setUser(prev => prev ? { ...prev, resumeUploaded: true } : null);

  // Handle file upload with analysis - used by both Profile and Dashboard
  const handleFileUpload = async (file: File): Promise<{ success: boolean; error?: string }> => {
    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    if (!user?.id) {
      return { success: false, error: 'User not logged in' };
    }

    try {
      setIsAnalyzing(true);
      setResumeAnalysisResult(null);

      // STEP 1: Upload to Supabase Storage
      const fileName = `${user.id}/resume.pdf`;
      
      // Delete old resume if exists
      try {
        const { data: existingFiles } = await supabase.storage
          .from('resumes')
          .list(`${user.id}`);
        
        if (existingFiles && existingFiles.length > 0) {
          const filesToDelete = existingFiles.map(f => `${user.id}/${f.name}`);
          await supabase.storage.from('resumes').remove(filesToDelete);
        }
      } catch (e) {
        console.log('No existing resume to delete');
      }

      // Upload new resume
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(fileName, file, {
          upsert: true
        });

      if (uploadError) {
        console.error('Error uploading resume:', uploadError);
        return { success: false, error: 'Failed to upload resume. Please try again.' };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('resumes')
        .getPublicUrl(fileName);

      const resumeUrl = urlData?.publicUrl;

      // STEP 2: Extract text from the resume using pdfjs-dist
      let resumeText = '';
      try {
        resumeText = await extractTextFromPDF(file);
      } catch (e) {
        console.warn('Could not extract text using pdfjs, trying fallback:', e);
        // Fallback
        try {
          resumeText = await file.text();
        } catch (fallbackError) {
          console.error('Fallback text extraction also failed:', fallbackError);
        }
      }

      // STEP 3: Check resume authenticity before proceeding
      const authenticityCheck = checkResumeAuthenticity(resumeText);
      
      if (!authenticityCheck.isValid) {
        return { 
          success: false, 
          error: 'Uploaded PDF does not appear to be a resume. Please ensure your document includes at least two of these sections: education, experience, skills, projects, summary, profile.' 
        };
      }

      // STEP 4: Extract actual skills using the Master Skill Extractor
      const extractedSkills = extractActualSkills(resumeText);
      
      // Update detectedSkills in global state (Source of Truth)
      setDetectedSkills(extractedSkills);

      // STEP 5: Analyze the resume using strict scoring rules
      const result = await analyzeResumeStrict(file);
      
      // Update state with analysis results
      setResumeAnalysisResult(result);
      
      // Update user with resume data - use detectedSkills as the primary source
      setUser(prev => prev ? {
        ...prev,
        resumeUploaded: true,
        resumeScore: result.resume_health.overall_score,
        skills: extractedSkills.length > 0 ? extractedSkills : prev.skills
      } : null);

      // STEP 6: Save resume analysis results to Supabase
      try {
        // First, save skills to skills table
        // Delete existing skills for this user first to avoid duplicates
        await supabase.from('skills').delete().eq('user_id', user.id);
        
        // Insert new skills
        if (extractedSkills.length > 0) {
          const skillsToInsert = extractedSkills.map(skill => ({
            user_id: user.id,
            skill_name: skill
          }));
          
          const { error: skillsError } = await supabase
            .from('skills')
            .insert(skillsToInsert);
            
          if (skillsError) {
            console.error('Error saving skills to Supabase:', skillsError);
          } else {
            console.log('Successfully saved skills to Supabase:', extractedSkills);
          }
        }

        // Save profile data with resume URL
        const { error: profileError } = await supabase.from('student_profiles').upsert({
          user_id: user.id,
          resume_url: resumeUrl,
          resume_score: result.resume_health.overall_score,
          contact_score: result.structural_integrity.contact_info_score,
          experience_score: result.structural_integrity.experience_headers_score,
          keyword_score: result.structural_integrity.keyword_density_score,
          skill_coverage_score: result.structural_integrity.keyword_density_score
        }, {
          onConflict: 'user_id'
        });

        if (profileError) {
          console.error('Error saving profile:', profileError);
        }

        console.log('Successfully saved resume analysis to Supabase');
      } catch (err) {
        console.error('Error in Supabase save:', err);
      }

      return { success: true };
    } catch (error) {
      console.error('Error analyzing resume:', error);
      return { success: false, error: 'Failed to analyze resume. Please try again.' };
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Clear analysis results (for re-uploading)
  const clearAnalysis = () => {
    setResumeAnalysisResult(null);
    setIsAnalyzing(false);
  };

  // Sync jobs from Supabase
  const syncJobsFromSupabase = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching jobs from Supabase:', error);
        return;
      }

      if (data && data.length > 0) {
        // Map required_skills to skills
        const mappedJobs: Job[] = data.map(job => ({
          id: job.id,
          title: job.title,
          company: job.company,
          skills: job.required_skills || job.skills || [],
          criteria: job.description || job.criteria || '',
          postedAt: job.created_at
        }));
        
        setJobs(mappedJobs);
        console.log('Synced jobs from Supabase:', mappedJobs);
      }
    } catch (err) {
      console.error('Error syncing jobs:', err);
    }
  };

  return (
    <AppContext.Provider value={{
      user, 
      jobs, 
      applications,
      isAnalyzing,
      isSyncing,
      resumeAnalysisResult,
      detectedSkills,
      login, 
      logout, 
      addJob, 
      deleteJob, 
      applyToJob, 
      reviewApplication, 
      updateSkills, 
      uploadResume,
      handleFileUpload,
      clearAnalysis,
      setDetectedSkills,
      syncJobsFromSupabase
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
