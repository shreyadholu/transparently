import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';
import { validateFile, analyzeResumeStrict, ResumeAnalysisResult, extractActualSkills, checkResumeAuthenticity } from '@/lib/resumeAnalysis';
import { extractTextFromPDF } from '@/lib/pdfExtractor';
import { Upload, Plus, X, UserCircle, FileText, CheckCircle2, Loader2, AlertCircle, File, CloudUpload, AlertTriangle } from 'lucide-react';

interface ResumeAnalysisData {
  overall_score: number;
  contact_info_score: number;
  experience_headers_score: number;
  keyword_density_score: number;
  overall_integrity_average: number;
  skills_detected_count: number;
  critical_issue: string | null;
  suggestion: string | null;
}

const Profile = () => {
  const { user, updateSkills, uploadResume } = useApp();
  const [newSkill, setNewSkill] = useState('');
  const [uploaded, setUploaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [resumeAnalysis, setResumeAnalysis] = useState<ResumeAnalysisData | null>(null);
  
  // Form fields
  const [education, setEducation] = useState('');
  const [university, setUniversity] = useState('');
  const [cgpa, setCgpa] = useState('');

  const handleAddSkill = () => {
    if (!newSkill.trim() || !user) return;
    updateSkills([...user.skills, newSkill.trim()]);
    setNewSkill('');
  };

  const handleRemoveSkill = (skill: string) => {
    if (!user) return;
    updateSkills(user.skills.filter(s => s !== skill));
  };

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const processFile = async (file: File) => {
    setError(null);
    
    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    if (!user?.id) {
      setError('User not logged in');
      console.error('Upload failed: User not logged in or user.id is undefined');
      return;
    }

    setUploading(true);
    setAnalyzing(true);

    try {
      // FIXED: Use correct upload path: resumes/{user_id}/resume.pdf
      const fileName = `${user.id}/resume.pdf`;
      
      // DEBUG: Log upload details
      console.log('=== RESUME UPLOAD DEBUG ===');
      console.log('User ID:', user.id);
      console.log('File Name:', file.name);
      console.log('File Type:', file.type);
      console.log('File Path:', fileName);
      console.log('Bucket:', 'resumes');
      console.log('===========================');
      
      // Delete old resume if exists
      if (user?.resumeUploaded) {
        try {
          const { data: existingFiles, error: listError } = await supabase.storage
            .from('resumes')
            .list(`${user.id}`);
          
          console.log('Existing files list response:', { data: existingFiles, error: listError });
          
          if (existingFiles && existingFiles.length > 0) {
            const filesToDelete = existingFiles.map(f => `${user.id}/${f.name}`);
            console.log('Deleting old files:', filesToDelete);
            const { error: deleteError } = await supabase.storage.from('resumes').remove(filesToDelete);
            console.log('Delete response:', { error: deleteError });
          }
        } catch (e) {
          console.log('No existing resume to delete or error:', e);
        }
      }

      // Upload new resume with proper contentType
      console.log('Starting upload to Supabase Storage...');
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(fileName, file, {
          upsert: true, // Overwrite if exists
          contentType: "application/pdf"
        });

      // DEBUG: Log upload response
      console.log('=== UPLOAD RESPONSE ===');
      console.log('Upload Data:', uploadData);
      console.log('Upload Error:', uploadError);
      console.log('=======================');

      if (uploadError) {
        console.error('Error uploading resume:', uploadError);
        console.error('Error code:', uploadError.code);
        console.error('Error message:', uploadError.message);
        console.error('Error status:', uploadError.status);
        setError(`Failed to upload resume: ${uploadError.message}`);
        setUploading(false);
        setAnalyzing(false);
        return;
      }

      // Get public URL
      const { data: urlData, error: urlError } = supabase.storage
        .from('resumes')
        .getPublicUrl(fileName);

      console.log('Public URL response:', { data: urlData, error: urlError });

      const resumeUrl = urlData?.publicUrl;
      console.log('Resume URL:', resumeUrl);

      // STEP 1: Extract PDF text using pdfjs-dist
      let resumeText = '';
      try {
        resumeText = await extractTextFromPDF(file);
        console.log('Extracted PDF text length:', resumeText.length);
      } catch (e) {
        console.warn('Could not extract text using pdfjs, trying fallback:', e);
        // Fallback to basic text extraction
        try {
          resumeText = await file.text();
        } catch (fallbackError) {
          console.error('Fallback text extraction also failed:', fallbackError);
        }
      }

      // STEP 2: Resume Authenticity Check
      // Check if the document resembles a resume by looking for common resume keywords
      const authenticityCheck = checkResumeAuthenticity(resumeText);
      
      if (!authenticityCheck.isValid) {
        setError('Uploaded PDF does not appear to be a valid resume. Please ensure your document includes at least two of these sections: Education, Experience, Skills, or Projects.');
        setUploading(false);
        setAnalyzing(false);
        // Don't proceed with analysis if not a valid resume
        return;
      }

      // STEP 3: Extract skills from the resume text
      const extractedSkills = extractActualSkills(resumeText);
      console.log('Extracted skills from resume:', extractedSkills);
      
      // STEP 4: Analyze the resume using strict scoring rules
      const analysisResult: ResumeAnalysisResult = await analyzeResumeStrict(file);
      
      const analysisData: ResumeAnalysisData = {
        overall_score: analysisResult.resume_health.overall_score,
        contact_info_score: analysisResult.structural_integrity.contact_info_score,
        experience_headers_score: analysisResult.structural_integrity.experience_headers_score,
        keyword_density_score: analysisResult.structural_integrity.keyword_density_score,
        overall_integrity_average: analysisResult.structural_integrity.overall_integrity_average,
        skills_detected_count: analysisResult.resume_health.skills_detected_count,
        critical_issue: analysisResult.feedback.critical_issue,
        suggestion: analysisResult.feedback.suggestion
      };

      setResumeAnalysis(analysisData);

      // STEP 5: Save profile to Supabase with analysis data
      const { error: profileError } = await supabase.from('student_profiles').upsert({
        user_id: user?.id,
        education: education || null,
        university: university || null,
        cgpa: cgpa ? parseFloat(cgpa) : null,
        resume_url: resumeUrl,
        resume_score: analysisData.overall_integrity_average,
        contact_score: analysisData.contact_info_score,
        experience_score: analysisData.experience_headers_score,
        keyword_score: analysisData.keyword_density_score,
        skill_coverage_score: analysisData.keyword_density_score
      }, {
        onConflict: 'user_id'
      });

      if (profileError) {
        console.error('Error saving profile:', profileError);
      }

      // STEP 6: Save extracted skills to skills table
      // First delete existing skills for this user to avoid duplicates
      await supabase.from('skills').delete().eq('user_id', user?.id);

      // Use the extractedSkills from the resume analysis
      const skillsToSave = extractedSkills;

      if (skillsToSave.length > 0) {
        const skillsToInsert = skillsToSave.map((skill: string) => ({
          user_id: user?.id,
          skill_name: skill
        }));

        const { error: skillsError } = await supabase
          .from('skills')
          .insert(skillsToInsert);

        if (skillsError) {
          console.error('Error saving skills:', skillsError);
        } else {
          console.log('Successfully saved skills to database:', skillsToSave);
        }
      }

      // Update local state
      uploadResume();
      setUploaded(true);
      setTimeout(() => setUploaded(false), 3000);
    } catch (err) {
      console.error('Error in upload process:', err);
      setError('An error occurred while processing your resume. Please try again.');
    } finally {
      setUploading(false);
      setAnalyzing(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      processFile(files[0]);
    }
  }, [user, education, university, cgpa]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleSaveProfile = async () => {
    if (!user?.id) return;

    // Save profile without resume upload
    const { error } = await supabase.from('student_profiles').upsert({
      user_id: user.id,
      education: education || null,
      university: university || null,
      cgpa: cgpa ? parseFloat(cgpa) : null,
      resume_url: user.resumeUploaded ? null : null
    }, {
      onConflict: 'user_id'
    });

    if (error) {
      console.error('Error saving profile:', error);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your resume and skills</p>
      </div>

      {/* Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6"
      >
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <UserCircle className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{user?.name}</h2>
            <p className="text-muted-foreground">{user?.email}</p>
          </div>
        </div>
      </motion.div>

      {/* Education Details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass-card p-6"
      >
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" /> Education Details
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">Education Level</label>
            <select
              value={education}
              onChange={(e) => setEducation(e.target.value)}
              className="glass-input w-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Select education level</option>
              <option value="High School">High School</option>
              <option value="Associate">Associate Degree</option>
              <option value="Bachelor">Bachelor's Degree</option>
              <option value="Master">Master's Degree</option>
              <option value="PhD">PhD</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">University/Institution</label>
            <input
              type="text"
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
              placeholder="e.g. MIT, Stanford University"
              className="glass-input w-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">CGPA (0.0 - 4.0)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="4.0"
              value={cgpa}
              onChange={(e) => setCgpa(e.target.value)}
              placeholder="e.g. 3.8"
              className="glass-input w-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSaveProfile}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium flex items-center gap-1"
          >
            <CheckCircle2 className="w-4 h-4" /> Save Profile
          </motion.button>
        </div>
      </motion.div>

      {/* Resume Upload with Drag & Drop */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-6"
      >
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-primary" /> Resume Upload
        </h3>
        
        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upload Area */}
        <label 
          className={`cursor-pointer w-full block transition-all ${
            dragActive ? 'scale-[1.02]' : ''
          }`}
        >
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className="hidden"
            disabled={uploading}
          />
          <motion.div
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className={`w-full py-10 border-2 border-dashed rounded-xl flex flex-col items-center gap-4 transition-all ${
              dragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-border/50 hover:border-primary/50'
            } ${
              uploading || analyzing ? 'pointer-events-none opacity-70' : ''
            }`}
          >
            {uploading || analyzing ? (
              <>
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <div className="text-center">
                  <p className="text-sm font-medium text-primary">
                    {analyzing ? 'Analyzing resume for ATS compliance...' : 'Uploading...'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {analyzing ? 'Evaluating structural integrity' : 'Please wait'}
                  </p>
                </div>
              </>
            ) : uploaded || user?.resumeUploaded ? (
              <>
                <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-success" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-success">Resume uploaded!</p>
                  <p className="text-xs text-muted-foreground mt-1">Click to upload a new one</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <CloudUpload className="w-8 h-8 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">Drag & drop your PDF resume here</p>
                  <p className="text-xs text-muted-foreground mt-1">or click to browse (max 5MB)</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <File className="w-3 h-3" />
                  <span>PDF only</span>
                </div>
              </>
            )}
          </motion.div>
        </label>

        {/* Analysis Results */}
        <AnimatePresence>
          {resumeAnalysis && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 pt-6 border-t border-border/30"
            >
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> ATS Structural Integrity Analysis
              </h4>
              
              {/* Critical Issue Alert */}
              {resumeAnalysis.critical_issue && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{resumeAnalysis.critical_issue}</p>
                </div>
              )}

              {/* Suggestion */}
              {resumeAnalysis.suggestion && (
                <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-start gap-2">
                  <FileText className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-primary">{resumeAnalysis.suggestion}</p>
                </div>
              )}

              {/* Overall Score */}
              <div className="mb-4 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Overall Resume Score</span>
                  <span className="text-2xl font-bold text-primary">{resumeAnalysis.overall_integrity_average}/100</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {resumeAnalysis.skills_detected_count} industry keywords detected
                </p>
              </div>

              {/* Detailed Scores */}
              <div className="grid grid-cols-3 gap-3">
                {/* Contact Info */}
                <div className="p-3 rounded-lg bg-muted/30">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-muted-foreground">Contact Info</span>
                    <span className="text-sm font-bold text-primary">{resumeAnalysis.contact_info_score}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${resumeAnalysis.contact_info_score}%` }}
                      className="h-full bg-primary rounded-full"
                    />
                  </div>
                </div>

                {/* Experience Headers */}
                <div className="p-3 rounded-lg bg-muted/30">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-muted-foreground">Experience</span>
                    <span className="text-sm font-bold text-primary">{resumeAnalysis.experience_headers_score}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${resumeAnalysis.experience_headers_score}%` }}
                      className="h-full bg-accent rounded-full"
                    />
                  </div>
                </div>

                {/* Keyword Density */}
                <div className="p-3 rounded-lg bg-muted/30">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-muted-foreground">Keywords</span>
                    <span className="text-sm font-bold text-primary">{resumeAnalysis.keyword_density_score}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${resumeAnalysis.keyword_density_score}%` }}
                      className="h-full bg-success rounded-full"
                    />
                  </div>
                </div>
              </div>

              {/* Score Legend */}
              <div className="mt-4 text-xs text-muted-foreground">
                <p className="font-medium mb-1">Scoring Criteria:</p>
                <ul className="space-y-1 ml-2">
                  <li>• Contact Info: Email, Phone, Location, LinkedIn (33%)</li>
                  <li>• Experience: Headers, Dates, Chronology (33%)</li>
                  <li>• Keywords: Skills density, Action verbs (34%)</li>
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Skills */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-6"
      >
        <h3 className="font-semibold mb-4">Skills</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {user?.skills.map((skill) => (
            <motion.span
              key={skill}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20"
            >
              {skill}
              <button onClick={() => handleRemoveSkill(skill)} className="hover:text-destructive transition-colors">
                <X className="w-3 h-3" />
              </button>
            </motion.span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
            placeholder="Add a skill..."
            className="glass-input flex-1 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleAddSkill}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> Add
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

export default Profile;

