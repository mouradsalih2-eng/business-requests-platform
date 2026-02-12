import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import { projects as projectsApi, users as usersApi, formConfig as formConfigApi, featureFlags as featureFlagsApi } from '../lib/api';
import { FormBuilder } from '../components/form-builder/FormBuilder';
import { useToast } from '../components/ui/Toast';

const STEPS = [
  { label: 'Name', title: 'Name Your Project' },
  { label: 'Members', title: 'Invite Members' },
  { label: 'Form', title: 'Build Your Form' },
  { label: 'Features', title: 'Configure Features' },
  { label: 'Launch', title: 'Review & Launch' },
];


const DEFAULT_FLAGS = [
  { name: 'roadmap_kanban', label: 'Roadmap Kanban', description: 'Drag-and-drop board to move requests through Backlog, In Progress, and Released columns', icon: 'kanban', audience: 'everyone', audienceDetail: 'Members view · Admins manage', enabled: true },
  { name: 'request_merging', label: 'Request Merging', description: 'Let admins merge duplicate requests into one, combining their votes and comments', icon: 'merge', audience: 'admin', audienceDetail: 'Admin only', enabled: true },
  { name: 'duplicate_detection', label: 'Duplicate Detection', description: 'Warns users about similar existing requests before they submit a new one', icon: 'detect', audience: 'everyone', audienceDetail: 'All members', enabled: true },
];

