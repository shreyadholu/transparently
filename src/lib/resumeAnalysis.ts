// Resume Analysis Utility - ATS Structural Integrity Auditor
// Performs rule-based analysis based on strict industry standards for Applicant Tracking Systems

// =========================================
// MASTER SKILL EXTRACTOR (Task 1)
// =========================================

// Predefined skill library for extraction
import { extractSkillsWithAI } from "../ai/aiSkillExtractor";

// Predefined skill library
export const SKILL_LIBRARY = [
  'React', 'Node.js', 'Python', 'SQL', 'TypeScript', 'HTML', 'CSS', 
  'JavaScript', 'C#', 'C++', 'Java', 'Project Management',
  'React Native', 'Angular', 'Vue', 'Next.js', 'Express', 'Django', 
  'Flask', 'PostgreSQL', 'MongoDB', 'Redis', 'Docker', 'Kubernetes',
  'AWS', 'Azure', 'GCP', 'Git', 'Figma', 'Tailwind', 'REST API', 
  'GraphQL', 'Machine Learning', 'Data Analysis', 'Excel', 'PowerPoint'
];

// IMPROVEMENT 1: Enhanced skill synonyms mapping for normalization
// Maps variations to canonical skill names
export const SKILL_SYNONYM_MAPPING: Record<string, string> = {
  // React variations
  'reactjs': 'React',
  'react.js': 'React',
  'react': 'React',
  
  // Node.js variations
  'nodejs': 'Node.js',
  'node.js': 'Node.js',
  'node': 'Node.js',
  
  // JavaScript variations
  'js': 'JavaScript',
  'es6': 'JavaScript',
  'es5': 'JavaScript',
  'javascript': 'JavaScript',
  
  // TypeScript variations
  'typescript': 'TypeScript',
  'ts': 'TypeScript',
  
  // Python variations
  'python': 'Python',
  'py': 'Python',
  
  // C# variations
  'c#': 'CSharp',
  'csharp': 'CSharp',
  
  // C++ variations
  'c++': 'C++',
  'cpp': 'C++',
  
  // SQL variations
  'sqlserver': 'SQL',
  'mysql': 'SQL',
  'sqlite': 'SQL',
  
  // PostgreSQL variations
  'postgres': 'PostgreSQL',
  'postgresql': 'PostgreSQL',
  'pgsql': 'PostgreSQL',
  'pg': 'PostgreSQL',
  
  // MongoDB variations
  'mongo': 'MongoDB',
  'mongodb': 'MongoDB',
  
  // Express variations
  'expressjs': 'Express',
  'express.js': 'Express',
  'express': 'Express',
  
  // Django variations
  'django': 'Django',
  
  // Flask variations
  'flask': 'Flask',
  
  // Docker
  'docker': 'Docker',
  'dockerfile': 'Docker',
  
  // Kubernetes
  'kubernetes': 'Kubernetes',
  'k8s': 'Kubernetes',
  
  // AWS
  'aws': 'AWS',
  'amazon web services': 'AWS',
  
  // Azure
  'azure': 'Azure',
  
  // GCP
  'gcp': 'GCP',
  'google cloud': 'GCP',
  
  // Git
  'git': 'Git',
  'github': 'Git',
  'gitlab': 'Git',
  
  // HTML/CSS
  'html': 'HTML',
  'html5': 'HTML',
  'css': 'CSS',
  'css3': 'CSS',
  
  // Tailwind
  'tailwind': 'Tailwind',
  'tailwindcss': 'Tailwind',
  
  // REST API
  'rest': 'REST API',
  'rest api': 'REST API',
  'restapi': 'REST API',
  
  // GraphQL
  'graphql': 'GraphQL',
  
  // Machine Learning
  'ml': 'Machine Learning',
  'machine learning': 'Machine Learning',
  'tensorflow': 'Machine Learning',
  'pytorch': 'Machine Learning',
  
  // Project Management
  'pm': 'Project Management',
  'project management': 'Project Management',
  
  // Angular variations
  'angularjs': 'Angular',
  'angular.js': 'Angular',
  'angular': 'Angular',
  
  // Vue variations
  'vuejs': 'Vue',
  'vue.js': 'Vue',
  'vue': 'Vue',
  
  // Next.js variations
  'nextjs': 'Next.js',
  'next.js': 'Next.js',
  'next': 'Next.js',
  
  // React Native variations
  'reactnative': 'React Native',
  'react native': 'React Native',
  'rn': 'React Native',
  
  // Data Analysis
  'data analysis': 'Data Analysis',
  'dataanalytics': 'Data Analysis',
  'analytics': 'Data Analysis',
  
  // Excel
  'excel': 'Excel',
  'microsoft excel': 'Excel',
  
  // PowerPoint
  'powerpoint': 'PowerPoint',
  'ms powerpoint': 'PowerPoint',
};

