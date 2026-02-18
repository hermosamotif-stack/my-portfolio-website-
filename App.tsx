
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PROJECTS as INITIAL_PROJECTS } from './constants';
import { Section, ChatMessage, Project } from './types';
import { getGeminiResponse } from './services/geminiService';

const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
const SendIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>;
const BotIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>;
const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>;
const LockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;

const App: React.FC = () => {
  // State for Projects (Persisted in LocalStorage)
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('ender_projects');
    return saved ? JSON.parse(saved) : INITIAL_PROJECTS;
  });

  // Security State
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loginCreds, setLoginCreds] = useState({ user: '', pass: '' });
  const [loginError, setLoginError] = useState('');

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: "I'm Ender's AI strategist. How can I assist your visual narrative today?" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [isPointer, setIsPointer] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Refs for sliding indicator
  const categoryRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 });

  // Persistence
  useEffect(() => {
    localStorage.setItem('ender_projects', JSON.stringify(projects));
  }, [projects]);

  // Categories list
  const categories = useMemo(() => ['All', ...Array.from(new Set(projects.map(p => p.category)))], [projects]);

  // Filtered projects
  const filteredProjects = useMemo(() => {
    if (activeCategory === 'All') return projects;
    return projects.filter(p => p.category === activeCategory);
  }, [activeCategory, projects]);

  // Update sliding indicator position
  useEffect(() => {
    const activeEl = categoryRefs.current[activeCategory];
    if (activeEl) {
      setIndicatorStyle({
        left: activeEl.offsetLeft,
        width: activeEl.offsetWidth,
        opacity: 1
      });
    }
  }, [activeCategory, categories]);

  // Custom Cursor logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setCursorPos({ x: e.clientX, y: e.clientY });
      const target = e.target as HTMLElement;
      setIsPointer(window.getComputedStyle(target).cursor === 'pointer');
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Reveal animations
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [filteredProjects, isAdmin, showLogin]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const scrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);

    const responseText = await getGeminiResponse([...chatMessages, userMsg]);
    
    setChatMessages(prev => [...prev, { role: 'assistant', content: responseText }]);
    setIsChatLoading(false);
  };

  // Login Handler
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Valid credentials: lazza / posterfallu447
    if (loginCreds.user === 'lazza' && loginCreds.pass === 'posterfallu447') {
      setIsAdmin(true);
      setShowLogin(false);
      setLoginError('');
      setLoginCreds({ user: '', pass: '' });
    } else {
      setLoginError('Invalid architect credentials.');
    }
  };

  // Admin Actions
  const addProject = () => {
    const newProj: Project = {
      id: Date.now().toString(),
      title: 'New Project',
      category: 'Logo Design',
      description: 'Project description here...',
      imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1200',
      year: new Date().getFullYear().toString()
    };
    setProjects([newProj, ...projects]);
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    setProjects(projects.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deleteProject = (id: string) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      setProjects(projects.filter(p => p.id !== id));
    }
  };

  const handleImageUpload = (id: string, file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      updateProject(id, { imageUrl: base64String });
    };
    reader.readAsDataURL(file);
  };

  if (isAdmin) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white p-8 md:p-16">
        <div className="max-w-7xl mx-auto">
          <header className="flex justify-between items-center mb-16 reveal">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tighter uppercase italic">Control Panel</h1>
              <p className="text-xs uppercase tracking-[0.3em] opacity-40 mt-2">Manage your visual archive</p>
            </div>
            <button 
              onClick={() => setIsAdmin(false)}
              className="px-6 py-3 border border-white/20 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all"
            >
              Sign Out
            </button>
          </header>

          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-bold uppercase tracking-widest">Active Works ({projects.length})</h2>
            <button 
              onClick={addProject}
              className="flex items-center gap-2 bg-blue-600 px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-blue-500 transition-all"
            >
              <PlusIcon /> Add New Work
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(project => (
              <div key={project.id} className="bg-zinc-900/50 border border-white/5 rounded-2xl overflow-hidden p-6 hover:border-white/20 transition-all flex flex-col">
                <div className="aspect-video mb-6 rounded-lg overflow-hidden bg-black relative group">
                  <img src={project.imageUrl} className="w-full h-full object-cover opacity-50 group-hover:opacity-80 transition-opacity" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <label className="cursor-pointer bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 text-[10px] font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all">
                      Change Image
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => handleImageUpload(project.id, e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>
                </div>
                <div className="space-y-4 flex-1">
                  <input 
                    className="w-full bg-transparent border-b border-white/10 py-1 text-lg font-bold outline-none focus:border-blue-500 transition-colors"
                    value={project.title}
                    onChange={(e) => updateProject(project.id, { title: e.target.value })}
                    placeholder="Title"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <select 
                      className="bg-zinc-800 rounded-lg px-3 py-2 text-[10px] uppercase tracking-widest font-bold outline-none border border-transparent focus:border-white/20"
                      value={project.category}
                      onChange={(e) => updateProject(project.id, { category: e.target.value })}
                    >
                      <option>Logo Design</option>
                      <option>Poster Design</option>
                      <option>Business Card</option>
                      <option>Illustrations</option>
                    </select>
                    <input 
                      className="bg-zinc-800 rounded-lg px-3 py-2 text-[10px] uppercase tracking-widest font-bold outline-none border border-transparent focus:border-white/20"
                      value={project.year}
                      onChange={(e) => updateProject(project.id, { year: e.target.value })}
                      placeholder="Year"
                    />
                  </div>
                  <textarea 
                    className="w-full bg-zinc-800 rounded-lg px-3 py-2 text-xs text-white/60 outline-none border border-transparent focus:border-white/20 resize-none"
                    rows={2}
                    value={project.description}
                    onChange={(e) => updateProject(project.id, { description: e.target.value })}
                    placeholder="Description"
                  />
                  
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Project Image</span>
                    <label className="w-full bg-zinc-800/50 border border-white/10 rounded-lg px-3 py-3 text-[10px] text-white/40 flex items-center justify-center gap-2 cursor-pointer hover:bg-zinc-800 transition-colors">
                      <UploadIcon />
                      <span>{project.imageUrl.startsWith('data:') ? 'Custom Image Loaded' : 'Upload New Asset'}</span>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => handleImageUpload(project.id, e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-white/5 mt-auto">
                    <button 
                      onClick={() => deleteProject(project.id)}
                      className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-blue-500 selection:text-white overflow-x-hidden">
      {/* Custom Cursor */}
      <div 
        id="custom-cursor"
        className={`fixed top-0 left-0 w-4 h-4 rounded-full bg-white z-[9999] pointer-events-none mix-blend-difference transition-transform duration-200 ease-out ${isPointer ? 'scale-[4] blur-[1px]' : 'scale-100'}`}
        style={{ transform: `translate3d(${cursorPos.x - 8}px, ${cursorPos.y - 8}px, 0) ${isPointer ? 'scale(4)' : 'scale(1)'}` }}
      ></div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 glass px-6 py-6 md:px-12 flex justify-between items-center">
        <div className="text-xl font-bold tracking-tighter uppercase flex items-center gap-3 cursor-pointer" onClick={() => scrollTo('hero')}>
          ENDER 
          <span className="flex h-2 w-2 rounded-full bg-green-500 pulse-green"></span>
        </div>
        
        <div className="hidden md:flex space-x-12 text-[10px] font-bold uppercase tracking-[0.3em]">
          <button onClick={() => scrollTo('work')} className="hover:opacity-50 transition-opacity">Work</button>
          <button onClick={() => scrollTo('about')} className="hover:opacity-50 transition-opacity">About</button>
          <button onClick={() => scrollTo('contact')} className="hover:opacity-50 transition-opacity">Contact</button>
        </div>

        <button 
          onClick={() => setShowLogin(true)}
          className="text-[10px] font-bold uppercase tracking-[0.3em] px-4 py-2 border border-white/20 rounded-full hover:bg-white hover:text-black transition-all flex items-center gap-2"
        >
          <LockIcon />
          Studio Auth
        </button>
      </nav>

      {/* Login Modal */}
      {showLogin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-6">
          <div className="w-full max-w-md bg-zinc-900 border border-white/10 p-12 rounded-[2rem] relative reveal active">
            <button onClick={() => setShowLogin(false)} className="absolute top-8 right-8 text-white/40 hover:text-white transition-colors">
              <CloseIcon />
            </button>
            <div className="mb-12">
              <h2 className="text-3xl font-bold tracking-tighter uppercase italic mb-2">Architect Access</h2>
              <p className="text-[10px] uppercase tracking-[0.3em] opacity-40">Identify yourself to enter the workspace</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold opacity-30 px-1">Username</label>
                <input 
                  type="text"
                  autoFocus
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 outline-none focus:border-white/30 transition-all text-sm"
                  placeholder="Enderbox"
                  value={loginCreds.user}
                  onChange={e => setLoginCreds(prev => ({ ...prev, user: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold opacity-30 px-1">Password</label>
                <input 
                  type="password"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 outline-none focus:border-white/30 transition-all text-sm"
                  placeholder="••••••••"
                  value={loginCreds.pass}
                  onChange={e => setLoginCreds(prev => ({ ...prev, pass: e.target.value }))}
                />
              </div>
              {loginError && <p className="text-red-500 text-[10px] uppercase tracking-widest font-bold text-center">{loginError}</p>}
              <button 
                type="submit"
                className="w-full bg-white text-black py-4 rounded-xl font-bold uppercase text-[10px] tracking-[0.3em] hover:bg-blue-500 hover:text-white transition-all mt-4"
              >
                Authenticate
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section id="hero" className="h-screen flex flex-col justify-center px-6 md:px-12 lg:px-24">
        <div className="max-w-7xl reveal">
          <span className="block text-xs uppercase tracking-[0.4em] mb-6 text-blue-500 font-bold">Visual Architect</span>
          <h1 className="text-[12vw] md:text-[8vw] lg:text-[7vw] font-extrabold leading-[0.85] tracking-tighter mb-12">
            DESIGNING <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/20">DIGITAL</span> <br />
            IDENTITIES.
          </h1>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <p className="text-lg md:text-xl max-w-xl text-white/50 leading-relaxed uppercase tracking-tight">
              Focusing on Logo Systems, Posters, and high-end Print collateral. Studio-grade aesthetics for modern brands.
            </p>
            <div className="flex items-center gap-4 cursor-pointer" onClick={() => scrollTo('work')}>
               <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center animate-bounce">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 13l5 5 5-5M7 6l5 5 5-5"/></svg>
               </div>
               <span className="text-[10px] uppercase tracking-widest font-bold opacity-30">Explore Gallery</span>
            </div>
          </div>
        </div>
      </section>

      {/* Project Masonry Grid */}
      <section id="work" className="py-24 px-6 md:px-12 lg:px-24 border-t border-white/5">
        <div className="mb-24 flex flex-col md:flex-row md:items-end justify-between gap-12">
          <div className="w-full md:w-auto">
            <h2 className="text-5xl md:text-8xl font-bold tracking-tighter italic reveal uppercase mb-12">Selected <br />Works</h2>
            
            {/* Redesigned Category Tab / Segmented Control */}
            <div className="relative inline-flex items-center p-1 bg-white/5 rounded-full border border-white/10 backdrop-blur-md reveal">
              {/* Sliding Indicator */}
              <div 
                className="absolute h-[calc(100%-8px)] rounded-full bg-white transition-all duration-300 ease-out z-0"
                style={{ 
                  left: `${indicatorStyle.left}px`, 
                  width: `${indicatorStyle.width}px`,
                  opacity: indicatorStyle.opacity 
                }}
              />
              
              {categories.map(cat => (
                <button 
                  key={cat}
                  ref={el => categoryRefs.current[cat] = el}
                  onClick={() => setActiveCategory(cat)}
                  className={`relative px-6 py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] transition-colors duration-300 z-10 whitespace-nowrap rounded-full ${
                    activeCategory === cat ? 'text-black' : 'text-white/40 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 max-w-xs leading-loose text-right hidden md:block">
            01 — Portfolio / Collection <br />
            High-fidelity design assets.
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-24 min-h-[600px]">
          {filteredProjects.map((project, idx) => (
            <div 
              key={project.id} 
              className={`reveal group relative ${idx % 2 !== 0 ? 'md:mt-48' : ''}`}
            >
              <div className="overflow-hidden rounded-xl aspect-[4/5] bg-zinc-900 border border-white/5 relative">
                <img 
                  src={project.imageUrl} 
                  alt={project.title} 
                  className="w-full h-full object-cover transition-transform duration-1000 ease-out group-hover:scale-110 grayscale hover:grayscale-0 opacity-80 group-hover:opacity-100"
                />
                
                {/* Hover Reveal Info */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-8">
                  <div className="transform translate-y-8 group-hover:translate-y-0 transition-transform duration-500">
                     <span className="text-[10px] uppercase tracking-widest text-blue-400 font-bold mb-2 block">{project.category}</span>
                     <h3 className="text-3xl font-bold tracking-tighter mb-4">{project.title}</h3>
                     <p className="text-sm text-white/60 mb-6">{project.description}</p>
                     <button className="text-xs uppercase tracking-widest font-bold flex items-center gap-2 group/btn">
                        View Details
                        <span className="w-8 h-px bg-white group-hover/btn:w-12 transition-all"></span>
                     </button>
                  </div>
                </div>
              </div>
              <div className="mt-8 flex justify-between items-center md:hidden">
                <h3 className="text-xl font-bold">{project.title}</h3>
                <span className="text-[10px] opacity-40 uppercase tracking-widest">{project.year}</span>
              </div>
            </div>
          ))}
          {filteredProjects.length === 0 && (
            <div className="col-span-full py-48 text-center text-white/20 uppercase tracking-[0.5em]">
              No projects in this category.
            </div>
          )}
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-48 px-6 md:px-12 lg:px-24 bg-white text-black rounded-[3rem] md:rounded-[6rem] mx-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-24">
          <div className="reveal">
            <span className="text-xs uppercase tracking-widest font-bold mb-8 block opacity-40">02 — Expertise</span>
            <h2 className="text-5xl md:text-8xl font-bold tracking-tighter leading-[0.9] mb-12 uppercase">
              REFINING <br /> THE <br /> <span className="text-zinc-300">CORE.</span>
            </h2>
          </div>
          <div className="reveal space-y-12">
            <p className="text-2xl md:text-4xl leading-tight font-medium">
              Ender works at the intersection of brand identity and tactile design. We craft logos that resonate and print collateral that leaves a lasting impression.
            </p>
            <div className="grid grid-cols-2 gap-8 text-xs uppercase tracking-widest font-bold pt-12 border-t border-black/10">
               <div>
                  <h4 className="mb-4 opacity-40">Specialties</h4>
                  <ul className="space-y-2">
                    <li>Logo Systems</li>
                    <li>Poster Design</li>
                    <li>Business Cards</li>
                    <li>Illustrations</li>
                  </ul>
               </div>
               <div>
                  <h4 className="mb-4 opacity-40">Process</h4>
                  <ul className="space-y-2">
                    <li>Discovery</li>
                    <li>Iteration</li>
                    <li>Execution</li>
                    <li>Refinement</li>
                  </ul>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-48 px-6 md:px-12 lg:px-24 text-center mt-[-10vh] pt-[20vh]">
        <div className="max-w-4xl mx-auto reveal">
          <h2 className="text-6xl md:text-[10vw] font-extrabold tracking-tighter mb-12 uppercase">Connect.</h2>
          <div className="flex flex-col md:flex-row items-center justify-center gap-12 mb-24">
            <a href="mailto:contact@ender.studio" className="text-2xl md:text-4xl font-bold border-b-2 border-white/20 hover:border-white transition-colors py-2 tracking-tighter">contact@ender.studio</a>
            <button className="px-8 py-4 bg-white text-black rounded-full font-bold uppercase text-xs tracking-widest hover:bg-blue-500 hover:text-white transition-all">Copy Mail</button>
          </div>
          
          <div className="flex justify-center gap-12 text-[10px] uppercase tracking-[0.3em] font-bold opacity-40">
            <a href="#" className="hover:opacity-100 transition-opacity">Twitter</a>
            <a href="#" className="hover:opacity-100 transition-opacity">LinkedIn</a>
            <a href="#" className="hover:opacity-100 transition-opacity">Dribbble</a>
          </div>
        </div>
      </section>

      {/* AI Chat Widget */}
      <div className={`fixed bottom-6 right-6 z-[60] flex flex-col items-end`}>
        {isChatOpen && (
          <div className="bg-[#0f0f0f] w-[320px] md:w-[400px] h-[550px] rounded-3xl shadow-2xl border border-white/5 flex flex-col mb-4 overflow-hidden">
            <div className="bg-white text-black px-6 py-4 flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <BotIcon />
                <span className="text-xs font-bold uppercase tracking-widest">Design Strategist</span>
              </div>
              <button onClick={() => setIsChatOpen(false)}><CloseIcon /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user' ? 'bg-zinc-800 text-white' : 'bg-white text-black'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white text-black rounded-2xl px-4 py-3 text-sm animate-pulse">Thinking...</div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 flex space-x-2">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about Logo or Poster design..." 
                className="flex-1 bg-zinc-900 border border-white/5 rounded-full px-4 py-2 text-sm outline-none focus:border-white/20"
              />
              <button type="submit" className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center"><SendIcon /></button>
            </form>
          </div>
        )}
        <button 
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 ${isChatOpen ? 'bg-white text-black' : 'bg-zinc-900 text-white border border-white/10'}`}
        >
          {isChatOpen ? <CloseIcon /> : <BotIcon />}
        </button>
      </div>
    </div>
  );
};

export default App;