export function Onboarding() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { refresh: refreshProjects, switchProject, projects } = useProject();
  const toast = useToast();

  const [currentStep, setCurrentStep] = useState(0);
  const [launching, setLaunching] = useState(false);

  // Step 1: Project info
  const [projectName, setProjectName] = useState('');
  const [projectSlug, setProjectSlug] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);

  // Step 2: Members
  const [members, setMembers] = useState([]);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState('member');
  const [memberAuth, setMemberAuth] = useState('google');
  const [memberPassword, setMemberPassword] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [memberError, setMemberError] = useState('');

  // Step 3: Form config (managed by FormBuilder)
  const [formBuilderConfig, setFormBuilderConfig] = useState({ config: {}, customFields: [] });

  // Step 4: Feature flags
  const [flags, setFlags] = useState(DEFAULT_FLAGS);

  const slugify = (text) => text.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

  const handleNameChange = (val) => {
    setProjectName(val);
    if (!projectSlug || projectSlug === slugify(projectName)) {
      setProjectSlug(slugify(val));
    }
  };

  const handleLogoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Logo must be under 5MB');
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    // Reset so re-selecting the same file triggers onChange again
    e.target.value = '';
  };

  const handleAddMember = async () => {
    if (!memberEmail) return;
    setMemberError('');

    const email = memberEmail.trim().toLowerCase();

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMemberError('Please enter a valid email address');
      return;
    }

    // Check for duplicates in current list
    if (members.some((m) => m.email.toLowerCase() === email)) {
      setMemberError('This email has already been added');
      return;
    }

    setAddingMember(true);
    try {
      const member = {
        email,
        role: memberRole,
        authMethod: memberAuth,
        password: memberAuth === 'email' ? memberPassword : null,
      };
      setMembers((prev) => [...prev, member]);
      setMemberEmail('');
      setMemberPassword('');
      setMemberRole('member');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = (index) => {
    setMembers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleToggleFlag = (name) => {
    setFlags((prev) => prev.map((f) => f.name === name ? { ...f, enabled: !f.enabled } : f));
  };

  const handleLaunch = async () => {
    if (!projectName || !projectSlug) {
      toast.error('Project name and slug are required');
      setCurrentStep(0);
      return;
    }

    setLaunching(true);
    try {
      // 1. Create project
      const project = await projectsApi.create({
        name: projectName,
        slug: projectSlug,
        description: projectDescription || null,
        icon: null,
        logo_url: logoUrl || null,
      });

      // 2. Set project context
      localStorage.setItem('selectedProjectId', project.id.toString());

      // 2b. Upload logo if file was selected
      if (logoFile) {
        try {
          const formData = new FormData();
          formData.append('logo', logoFile);
          await projectsApi.uploadLogo(project.id, formData);
        } catch (err) {
          console.error('Failed to upload logo:', err);
        }
      }

      // 3. Add members
      for (const member of members) {
        try {
          // Create user if needed
          let user;
          if (member.authMethod === 'email' && member.password) {
            user = await usersApi.create({
              email: member.email,
              name: member.email.split('@')[0],
              password: member.password,
              role: 'employee',
            });
          }
          // Add to project
          if (user) {
            await projectsApi.addMember(project.id, user.id, member.role);
          }
        } catch (err) {
          console.error(`Failed to add member ${member.email}:`, err);
        }
      }

      // 4. Save form config
      if (formBuilderConfig.config || formBuilderConfig.customFields?.length) {
        try {
          await formConfigApi.bulkSave(formBuilderConfig);
        } catch (err) {
          console.error('Failed to save form config:', err);
        }
      }

      // 5. Set feature flags
      for (const flag of flags) {
        try {
          await featureFlagsApi.toggle(flag.name, flag.enabled);
        } catch (err) {
          console.error(`Failed to set flag ${flag.name}:`, err);
        }
      }

      // Set active project explicitly, then refresh full list
      switchProject(project);
      await refreshProjects();
      toast.success('Project launched successfully!');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Failed to create project');
    } finally {
      setLaunching(false);
    }
  };

  const isStepComplete = (step) => {
    if (step === 0) return !!(projectName.trim() && projectSlug.trim());
    // Steps 1-3 are optional, but we track if user visited them
    return true;
  };

  const canGoNext = () => {
    if (currentStep === 0) return projectName.trim() && projectSlug.trim();
    return true;
  };

  const inputClass = 'w-full px-3 py-2.5 bg-white dark:bg-[#0D1117] border border-neutral-200 dark:border-[#30363D] rounded-lg text-neutral-900 dark:text-[#E6EDF3] text-sm focus:outline-none focus:ring-1 focus:ring-[#4F46E5]/40 focus:border-neutral-300 dark:focus:border-[#484F58]';

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#010409]">
      <div className={`mx-auto px-4 py-8 sm:py-10 transition-[max-width] duration-300 ${currentStep === 2 ? 'max-w-6xl' : 'max-w-3xl'}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            {projects.length > 0 && (
              <button
                onClick={() => navigate('/dashboard')}
                className="p-1.5 rounded-lg text-neutral-400 dark:text-[#484F58] hover:text-neutral-700 dark:hover:text-[#E6EDF3] hover:bg-neutral-100 dark:hover:bg-[#21262D] transition-colors"
                title="Back to Dashboard"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
              </button>
            )}
            <h1 className="text-xl font-bold text-neutral-900 dark:text-[#E6EDF3]">{projects.length > 0 ? 'Set Up Your Project' : 'Welcome! Set Up Your First Project'}</h1>
          </div>
          <span className="text-xs font-medium text-neutral-500 dark:text-[#484F58] bg-neutral-100 dark:bg-[#21262D] px-2.5 py-1 rounded-full">Step {currentStep + 1} of {STEPS.length}</span>
        </div>
        <p className="text-sm text-neutral-500 dark:text-[#6E7681] mb-8">Get your team started in a few minutes</p>

        {/* Stepper — pill-style tabs */}
        <div className="flex items-center gap-1 sm:gap-2 mb-10 p-1 bg-white dark:bg-[#161B22] rounded-xl border border-neutral-200 dark:border-[#30363D]/40 overflow-x-auto">
          {STEPS.map((step, i) => {
            const visited = i < currentStep;
            const complete = visited && isStepComplete(i);
            return (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-medium whitespace-nowrap transition-colors duration-100 ${
                  i === currentStep
                    ? 'bg-[#4F46E5] dark:bg-[#6366F1] text-white'
                    : complete
                      ? 'text-green-600 dark:text-green-400 hover:bg-neutral-50 dark:hover:bg-[#21262D]'
                      : visited
                        ? 'text-[#4F46E5] dark:text-[#818CF8] hover:bg-neutral-50 dark:hover:bg-[#21262D]'
                        : 'text-neutral-400 dark:text-[#6E7681] hover:text-neutral-600 dark:hover:text-[#8B949E]'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                  i === currentStep
                    ? 'bg-white/20'
                    : complete
                      ? 'bg-green-100 dark:bg-green-500/20'
                      : 'bg-neutral-100 dark:bg-[#21262D]'
                }`}>
                  {complete ? (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                <span className="hidden sm:inline">{step.label}</span>
              </button>
            );
          })}
        </div>

        {/* Step 1: Name */}
        {currentStep === 0 && (
          <div className="bg-white dark:bg-[#161B22] border border-neutral-200 dark:border-[#30363D] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-[#E6EDF3] mb-1">{STEPS[0].title}</h2>
            <p className="text-sm text-neutral-500 dark:text-[#8B949E] mb-6">Choose a name and branding for your project</p>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-neutral-900 dark:text-[#E6EDF3] mb-1.5">Project Name <span className="text-red-400">*</span></label>
                <input type="text" value={projectName} onChange={(e) => handleNameChange(e.target.value)} className={inputClass} placeholder="My Project" autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-900 dark:text-[#E6EDF3] mb-1.5">Slug</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-neutral-400 dark:text-[#484F58]">/</span>
                  <input type="text" value={projectSlug} onChange={(e) => setProjectSlug(e.target.value)} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-900 dark:text-[#E6EDF3] mb-1.5">Logo <span className="text-neutral-400 dark:text-[#484F58]">(optional)</span></label>
                <p className="text-xs text-neutral-500 dark:text-[#6E7681] mb-3">Shown in the sidebar and project switcher across the platform</p>
                {logoPreview ? (
                  <div className="flex items-center gap-4 p-4 bg-neutral-50 dark:bg-[#0D1117] rounded-lg border border-neutral-200 dark:border-[#30363D]">
                    <img src={logoPreview} alt="Logo preview" className="w-14 h-14 rounded-xl object-cover flex-shrink-0 border border-neutral-200 dark:border-[#30363D]" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-neutral-900 dark:text-[#E6EDF3] font-medium truncate">{logoFile?.name}</p>
                      <p className="text-xs text-neutral-500 dark:text-[#8B949E] mt-0.5">{logoFile ? `${(logoFile.size / 1024).toFixed(1)} KB` : ''}</p>
                      <div className="flex items-center gap-3 mt-2">
                        {/* Native label→input for Replace — no JS .click() needed */}
                        <label htmlFor="logo-replace" className="text-xs font-medium text-[#4F46E5] dark:text-[#818CF8] hover:text-[#4338CA] dark:hover:text-[#A5B4FC] transition-colors cursor-pointer">
                          Replace
                          <input id="logo-replace" type="file" accept="image/*" onChange={handleLogoSelect} className="sr-only" />
                        </label>
                        <button type="button" onClick={() => { setLogoPreview(null); setLogoFile(null); }} className="text-xs font-medium text-neutral-400 dark:text-[#6E7681] hover:text-red-500 dark:hover:text-red-400 transition-colors">Remove</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Native label→input — only inline/span children, no <div> blocks */
                  <label htmlFor="logo-upload" className="flex flex-col items-center gap-2 p-8 border border-dashed border-neutral-300 dark:border-[#30363D] rounded-xl text-center hover:border-[#4F46E5]/40 dark:hover:border-[#6366F1]/40 hover:bg-neutral-50/50 dark:hover:bg-[#161B22]/50 transition-all cursor-pointer">
                    <span className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-[#21262D] flex items-center justify-center">
                      <svg className="w-5 h-5 text-neutral-400 dark:text-[#6E7681]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                      </svg>
                    </span>
                    <span className="text-sm font-medium text-neutral-600 dark:text-[#8B949E]">Upload your logo</span>
                    <span className="text-xs text-neutral-400 dark:text-[#484F58]">PNG, JPG or SVG, up to 5 MB</span>
                    <input id="logo-upload" type="file" accept="image/*" onChange={handleLogoSelect} className="sr-only" />
                  </label>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-900 dark:text-[#E6EDF3] mb-1.5">Description <span className="text-neutral-400 dark:text-[#484F58]">(optional)</span></label>
                <textarea rows={3} value={projectDescription} onChange={(e) => setProjectDescription(e.target.value)} className={`${inputClass} resize-none`} placeholder="Describe your project..." />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Members */}
        {currentStep === 1 && (
          <div className="bg-white dark:bg-[#161B22] border border-neutral-200 dark:border-[#30363D] rounded-xl p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-[#E6EDF3]">{STEPS[1].title}</h2>
              <button onClick={() => setCurrentStep(2)} className="text-sm text-[#818CF8] hover:underline">Skip for now</button>
            </div>
            <p className="text-sm text-neutral-500 dark:text-[#8B949E] mb-6">Add team members to your project</p>

            <div className="p-4 bg-neutral-50 dark:bg-[#0D1117] rounded-lg border border-neutral-200 dark:border-[#30363D] mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-4">
                  <label className="block text-xs font-medium text-neutral-500 dark:text-[#8B949E] mb-1">Email</label>
                  <input type="email" value={memberEmail} onChange={(e) => { setMemberEmail(e.target.value); setMemberError(''); }} className={inputClass} placeholder="user@company.com" />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-medium text-neutral-500 dark:text-[#8B949E] mb-1">Role</label>
                  <select value={memberRole} onChange={(e) => setMemberRole(e.target.value)} className={inputClass}>
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-neutral-500 dark:text-[#8B949E] mb-1">Auth</label>
                  <select value={memberAuth} onChange={(e) => setMemberAuth(e.target.value)} className={inputClass}>
                    <option value="google">Google</option>
                    <option value="email">Email</option>
                  </select>
                </div>
                {memberAuth === 'email' && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-neutral-500 dark:text-[#8B949E] mb-1">Password</label>
                    <input type="password" value={memberPassword} onChange={(e) => setMemberPassword(e.target.value)} className={inputClass} placeholder="temp123" />
                  </div>
                )}
                <div className={`${memberAuth === 'email' ? 'sm:col-span-2' : 'sm:col-span-4'} flex items-end`}>
                  <button onClick={handleAddMember} disabled={!memberEmail || addingMember} className="w-full px-4 py-2.5 bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors">
                    Add
                  </button>
                </div>
              </div>
              {memberError && (
                <p className="mt-2 text-xs text-red-500 dark:text-red-400">{memberError}</p>
              )}

              {/* Role explainer */}
              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-neutral-200 dark:border-[#30363D]/40">
                <div className={`p-3 rounded-lg border transition-colors ${memberRole === 'admin' ? 'border-purple-300 dark:border-purple-500/40 bg-purple-50 dark:bg-purple-500/5' : 'border-neutral-200 dark:border-[#30363D]/40 bg-white dark:bg-transparent'}`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <svg className="w-4 h-4 text-purple-500 dark:text-purple-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                    <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">Admin</span>
                  </div>
                  <ul className="space-y-1">
                    <li className="text-[11px] text-neutral-600 dark:text-[#8B949E] flex items-start gap-1.5">
                      <span className="text-purple-400 mt-0.5">&#8226;</span> Manage project settings & members
                    </li>
                    <li className="text-[11px] text-neutral-600 dark:text-[#8B949E] flex items-start gap-1.5">
                      <span className="text-purple-400 mt-0.5">&#8226;</span> Approve, reject & change request status
                    </li>
                    <li className="text-[11px] text-neutral-600 dark:text-[#8B949E] flex items-start gap-1.5">
                      <span className="text-purple-400 mt-0.5">&#8226;</span> Configure form fields & feature flags
                    </li>
                  </ul>
                </div>
                <div className={`p-3 rounded-lg border transition-colors ${memberRole === 'member' ? 'border-blue-300 dark:border-blue-500/40 bg-blue-50 dark:bg-blue-500/5' : 'border-neutral-200 dark:border-[#30363D]/40 bg-white dark:bg-transparent'}`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <svg className="w-4 h-4 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                    <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">Member</span>
                  </div>
                  <ul className="space-y-1">
                    <li className="text-[11px] text-neutral-600 dark:text-[#8B949E] flex items-start gap-1.5">
                      <span className="text-blue-400 mt-0.5">&#8226;</span> Submit new feature requests
                    </li>
                    <li className="text-[11px] text-neutral-600 dark:text-[#8B949E] flex items-start gap-1.5">
                      <span className="text-blue-400 mt-0.5">&#8226;</span> Upvote, like & comment on requests
                    </li>
                    <li className="text-[11px] text-neutral-600 dark:text-[#8B949E] flex items-start gap-1.5">
                      <span className="text-blue-400 mt-0.5">&#8226;</span> View roadmap & track request status
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {members.map((member, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-[#0D1117] rounded-lg border border-neutral-200 dark:border-[#30363D]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#4F46E5] rounded-full flex items-center justify-center text-white text-xs font-medium">
                      {member.email.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm text-neutral-900 dark:text-[#E6EDF3] font-medium">{member.email}</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${member.role === 'admin' ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400' : 'bg-neutral-100 dark:bg-[#21262D] text-neutral-600 dark:text-[#8B949E]'}`}>
                          {member.role === 'admin' ? 'Admin' : 'Member'}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${member.authMethod === 'google' ? 'bg-blue-500/15 text-blue-500 dark:text-blue-400' : 'bg-amber-500/15 text-amber-500 dark:text-amber-400'}`}>
                          {member.authMethod === 'google' ? 'Google SSO' : 'Temp password'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => handleRemoveMember(i)} className="text-neutral-400 dark:text-[#484F58] hover:text-red-400 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
              {members.length === 0 && (
                <p className="text-sm text-neutral-400 dark:text-[#484F58] text-center py-4">No members added yet. You can add them later.</p>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Form Builder */}
        {currentStep === 2 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-[#E6EDF3]">
                  {projectName ? `Build the ${projectName} Form` : STEPS[2].title}
                </h2>
                <p className="text-sm text-neutral-500 dark:text-[#8B949E]">Configure which fields appear on the request form</p>
              </div>
            </div>
            <FormBuilder
              initialConfig={formBuilderConfig.config}
              initialCustomFields={formBuilderConfig.customFields}
              onConfigChange={setFormBuilderConfig}
            />
          </div>
        )}

        {/* Step 4: Feature Flags */}
        {currentStep === 3 && (
          <div className="bg-white dark:bg-[#161B22] border border-neutral-200 dark:border-[#30363D] rounded-xl p-6">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-[#E6EDF3] mb-1">{STEPS[3].title}</h2>
            <p className="text-sm text-neutral-500 dark:text-[#8B949E] mb-6">Enable or disable platform features for this project</p>
            <div className="space-y-3">
              {flags.map((flag) => (
                <div
                  key={flag.name}
                  className={`p-4 rounded-xl border transition-all duration-200 ${
                    flag.enabled
                      ? 'bg-white dark:bg-[#0D1117] border-[#4F46E5]/20 dark:border-[#6366F1]/20'
                      : 'bg-neutral-50 dark:bg-[#0D1117]/50 border-neutral-200 dark:border-[#30363D] opacity-75'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Feature icon */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                      flag.enabled ? 'bg-[#4F46E5]/8 dark:bg-[#6366F1]/8' : 'bg-neutral-100 dark:bg-[#21262D]'
                    }`}>
                      {flag.icon === 'kanban' && (
                        <svg className={`w-4 h-4 ${flag.enabled ? 'text-[#6366F1] dark:text-[#818CF8]' : 'text-neutral-400 dark:text-[#484F58]'}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <rect x="3" y="3" width="5" height="18" rx="1" />
                          <rect x="10" y="3" width="5" height="12" rx="1" />
                          <rect x="17" y="3" width="5" height="8" rx="1" />
                        </svg>
                      )}
                      {flag.icon === 'merge' && (
                        <svg className={`w-4 h-4 ${flag.enabled ? 'text-[#6366F1] dark:text-[#818CF8]' : 'text-neutral-400 dark:text-[#484F58]'}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <circle cx="6" cy="6" r="3" />
                          <circle cx="18" cy="18" r="3" />
                          <path d="M6 9v3c0 3.314 2.686 6 6 6h3" />
                        </svg>
                      )}
                      {flag.icon === 'detect' && (
                        <svg className={`w-4 h-4 ${flag.enabled ? 'text-[#6366F1] dark:text-[#818CF8]' : 'text-neutral-400 dark:text-[#484F58]'}`} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <circle cx="11" cy="11" r="7" />
                          <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
                        </svg>
                      )}
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h3 className={`text-sm font-medium transition-colors ${flag.enabled ? 'text-neutral-900 dark:text-[#E6EDF3]' : 'text-neutral-500 dark:text-[#6E7681]'}`}>{flag.label}</h3>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                            flag.audience === 'admin'
                              ? 'bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20'
                              : 'bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20'
                          }`}>
                            {flag.audienceDetail}
                          </span>
                        </div>
                        <button
                          onClick={() => handleToggleFlag(flag.name)}
                          className={`w-10 h-[22px] rounded-full relative flex-shrink-0 transition-colors ${flag.enabled ? 'bg-[#4F46E5] dark:bg-[#6366F1]' : 'bg-neutral-300 dark:bg-[#30363D]'}`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full absolute top-[3px] transition-transform shadow-sm ${flag.enabled ? 'translate-x-[21px]' : 'translate-x-[3px]'}`} />
                        </button>
                      </div>
                      <p className={`text-xs mt-1 transition-colors ${flag.enabled ? 'text-neutral-500 dark:text-[#8B949E]' : 'text-neutral-400 dark:text-[#484F58]'}`}>{flag.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-neutral-400 dark:text-[#484F58] mt-4 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              You can change these anytime from Project Settings after launch
            </p>
          </div>
        )}

        {/* Step 5: Review & Launch */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-[#161B22] border border-neutral-200 dark:border-[#30363D] rounded-xl p-6">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-[#E6EDF3] mb-1">{STEPS[4].title}</h2>
              <p className="text-sm text-neutral-500 dark:text-[#8B949E] mb-6">Review your project setup before launching</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-neutral-50 dark:bg-[#0D1117] rounded-lg border border-neutral-200 dark:border-[#30363D]">
                  <h3 className="text-[11px] font-medium text-neutral-400 dark:text-[#6E7681] mb-3">Project</h3>
                  <div className="flex items-center gap-3">
                    {logoPreview ? (
                      <img src={logoPreview} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-neutral-200 dark:bg-[#21262D] flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-neutral-400 dark:text-[#484F58]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                        </svg>
                      </div>
                    )}
                    <div>
                      <p className="text-neutral-900 dark:text-[#E6EDF3] font-medium">{projectName || 'Untitled'}</p>
                      <p className="text-xs text-neutral-400 dark:text-[#484F58]">/{projectSlug}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-neutral-50 dark:bg-[#0D1117] rounded-lg border border-neutral-200 dark:border-[#30363D]">
                  <h3 className="text-[11px] font-medium text-neutral-400 dark:text-[#6E7681] mb-3">Members</h3>
                  <p className="text-2xl font-semibold text-neutral-900 dark:text-[#E6EDF3]">{members.length + 1}</p>
                  <p className="text-xs text-neutral-500 dark:text-[#8B949E]">Including you</p>
                </div>

                <div className="p-4 bg-neutral-50 dark:bg-[#0D1117] rounded-lg border border-neutral-200 dark:border-[#30363D]">
                  <h3 className="text-[11px] font-medium text-neutral-400 dark:text-[#6E7681] mb-3">Form fields</h3>
                  <p className="text-2xl font-semibold text-neutral-900 dark:text-[#E6EDF3]">{9 + (formBuilderConfig.customFields?.length || 0)}</p>
                  <p className="text-xs text-neutral-500 dark:text-[#8B949E]">9 built-in + {formBuilderConfig.customFields?.length || 0} custom</p>
                </div>

                <div className="p-4 bg-neutral-50 dark:bg-[#0D1117] rounded-lg border border-neutral-200 dark:border-[#30363D]">
                  <h3 className="text-[11px] font-medium text-neutral-400 dark:text-[#6E7681] mb-3">Features</h3>
                  <div className="space-y-1">
                    {flags.map((flag) => (
                      <div key={flag.name} className="flex items-center gap-2 text-sm">
                        {flag.enabled ? (
                          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                        ) : (
                          <svg className="w-4 h-4 text-neutral-400 dark:text-[#484F58]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        )}
                        <span className={flag.enabled ? 'text-neutral-900 dark:text-[#E6EDF3]' : 'text-neutral-400 dark:text-[#484F58]'}>{flag.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleLaunch}
              disabled={launching || !projectName || !projectSlug}
              className="w-full py-3 bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {launching ? 'Launching...' : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" /></svg>
                  Launch Project
                </>
              )}
            </button>
          </div>
        )}

        {/* Step Navigation */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-neutral-200 dark:border-[#30363D]/30">
          <button
            onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
            className={`px-4 py-2 bg-neutral-100 dark:bg-[#21262D] text-neutral-600 dark:text-[#8B949E] rounded-lg text-sm hover:text-neutral-900 dark:hover:text-white transition-colors ${currentStep === 0 ? 'invisible' : ''}`}
          >
            &larr; Previous
          </button>
          {currentStep < STEPS.length - 1 && (
            <button
              onClick={() => setCurrentStep((s) => Math.min(STEPS.length - 1, s + 1))}
              disabled={!canGoNext()}
              className="px-5 py-2.5 bg-[#4F46E5] dark:bg-[#6366F1] hover:bg-[#4338CA] dark:hover:bg-[#818CF8] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-all active:scale-[0.98] flex items-center gap-2"
            >
              Continue
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
