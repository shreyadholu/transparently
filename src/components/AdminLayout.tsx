import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { LayoutDashboard, PlusCircle, Users, LogOut, Sparkles, Menu, X, FolderOpen } from 'lucide-react';
import { useState } from 'react';
import { ThemeToggle } from './ThemeToggle';

const links = [
  { to: '/admin', icon: LayoutDashboard, label: 'Overview', end: true },
  { to: '/admin/jobs', icon: PlusCircle, label: 'Job Management' },
  { to: '/admin/active-postings', icon: FolderOpen, label: 'Active Postings' },
  { to: '/admin/applicants', icon: Users, label: 'Applicants' },
];

const AdminLayout = () => {
  const { user, logout } = useApp();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const sidebarContent = (
    <>
      <div className="p-6 border-b border-border/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <span className="text-lg font-bold text-gradient-primary">Transparently</span>
          </div>
          {isMobile && (
            <button onClick={() => setSidebarOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-primary/60 mt-2 block">Admin Portal</span>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {links.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => isMobile && setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'sidebar-active-item bg-primary/10 text-primary glow-border-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-border/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold">
              {user?.name?.[0] || 'R'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <ThemeToggle />
          <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex">
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 z-30 h-14 backdrop-blur-xl flex items-center px-4" style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={() => setSidebarOpen(true)} className="text-foreground p-1">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2 ml-3">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="font-bold text-gradient-primary">Transparently</span>
          </div>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
      )}

      <AnimatePresence>
        {isMobile && sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/70 backdrop-blur-sm z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {isMobile ? (
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-64 backdrop-blur-xl flex flex-col fixed h-full z-50"
              style={{ background: 'linear-gradient(180deg, hsl(228 33% 7%), hsl(228 33% 5%))', borderRight: '1px solid rgba(255,255,255,0.06)' }}
            >
              {sidebarContent}
            </motion.aside>
          )}
        </AnimatePresence>
      ) : (
        <motion.aside
          initial={{ x: -280 }}
          animate={{ x: 0 }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          className="w-64 backdrop-blur-xl flex flex-col fixed h-full z-20"
          style={{ background: 'linear-gradient(180deg, hsl(228 33% 7%), hsl(228 33% 5%))', borderRight: '1px solid rgba(255,255,255,0.06)' }}
        >
          {sidebarContent}
        </motion.aside>
      )}

      <main className={`flex-1 ${isMobile ? 'pt-14 p-4' : 'ml-64 p-8'}`}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
};

export default AdminLayout;