/**
 * Normalizes a skill name to its canonical form
 * @param skill - The skill name to normalize
 * @returns The normalized skill name
 */
export function normalizeSkill(skill: string): string {
  const trimmed = skill.trim().toLowerCase();
  
  // Check if it's a direct key in the mapping
  if (SKILL_SYNONYM_MAPPING[trimmed]) {
    return SKILL_SYNONYM_MAPPING[trimmed];
  }
  
  // Check if any key maps to this skill (reverse lookup)
  for (const [alias, canonical] of Object.entries(SKILL_SYNONYM_MAPPING)) {
    if (canonical.toLowerCase() === trimmed) {
      return canonical;
    }
  }
  
  // Capitalize first letter if not found in mapping
  return skill.charAt(0).toUpperCase() + skill.slice(1).toLowerCase();
}

/**
 * Extracts actual skills from text using regex with word boundaries
 * @param text - The resume text to analyze
 * @returns Array of unique skills found (case-insensitive, normalized)
 */
export function extractActualSkills(text: string): string[] {
  if (!text || text.length < 10) {
    return [];
  }

  const lowerText = text.toLowerCase();
  const foundSkills = new Set<string>();

  // Search for each skill in the library using word boundaries
  for (const skill of SKILL_LIBRARY) {
    // Escape special regex characters in skill name
    const escapedSkill = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Create regex with word boundaries - case insensitive
    // \b ensures 'C' doesn't match 'Certifications' and 'Java' doesn't match 'JavaScript'
    const skillRegex = new RegExp(`\\b${escapedSkill}\\b`, 'gi');
    
    if (skillRegex.test(lowerText)) {
      // Normalize the skill before adding
      const normalized = normalizeSkill(skill);
      foundSkills.add(normalized);
    }
  }

  // Also check for synonyms in text (if the canonical skill isn't present)
  for (const [alias, canonical] of Object.entries(SKILL_SYNONYM_MAPPING)) {
    // Skip if we already found the canonical form
    if (foundSkills.has(canonical)) continue;
    
    const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const aliasRegex = new RegExp(`\\b${escapedAlias}\\b`, 'gi');
    
    if (aliasRegex.test(lowerText)) {
      // Normalize to canonical form
      foundSkills.add(canonical);
    }
  }

  // Return as array, sorted alphabetically, with duplicates removed
  return Array.from(foundSkills).sort();
}

// =========================================
// END MASTER SKILL EXTRACTOR
// =========================================

// =========================================
// TASK 1: JOB MATCHING ENGINE
// =========================================

/**
 * Get matching skills between job requirements and user skills
 * @param jobSkills - Array of skills required by the job
 * @param userSkills - Array of skills detected from user's resume
 * @returns Array of matching skill IDs (normalized to lowercase for consistency)
 */
export function getJobMatch(jobSkills: string[], userSkills: string[]): string[] {
  if (!jobSkills || !userSkills || jobSkills.length === 0 || userSkills.length === 0) {
    return [];
  }

  // Normalize both skill arrays to lowercase for comparison
  const normalizedJobSkills = jobSkills.map(s => s.toLowerCase().trim());
  const normalizedUserSkills = userSkills.map(s => s.toLowerCase().trim());

  // Find matching skills
  const matches: string[] = [];
  
  for (const jobSkill of normalizedJobSkills) {
    // Check for exact match with word boundaries
    const isMatch = normalizedUserSkills.some(userSkill => {
      // Exact match
      if (userSkill === jobSkill) return true;
      
      // Check synonym mappings - if job skill maps to a canonical form that matches user skill
      const canonicalJob = getCanonicalSkill(jobSkill);
      const canonicalUser = getCanonicalSkill(userSkill);
      
      return canonicalJob === canonicalUser && canonicalJob !== '';
    });
    
    if (isMatch) {
      matches.push(jobSkill);
    }
  }

  return matches;
}

