import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Role = 'student' | 'recruiter';

export interface User {
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

export interface Application {
  id: string;
  jobId: string;
  studentName: string;
  studentEmail: string;
  studentSkills: string[];
  resumeScore: number;
  status: 'pending' | 'approved' | 'rejected';
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
  login: (name: string, email: string, role: Role) => void;
  logout: () => void;
  addJob: (job: Omit<Job, 'id' | 'postedAt'>) => void;
  deleteJob: (jobId: string) => void;
  applyToJob: (jobId: string) => void;
  reviewApplication: (appId: string, status: 'approved' | 'rejected', rejectionReasons?: string[]) => void;
  updateSkills: (skills: string[]) => void;
  uploadResume: () => void;
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

  useEffect(() => {
    if (user) localStorage.setItem('transparently_user', JSON.stringify(user));
    else localStorage.removeItem('transparently_user');
  }, [user]);

  useEffect(() => { localStorage.setItem('transparently_jobs', JSON.stringify(jobs)); }, [jobs]);
  useEffect(() => { localStorage.setItem('transparently_applications', JSON.stringify(applications)); }, [applications]);

  const login = (name: string, email: string, role: Role) => {
    setUser({ name, email, role, skills: ['React', 'TypeScript', 'CSS'], resumeScore: 72, resumeUploaded: false });
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

  return (
    <AppContext.Provider value={{ user, jobs, applications, login, logout, addJob, deleteJob, applyToJob, reviewApplication, updateSkills, uploadResume }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
