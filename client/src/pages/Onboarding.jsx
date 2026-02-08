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
  { label: 'Flags', title: 'Configure Features' },
  { label: 'Launch', title: 'Review & Launch' },
];

const EMOJIS = ['🚀', '💼', '⚙️', '💡', '🎯', '🔧', '📊', '🏢', '⭐', '🔥', '💎', '🌍', '📋', '🛠️', '🎨', '📦'];

const DEFAULT_FLAGS = [
  { name: 'roadmap_kanban', label: 'Roadmap Kanban', description: 'Visual kanban board for tracking request progress through stages', enabled: true },
  { name: 'request_merging', label: 'Request Merging', description: 'Merge duplicate requests and consolidate votes and comments', enabled: true },
  { name: 'duplicate_detection', label: 'Duplicate Detection', description: 'Automatically suggest similar existing requests when creating new ones', enabled: true },
];

export function Onboarding() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { refresh: refreshProjects } = useProject();
  const toast = useToast();

  const [currentStep, setCurrentStep] = useState(0);
  const [launching, setLaunching] = useState(false);

  // Step 1: Project info
  const [projectName, setProjectName] = useState('');
  const [projectSlug, setProjectSlug] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectIcon, setProjectIcon] = useState('🚀');
  const [brandingMode, setBrandingMode] = useState('emoji'); // emoji | upload | url
  const [logoUrl, setLogoUrl] = useState('');

  // Step 2: Members
  const [members, setMembers] = useState([]);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState('member');
  const [memberAuth, setMemberAuth] = useState('google');
  const [memberPassword, setMemberPassword] = useState('');
  const [addingMember, setAddingMember] = useState(false);

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

  const handleAddMember = async () => {
    if (!memberEmail) return;
    setAddingMember(true);
    try {
      const member = {
        email: memberEmail,
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
        icon: projectIcon || null,
        logo_url: logoUrl || null,
      });

      // 2. Set project context
      localStorage.setItem('selectedProjectId', project.id.toString());

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

      await refreshProjects();
      toast.success('Project launched successfully!');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Failed to create project');
    } finally {
      setLaunching(false);
    }
  };

  const canGoNext = () => {
    if (currentStep === 0) return projectName.trim() && projectSlug.trim();
    return true;
  };

  const inputClass = 'w-full px-3 py-2.5 bg-white dark:bg-[#0D1117] border border-neutral-200 dark:border-[#30363D] rounded-lg text-neutral-900 dark:text-[#E6EDF3] text-sm focus:outline-none focus:border-[#4F46E5]';

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#010409]">
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-1.5 rounded-lg text-neutral-400 dark:text-[#484F58] hover:text-neutral-700 dark:hover:text-[#E6EDF3] hover:bg-neutral-100 dark:hover:bg-[#21262D] transition-colors"
              title="Back to Dashboard"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </button>
            <h1 className="text-xl font-bold gradient-text">Set Up Your Project</h1>
          </div>
          <span className="text-xs font-medium text-neutral-500 dark:text-[#484F58] bg-neutral-100 dark:bg-[#21262D] px-2.5 py-1 rounded-full">Step {currentStep + 1} of {STEPS.length}</span>
        </div>
        <p className="text-sm text-neutral-500 dark:text-[#6E7681] mb-8">Get your team started in a few minutes</p>

        {/* Stepper — pill-style tabs */}
        <div className="flex items-center gap-1 sm:gap-2 mb-10 p-1 bg-white dark:bg-[#161B22] rounded-xl border border-neutral-200 dark:border-[#30363D]/40 overflow-x-auto">
          {STEPS.map((step, i) => (
            <button
              key={i}
              onClick={() => setCurrentStep(i)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                i === currentStep
                  ? 'bg-[#4F46E5] dark:bg-[#6366F1] text-white'
                  : i < currentStep
                    ? 'text-green-600 dark:text-green-400 hover:bg-neutral-50 dark:hover:bg-[#21262D]'
                    : 'text-neutral-400 dark:text-[#6E7681] hover:text-neutral-600 dark:hover:text-[#8B949E]'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                i === currentStep
                  ? 'bg-white/20'
                  : i < currentStep
                    ? 'bg-green-100 dark:bg-green-500/20'
                    : 'bg-neutral-100 dark:bg-[#21262D]'
              }`}>
                {i < currentStep ? (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              <span className="hidden sm:inline">{step.label}</span>
            </button>
          ))}
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
                <label className="block text-sm font-medium text-neutral-900 dark:text-[#E6EDF3] mb-3">Branding</label>
                <div className="flex gap-3 mb-4">
                  {['emoji', 'url'].map((mode) => (
                    <button key={mode} onClick={() => setBrandingMode(mode)} className={`px-4 py-2 text-sm rounded-lg transition-colors ${brandingMode === mode ? 'bg-[#4F46E5] text-white' : 'bg-neutral-100 dark:bg-[#21262D] text-neutral-600 dark:text-[#8B949E]'}`}>
                      {mode === 'emoji' ? 'Emoji' : 'Logo URL'}
                    </button>
                  ))}
                </div>
                {brandingMode === 'emoji' ? (
                  <div className="grid grid-cols-8 gap-2 p-4 bg-neutral-50 dark:bg-[#0D1117] rounded-lg border border-neutral-200 dark:border-[#30363D]">
                    {EMOJIS.map((emoji) => (
                      <button key={emoji} onClick={() => setProjectIcon(emoji)} className={`p-2 text-xl rounded transition-all text-center hover:bg-neutral-200 dark:hover:bg-[#21262D] ${projectIcon === emoji ? 'bg-[#4F46E5] rounded-lg' : ''}`}>
                        {emoji}
                      </button>
                    ))}
                  </div>
                ) : (
                  <input type="url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} className={inputClass} placeholder="https://example.com/logo.png" />
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
                  <input type="email" value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} className={inputClass} placeholder="user@company.com" />
                </div>
                <div className="sm:col-span-2">
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
                  <button onClick={handleAddMember} disabled={!memberEmail || addingMember} className="w-full px-3 py-2.5 bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                    Add
                  </button>
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
                        <span className="text-xs text-neutral-500 dark:text-[#8B949E]">{member.role}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${member.authMethod === 'google' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'}`}>
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
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-[#E6EDF3]">{STEPS[2].title}</h2>
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
            <div className="space-y-4">
              {flags.map((flag) => (
                <div key={flag.name} className="p-4 bg-neutral-50 dark:bg-[#0D1117] rounded-lg border border-neutral-200 dark:border-[#30363D] flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-neutral-900 dark:text-[#E6EDF3]">{flag.label}</h3>
                    <p className="text-xs text-neutral-500 dark:text-[#8B949E] mt-0.5">{flag.description}</p>
                  </div>
                  <button
                    onClick={() => handleToggleFlag(flag.name)}
                    className={`w-9 h-5 rounded-full relative flex-shrink-0 transition-colors ${flag.enabled ? 'bg-[#4F46E5]' : 'bg-neutral-300 dark:bg-[#30363D]'}`}
                  >
                    <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-transform ${flag.enabled ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                  </button>
                </div>
              ))}
            </div>
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
                  <h3 className="text-xs font-medium text-neutral-500 dark:text-[#8B949E] uppercase tracking-wider mb-3">Project</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{projectIcon}</span>
                    <div>
                      <p className="text-neutral-900 dark:text-[#E6EDF3] font-medium">{projectName || 'Untitled'}</p>
                      <p className="text-xs text-neutral-400 dark:text-[#484F58]">/{projectSlug}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-neutral-50 dark:bg-[#0D1117] rounded-lg border border-neutral-200 dark:border-[#30363D]">
                  <h3 className="text-xs font-medium text-neutral-500 dark:text-[#8B949E] uppercase tracking-wider mb-3">Members</h3>
                  <p className="text-2xl font-semibold text-neutral-900 dark:text-[#E6EDF3]">{members.length + 1}</p>
                  <p className="text-xs text-neutral-500 dark:text-[#8B949E]">Including you</p>
                </div>

                <div className="p-4 bg-neutral-50 dark:bg-[#0D1117] rounded-lg border border-neutral-200 dark:border-[#30363D]">
                  <h3 className="text-xs font-medium text-neutral-500 dark:text-[#8B949E] uppercase tracking-wider mb-3">Form Fields</h3>
                  <p className="text-2xl font-semibold text-neutral-900 dark:text-[#E6EDF3]">{9 + (formBuilderConfig.customFields?.length || 0)}</p>
                  <p className="text-xs text-neutral-500 dark:text-[#8B949E]">9 built-in + {formBuilderConfig.customFields?.length || 0} custom</p>
                </div>

                <div className="p-4 bg-neutral-50 dark:bg-[#0D1117] rounded-lg border border-neutral-200 dark:border-[#30363D]">
                  <h3 className="text-xs font-medium text-neutral-500 dark:text-[#8B949E] uppercase tracking-wider mb-3">Features</h3>
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
              className="w-full py-3 bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
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
              className="px-5 py-2.5 bg-[#4F46E5] dark:bg-[#6366F1] hover:bg-[#4338CA] dark:hover:bg-[#818CF8] disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-all active:scale-[0.98] flex items-center gap-2"
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