/**
 * Get canonical skill name from synonym mapping
 */
function getCanonicalSkill(skill: string): string {
  const lowerSkill = skill.toLowerCase().trim();
  
  // Check if it's a direct key in the mapping
  if (SKILL_SYNONYM_MAPPING[lowerSkill]) {
    return SKILL_SYNONYM_MAPPING[lowerSkill].toLowerCase();
  }
  
  // Check if it's a value in the mapping (reverse lookup)
  for (const [alias, canonical] of Object.entries(SKILL_SYNONYM_MAPPING)) {
    if (canonical.toLowerCase() === lowerSkill) {
      return canonical.toLowerCase();
    }
  }
  
  return lowerSkill;
}

// =========================================
// END JOB MATCHING ENGINE
// =========================================

export interface ResumeAnalysisResult {
  resume_health: {
    overall_score: number;
    skills_detected_count: number;
  };
  structural_integrity: {
    contact_info_score: number;
    experience_headers_score: number;
    keyword_density_score: number;
    overall_integrity_average: number;
  };
  feedback: {
    critical_issue: string | null;
    suggestion: string | null;
  };
}

// Hard Skills list for keyword density analysis (from user's requirements)
const HARD_SKILLS = [
  'react', 'angular', 'vue', 'svelte', 'next.js', 'react native', 'flutter',
  'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'ruby', 'go', 'rust', 'swift', 'kotlin', 'php', 'scala',
  'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'firebase', 'supabase',
  'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'jenkins', 'linux', 'nginx',
  'node.js', 'express', 'django', 'flask', 'spring', 'rails', 'laravel', 'fastapi', 'graphql', 'rest api',
  'git', 'agile', 'scrum', 'jira', 'figma', 'webpack', 'vite', 'npm', 'yarn',
  'tensorflow', 'pytorch', 'pandas', 'numpy', 'scikit-learn', 'machine learning', 'deep learning',
  'management', 'leadership', 'communication', 'teamwork', 'problem-solving', 'analytical',
  'marketing', 'sales', 'finance', 'accounting', 'business analysis', 'project management',
  'html', 'css', 'sass', 'less', 'tailwind', 'bootstrap', 'material-ui', 'chakra-ui',
  'figma', 'sketch', 'adobe xd', 'photoshop', 'illustrator',
  'excel', 'powerpoint', 'word', 'outlook', 'teams', 'slack',
  'data analysis', 'data science', 'data engineering', 'etl', 'pipeline',
  'testing', 'jest', 'cypress', 'selenium', 'playwright', 'mocha', 'chai',
  'security', 'oauth', 'jwt', 'ssl', 'https', 'api', 'rest', 'soap',
  'ci/cd', 'devops', 'mongodb', 'graphql'
];

// Common industry keywords for keyword density analysis
const INDUSTRY_KEYWORDS = [
  // Programming Languages
  'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'ruby', 'go', 'rust', 'swift', 'kotlin', 'php', 'scala', 'perl',
  // Frontend
  'react', 'angular', 'vue', 'svelte', 'next.js', 'react native', 'flutter', 'tailwind', 'css', 'html', 'sass', 'less',
  // Backend
  'node.js', 'express', 'django', 'flask', 'spring', 'rails', 'laravel', 'fastapi', 'asp.net', 'graphql', 'rest api',
  // Databases
  'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'firebase', 'supabase', 'prisma', 'sequelize',
  // Cloud & DevOps
  'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'jenkins', 'ci/cd', 'github actions', 'linux', 'nginx',
  // Tools & Methods
  'git', 'agile', 'scrum', 'jira', 'figma', 'webpack', 'vite', 'npm', 'yarn', 'pnpm',
  // Data & ML
  'python', 'tensorflow', 'pytorch', 'pandas', 'numpy', 'scikit-learn', 'data analysis', 'machine learning', 'deep learning',
  // Soft Skills & Management
  'leadership', 'communication', 'teamwork', 'problem-solving', 'analytical', 'project management',
  // Business
  'marketing', 'sales', 'finance', 'accounting', 'business analysis', 'strategic planning'
];

