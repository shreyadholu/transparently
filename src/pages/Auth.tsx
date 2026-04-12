import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp, Role } from '@/contexts/AppContext';
import { User, Shield, ArrowRight, Sparkles, Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from "../lib/supabase"
import { toast } from 'sonner';

const Auth = () => {
  const [role, setRole] = useState<Role>('student');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useApp();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !password) return;

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .or(`full_name.eq.${name},email.eq.${name}`)
      .eq("password", password)
      .eq("role", role)
      .single();

    if (error || !data) {
      console.error('Login error:', error);
      toast.error("Invalid credentials. Please check your username/email and password.");
      return;
    }

    toast.success(`Welcome back, ${data.full_name}!`);

    login(data.full_name, data.email, data.role, data.id);
    navigate(role === 'student' ? '/student' : '/admin');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-hero" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-accent/5 blur-3xl" />

      {/* 3D Grid */}
      <div className="absolute inset-0 overflow-hidden opacity-[0.03]">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
          transform: 'perspective(500px) rotateX(60deg) scale(2)',
          transformOrigin: 'center top',
        }} />
      </div>

      {/* Floating 3D shapes */}
      <motion.div
        className="absolute top-20 left-20 w-20 h-20 rounded-2xl border border-primary/10 bg-primary/5 backdrop-blur-sm"
        animate={{ y: [0, -15, 0], rotateZ: [0, 5, -5, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transform: 'perspective(200px) rotateY(-10deg) rotateX(10deg)' }}
      />
      <motion.div
        className="absolute bottom-32 right-32 w-14 h-14 rounded-xl border border-accent/10 bg-accent/5 backdrop-blur-sm"
        animate={{ y: [0, -20, 0], rotateZ: [0, -8, 8, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        style={{ transform: 'perspective(200px) rotateY(15deg) rotateX(-5deg)' }}
      />
      <motion.div
        className="absolute top-1/3 right-20 w-10 h-10 rounded-full border border-primary/10 bg-primary/5"
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            className="inline-flex items-center gap-2 mb-4"
          >
            <Sparkles className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-gradient-primary">Transparently</h1>
          </motion.div>
          <p className="text-muted-foreground">Transparent Resume Shortlisting</p>
        </div>

        {/* Card */}
        <div className="elevated-card p-8">
          {/* Role Toggle */}
          <div className="flex rounded-xl bg-muted/50 p-1.5 mb-8 relative">
            <motion.div
              className="absolute top-1.5 bottom-1.5 rounded-lg bg-gradient-to-r from-primary to-accent"
              layout
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{
                left: role === 'student' ? '6px' : '50%',
                width: 'calc(50% - 9px)',
              }}
            />
            {(['student', 'recruiter'] as Role[]).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-300 relative z-10 ${role === r
                    ? 'text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                {r === 'student' ? <User className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                {r === 'student' ? 'Student' : 'Recruiter'}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.form
              key={role}
              initial={{ opacity: 0, x: role === 'student' ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: role === 'student' ? 20 : -20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Email or Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={role === 'student' ? 'Email or Full Name' : 'Email or Manager Name'}
                    className="glass-input w-full pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="glass-input w-full pl-10 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted/50 rounded-lg transition-colors text-muted-foreground"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg hover:shadow-primary/25 transition-all"
              >
                Sign In as {role === 'student' ? 'Student' : 'Recruiter'}
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </motion.form>
          </AnimatePresence>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary hover:underline font-medium">
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;

