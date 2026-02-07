import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { projects as projectsApi } from '../lib/api';

const ProjectContext = createContext(null);

const STORAGE_KEY = 'selectedProjectId';

export function ProjectProvider({ children }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProjects = useCallback(async () => {
    if (!user) {
      setProjects([]);
      setCurrentProject(null);
      setLoading(false);
      return;
    }

    try {
      const data = await projectsApi.getAll();
      setProjects(data);

      // Restore previously selected project or default to first
      const savedId = localStorage.getItem(STORAGE_KEY);
      const savedProject = savedId ? data.find(p => p.id === parseInt(savedId, 10)) : null;
      const defaultProject = data.find(p => p.slug === 'default') || data[0];
      setCurrentProject(savedProject || defaultProject || null);
    } catch (err) {
      console.error('Failed to load projects:', err);
      setProjects([]);
      setCurrentProject(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const switchProject = useCallback((project) => {
    setCurrentProject(project);
    localStorage.setItem(STORAGE_KEY, String(project.id));
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await loadProjects();
  }, [loadProjects]);

  return (
    <ProjectContext.Provider value={{
      projects,
      currentProject,
      loading,
      switchProject,
      refresh,
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