// Action verbs commonly used in resumes
const ACTION_VERBS = [
  'led', 'developed', 'managed', 'created', 'implemented', 'designed', 'built', 'organized',
  'coordinated', 'directed', 'executed', 'achieved', 'improved', 'increased', 'reduced',
  'optimized', 'analyzed', 'presented', 'negotiated', 'collaborated', 'facilitated'
];

// Experience section headings
const EXPERIENCE_HEADERS = [
  'experience', 'work experience', 'professional experience', 
  'work history', 'employment history', 'employment', 'professional background',
  'career summary', 'work summary'
];

// Education section headings
const EDUCATION_HEADERS = [
  'education', 'academic background', 'academic history', 'qualifications', 'degree'
];

// Skills section headings
const SKILLS_HEADERS = [
  'skills', 'technical skills', 'core competencies', 'areas of expertise', 'key skills'
];

// IMPROVEMENT 2: Better Resume Section Detection
// Uses regex patterns to detect the four main resume sections

// Education section patterns
const EDUCATION_SECTION_REGEX = /education|academic background|academic qualification|academic history|qualifications|degree program/i;

// Experience section patterns
const EXPERIENCE_SECTION_REGEX = /experience|work experience|professional experience|employment history|work history|professional background|career summary|work summary/i;

// Skills section patterns
const SKILLS_SECTION_REGEX = /skills|technical skills|core competencies|areas of expertise|key skills|technologies|technical expertise/i;

// Projects section patterns
const PROJECTS_SECTION_REGEX = /projects|personal projects|academic projects|portfolio|project experience/i;

/**
 * IMPROVEMENT 2: Checks if the uploaded document appears to be a valid resume
 * Uses regex patterns to detect the four main resume sections:
 * Education, Experience, Skills, Projects
 * 
 * @param text - The extracted text from the PDF
 * @returns { isValid: boolean, detectedSections: string[], missingSections: string[] }
 */
export function checkResumeAuthenticity(text: string): { 
  isValid: boolean; 
  detectedSections: string[];
  missingSections: string[];
} {
  if (!text || text.length < 10) {
    return {
      isValid: true,
      detectedSections: [],
      missingSections: []
    };
  }

  const detectedSections: string[] = [];
  const missingSections: string[] = [];

  // Check for Education section
  if (EDUCATION_SECTION_REGEX.test(text)) {
    detectedSections.push('Education');
  } else {
    missingSections.push('Education');
  }

  // Check for Experience section
  if (EXPERIENCE_SECTION_REGEX.test(text)) {
    detectedSections.push('Experience');
  } else {
    missingSections.push('Experience');
  }

  // Check for Skills section
  if (SKILLS_SECTION_REGEX.test(text)) {
    detectedSections.push('Skills');
  } else {
    missingSections.push('Skills');
  }

  // Check for Projects section
  if (PROJECTS_SECTION_REGEX.test(text)) {
    detectedSections.push('Projects');
  } else {
    missingSections.push('Projects');
  }

  // A document is considered a valid resume if at least two of these sections are detected
  const isValid = detectedSections.length >= 2;

  return {
    isValid,
    detectedSections,
    missingSections
  };
}

// PDF.js types
interface PDFJSItem {
  str: string;
}

interface PDFJSTextContent {
  items: PDFJSItem[];
}

interface WindowWithPDF {
  pdfjsLib: {
    getDocument: (config: { data: ArrayBuffer }) => {
      promise: {
        numPages: number;
        getPage: (pageNum: number) => Promise<{
          getTextContent: () => Promise<PDFJSTextContent>;
        }>;
      };
    };
  };
}

export async function analyzeResume(file: File, _userSkills: string[]): Promise<ResumeAnalysisResult> {
  // 1️⃣ Extract text from PDF
  const text = await extractTextFromPDF(file);

  // 2️⃣ Ask AI to extract skills from the text
  const aiSkills = await extractSkillsWithAI(text);

  // 3️⃣ Also run your existing regex skill extractor
  const detectedSkills = extractActualSkills(text);

  // 4️⃣ Combine both results (remove duplicates)
  const finalSkills = [...new Set([...detectedSkills, ...aiSkills])];
  
  if (!text || text.length < 50) {
    // Return minimum scores if no text extracted
    return {
      resume_health: { overall_score: 0, skills_detected_count: 0 },
      structural_integrity: {
        contact_info_score: 0,
        experience_headers_score: 0,
        keyword_density_score: 0,
        overall_integrity_average: 0
      },
      feedback: {
        critical_issue: 'Could not extract text from resume. Please ensure it is a valid PDF.',
        suggestion: 'Try uploading a text-based PDF instead of a scanned image.'
      }
    };
  }

  const lowerText = text.toLowerCase();
  const wordCount = text.split(/\s+/).length;

  // 1. Contact Information Integrity (33%)
  const contactResult = analyzeContactInfo(text, lowerText);
  
  // 2. Experience Headers Integrity (33%)
  const experienceResult = analyzeExperienceHeaders(lowerText, text);
  
  // 3. Keyword Density & Skills (34%)
  const keywordResult = analyzeKeywordDensity(lowerText, wordCount);

  // Calculate overall integrity average
  const overallIntegrityAverage = Math.round(
    (contactResult.score + experienceResult.score + keywordResult.score) / 3
  );

  // Overall resume health score (same as integrity for now)
  const overallScore = overallIntegrityAverage;

  // Generate feedback
  const feedback = generateFeedback(contactResult, experienceResult, keywordResult);

  return {
    resume_health: {
      overall_score: overallScore,
skills_detected_count: finalSkills.length    },
    structural_integrity: {
      contact_info_score: contactResult.score,
      experience_headers_score: experienceResult.score,
      keyword_density_score: keywordResult.score,
      overall_integrity_average: overallIntegrityAverage
    },
    feedback
  };
}

async function extractTextFromPDF(file: File): Promise<string> {
  try {
    // Try to use pdf.js if available in browser
    if (typeof window !== 'undefined' && 'pdfjsLib' in window) {
      const pdfjsLib = (window as WindowWithPDF).pdfjsLib;
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: PDFJSItem) => item.str).join(' ');
        fullText += pageText + '\n';
      }
      
      return fullText;
    }
    
    // Fallback: Read as plain text (works for text-based PDFs)
    const text = await file.text();
    return text;
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    return '';
  }
}

function analyzeContactInfo(text: string, lowerText: string): { score: number; missing: string[] } {
  const missing: string[] = [];
  const found: string[] = [];

  // Email: Valid email regex
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  if (emailRegex.test(text)) {
    found.push('email');
  } else {
    missing.push('email');
  }

  // Phone: 10+ digit numerical string
  const phoneRegex = /\b\d{10,}\b|\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/;
  if (phoneRegex.test(text)) {
    found.push('phone');
  } else {
    missing.push('phone');
  }

  // Location: City, State, or Zip Code
  const locationPatterns = [
    /\b[A-Z][a-z]+,\s*[A-Z]{2}\b/,  // City, State (e.g., New York, NY)
    /\b\d{5}(?:-\d{4})?\b/,          // Zip code (e.g., 12345 or 12345-6789)
    /\b[A-Z][a-z]+,\s*[A-Z][a-z]+\b/ // City, Country
  ];
  const hasLocation = locationPatterns.some(pattern => pattern.test(text));
  if (hasLocation) {
    found.push('location');
  } else {
    missing.push('location');
  }

  // LinkedIn/URL: Presence of professional profile link
  const linkedInRegex = /linkedin\.com\/in\/|github\.com\/|portfolio|personal website/i;
  if (linkedInRegex.test(text)) {
    found.push('linkedin');
  } else {
    missing.push('linkedin');
  }

  // Calculate score: Start at 100, deduct 25 for each missing element
  const deduction = missing.length * 25;
  const score = Math.max(0, 100 - deduction);

  return { score, missing };
}

function analyzeExperienceHeaders(lowerText: string, originalText: string): { 
  score: number; 
  missingHeaders: string[];
  hasDateIssues: boolean;
} {
  const missingHeaders: string[] = [];
  let hasDateIssues = false;

  // Check for Experience section
  const hasExperience = EXPERIENCE_HEADERS.some(h => lowerText.includes(h));
  if (!hasExperience) missingHeaders.push('experience');

  // Check for Education section
  const hasEducation = EDUCATION_HEADERS.some(h => lowerText.includes(h));
  if (!hasEducation) missingHeaders.push('education');

  // Check for Skills section
  const hasSkills = SKILLS_HEADERS.some(h => lowerText.includes(h));
  if (!hasSkills) missingHeaders.push('skills');

  // Check for Work History (Experience is sufficient, but check if explicitly mentioned)
  const hasWorkHistory = lowerText.includes('work history') || lowerText.includes('employment');

  // Check dates formatting
  const datePattern = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]+(?:20|19)\d{2}\b|\b(?:20|19)\d{2}[\s,-]+(?:present|current)/gi;
  const datesFound = originalText.match(datePattern) || [];
  
  // Check if dates are in reverse chronological order (basic check)
  if (datesFound.length > 1) {
    // Extract years and check order
    const years = datesFound.map(d => {
      const yearMatch = d.match(/(20|19)\d{2}/);
      return yearMatch ? parseInt(yearMatch[0], 10) : 0;
    });
    
    // Check if years are decreasing (reverse chronological)
    for (let i = 0; i < years.length - 1; i++) {
      if (years[i] < years[i + 1]) {
        hasDateIssues = true;
        break;
      }
    }
  }

  // Check if dates are associated with entries (at least some dates found)
  const hasDateAssociation = datesFound.length >= 2;

  // Calculate score
  let score = 100;
  
  // Deduct 20 points for each missing header section (max 3 = 60 points)
  score -= missingHeaders.length * 20;
  
  // Deduct 15 points if dates have issues
  if (hasDateIssues) {
    score -= 15;
  }

  // Deduct if no date associations found (unparseable dates)
  if (!hasDateAssociation && datesFound.length === 0) {
    score -= 10;
  }

  return { 
    score: Math.max(0, score), 
    missingHeaders,
    hasDateIssues 
  };
}

function analyzeKeywordDensity(lowerText: string, wordCount: number): { 
  score: number; 
  skillsFound: number;
  skillRatio: number;
  actionVerbCount: number;
} {
  const detectedSkills: string[] = [];
  
  // Find matching keywords
  for (const keyword of INDUSTRY_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      detectedSkills.push(keyword);
    }
  }

  // Count action verbs
  let actionVerbCount = 0;
  for (const verb of ACTION_VERBS) {
    const verbPattern = new RegExp(`\\b${verb}\\w*\\b`, 'gi');
    const matches = lowerText.match(verbPattern);
    if (matches) {
      actionVerbCount += matches.length;
    }
  }

  // Calculate skill-to-word ratio (5-10% is healthy)
  const skillRatio = (detectedSkills.length / wordCount) * 100;
  
  // Calculate score
  let score = 0;
  
  // Base score from skill count
  if (detectedSkills.length < 5) {
    // Score 0 if fewer than 5 skills
    score = 0;
  } else if (detectedSkills.length >= 5 && detectedSkills.length < 10) {
    score = 50;
  } else if (detectedSkills.length >= 10 && detectedSkills.length < 15) {
    score = 75;
  } else {
    // 15+ skills = 100
    score = 100;
  }

  // Bonus for action verbs (max +10)
  if (actionVerbCount >= 5) {
    score = Math.min(100, score + 10);
  }

  // Penalty for poor ratio (too few or too many keywords)
  if (skillRatio < 2) {
    score = Math.max(0, score - 15); // Too few keywords
  } else if (skillRatio > 15) {
    score = Math.max(0, score - 10); // Keyword stuffing suspicion
  }

  return { 
    score: Math.max(0, Math.min(100, score)), 
    skillsFound: detectedSkills.length,
    skillRatio,
    actionVerbCount
  };
}

function generateFeedback(
  contactResult: { score: number; missing: string[] },
  experienceResult: { score: number; missingHeaders: string[]; hasDateIssues: boolean },
  keywordResult: { score: number; skillsFound: number }
): { critical_issue: string | null; suggestion: string | null } {
  const issues: string[] = [];
  const suggestions: string[] = [];

  // Contact info issues
  if (contactResult.missing.includes('email')) {
    issues.push('Missing email address');
  }
  if (contactResult.missing.includes('phone')) {
    issues.push('Missing phone number');
  }
  if (contactResult.missing.includes('location')) {
    issues.push('Missing location in contact info');
  }
  if (contactResult.missing.includes('linkedin')) {
    suggestions.push('Add a LinkedIn profile URL or personal portfolio link');
  }

  // Experience header issues
  if (experienceResult.missingHeaders.includes('experience')) {
    issues.push('Missing Experience section');
    suggestions.push('Add an Experience section with your work history');
  }
  if (experienceResult.missingHeaders.includes('education')) {
    issues.push('Missing Education section');
  }
  if (experienceResult.missingHeaders.includes('skills')) {
    suggestions.push('Add a Skills section listing your technical competencies');
  }
  if (experienceResult.hasDateIssues) {
    suggestions.push('Ensure your work dates follow a standard MM/YYYY format for ATS readability');
  }

  // Keyword density issues
  if (keywordResult.skillsFound < 5) {
    issues.push('Too few skills detected (less than 5)');
    suggestions.push('Add more industry-relevant keywords to improve ATS matching');
  }

  // Determine critical issue (most impactful)
  let criticalIssue: string | null = null;
  if (contactResult.missing.length >= 2) {
    criticalIssue = 'Missing critical contact information.';
  } else if (experienceResult.missingHeaders.length >= 2) {
    criticalIssue = 'Missing essential resume sections.';
  } else if (keywordResult.skillsFound < 5) {
    criticalIssue = 'Insufficient keywords for ATS matching.';
  } else if (issues.length > 0) {
    criticalIssue = issues[0];
  }

  // Single suggestion
  const suggestion = suggestions.length > 0 ? suggestions[0] : null;

  return { critical_issue: criticalIssue, suggestion };
}

// Validation helpers
export function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (file.type !== 'application/pdf') {
    return { valid: false, error: 'Please upload a PDF file' };
  }
  
  // Check file size (5MB max)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 5MB' };
  }
  
  return { valid: true };
}

// =========================================
// STRICT SCORING RULES (User Requirements)
// =========================================

// Required experience headers per user specification
const REQUIRED_EXPERIENCE_HEADERS = [
  'experience', 'education', 'projects', 'skills', 'summary'
];

/**
 * STRICT Contact Info Scoring (33%)
 * - Score 100 if Email + Phone (10+ digits) + Location (City/State) found
 * - Deduct 33 for each missing element
 */
function analyzeContactInfoStrict(text: string): { score: number; missing: string[] } {
  const missing: string[] = [];
  
  // Email: Valid email regex
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const hasEmail = emailRegex.test(text);
  if (!hasEmail) missing.push('email');
  
  // Phone: 10+ digits (handles various formats like 1234567890, (123) 456-7890, etc.)
  const phoneRegex = /\b\d{10,}\b|\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/;
  const hasPhone = phoneRegex.test(text);
  if (!hasPhone) missing.push('phone');
  
  // Location: City/State keywords (e.g., New York, NY or city name followed by state)
  const locationRegex = /\b[A-Z][a-z]+(?:,\s*)?(?:[A-Z]{2}|USA|NY|CA|TX|FL|IL|PA|OH|GA|NC|MI|NJ|VA|WA|AZ|CO|MA|TN|MO|MD|MN|WI|IN|OR|SC|CT|OK|KY|LA|AL|UT|NV|NM|WV|NE|ID|HI|ME|NH|RI|MT|DE|SD|ND|AK|VT|WY|DC)\b/i;
  const hasLocation = locationRegex.test(text);
  if (!hasLocation) missing.push('location');
  
  // Calculate score: Start at 100, deduct 33 for each missing
  const score = 100 - (missing.length * 33);
  
  return { score: Math.max(0, score), missing };
}

/**
 * STRICT Experience Headers Scoring (33%)
 * - Score 100 if at least 3 headers from [Experience, Education, Projects, Skills, Summary] found
 * - Otherwise score 0
 */
function analyzeExperienceHeadersStrict(lowerText: string): { score: number; foundHeaders: string[]; requiredHeaders: string[] } {
  const foundHeaders: string[] = [];
  
  for (const header of REQUIRED_EXPERIENCE_HEADERS) {
    if (lowerText.includes(header)) {
      foundHeaders.push(header);
    }
  }
  
  // Score 100 if 3+ headers found, otherwise 0
  const score = foundHeaders.length >= 3 ? 100 : 0;
  
  return { 
    score, 
    foundHeaders,
    requiredHeaders: REQUIRED_EXPERIENCE_HEADERS
  };
}

/**
 * STRICT Keyword Density Scoring (34%)
 * - Count 'Hard Skills' from predefined list
 * - Score 100 if >8 skills found
 * - Score 50 if 4-7 skills found
 * - Score 0 if <4 skills found
 */
function analyzeKeywordDensityStrict(lowerText: string): { score: number; skillsFound: string[] } {
  const skillsFound: string[] = [];
  
  // Count hard skills from the predefined list
  for (const skill of HARD_SKILLS) {
    if (lowerText.includes(skill)) {
      // Avoid duplicates (some skills are substrings of others)
      if (!skillsFound.includes(skill)) {
        skillsFound.push(skill);
      }
    }
  }
  
  // Apply strict scoring rules
  let score = 0;
  if (skillsFound.length > 8) {
    score = 100;
  } else if (skillsFound.length >= 4 && skillsFound.length <= 7) {
    score = 50;
  } else {
    score = 0; // <4 skills = 0
  }
  
  return { score, skillsFound };
}

/**
 * Main function implementing the user's exact scoring rules
 * Contact Info (33%) + Experience Headers (33%) + Keyword Density (34%)
 */
export async function analyzeResumeStrict(file: File): Promise<ResumeAnalysisResult> {
  // Extract text from PDF
  const text = await extractTextFromPDF(file);
  
  if (!text || text.length < 50) {
    return {
      resume_health: { overall_score: 0, skills_detected_count: 0 },
      structural_integrity: {
        contact_info_score: 0,
        experience_headers_score: 0,
        keyword_density_score: 0,
        overall_integrity_average: 0
      },
      feedback: {
        critical_issue: 'Could not extract text from resume. Please ensure it is a valid PDF.',
        suggestion: 'Try uploading a text-based PDF instead of a scanned image.'
      }
    };
  }
  
  const lowerText = text.toLowerCase();
  
  // Apply strict scoring rules
  const contactResult = analyzeContactInfoStrict(text);
  const experienceResult = analyzeExperienceHeadersStrict(lowerText);
  const keywordResult = analyzeKeywordDensityStrict(lowerText);
  
  // Calculate weighted overall score
  // Contact Info: 33%, Experience Headers: 33%, Keyword Density: 34%
  const overallIntegrityAverage = Math.round(
    (contactResult.score * 0.33) + (experienceResult.score * 0.33) + (keywordResult.score * 0.34)
  );
  
  // Generate feedback based on what's missing
  const issues: string[] = [];
  const suggestions: string[] = [];
  
  if (contactResult.missing.length > 0) {
    if (contactResult.missing.includes('email')) {
      issues.push('Missing email address');
      suggestions.push('Add a professional email address to your contact info');
    }
    if (contactResult.missing.includes('phone')) {
      issues.push('Missing phone number');
      suggestions.push('Add a contact phone number');
    }
    if (contactResult.missing.includes('location')) {
      issues.push('Missing location (City, State)');
      suggestions.push('Add your city and state to contact information');
    }
  }
  
  if (experienceResult.foundHeaders.length < 3) {
    issues.push(`Only ${experienceResult.foundHeaders.length}/5 required sections found`);
    const missing = REQUIRED_EXPERIENCE_HEADERS.filter(h => !experienceResult.foundHeaders.includes(h));
    suggestions.push(`Add these missing sections: ${missing.join(', ')}`);
  }
  
  if (keywordResult.skillsFound.length < 4) {
    issues.push(`Only ${keywordResult.skillsFound.length} skills detected (need at least 4)`);
    suggestions.push('Add more technical skills like React, SQL, Python, Management, etc.');
  }
  
  const criticalIssue = issues.length > 0 ? issues[0] : null;
  const suggestion = suggestions.length > 0 ? suggestions[0] : null;
  
  return {
    resume_health: {
      overall_score: overallIntegrityAverage,
      skills_detected_count: keywordResult.skillsFound.length
    },
    structural_integrity: {
      contact_info_score: contactResult.score,
      experience_headers_score: experienceResult.score,
      keyword_density_score: keywordResult.score,
      overall_integrity_average: Math.round((contactResult.score + experienceResult.score + keywordResult.score) / 3)
    },
    feedback: {
      critical_issue: criticalIssue,
      suggestion: suggestion
    }
  };
}

