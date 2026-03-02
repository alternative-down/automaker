import { useState, useCallback } from 'react';
import { createLogger } from '@automaker/utils/logger';
import { useNavigate } from '@tanstack/react-router';
import { useAppStore } from '@/store/app-store';
import { useOSDetection } from '@/hooks/use-os-detection';
import { initializeProject } from '@/lib/project-init';
import { getHttpApiClient } from '@/lib/http-api-client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { NewProjectModal } from '@/components/dialogs/new-project-modal';
import { WorkspacePickerModal } from '@/components/dialogs/workspace-picker-modal';
import type { StarterTemplate } from '@/lib/templates';
import {
  FolderOpen,
  Plus,
  Folder,
  Star,
  Clock,
  ChevronDown,
  MessageSquare,
  MoreVertical,
  Trash2,
  Search,
  X,
  LayoutDashboard,
  type LucideIcon,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Input } from '@/components/ui/input';
import { getAuthenticatedImageUrl } from '@/lib/api-fetch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const logger = createLogger('DashboardView');

function getIconComponent(iconName?: string): LucideIcon {
  if (iconName && iconName in LucideIcons) {
    return (LucideIcons as unknown as Record<string, LucideIcon>)[iconName];
  }
  return Folder;
}

export function DashboardView() {
  const navigate = useNavigate();
  const { os } = useOSDetection();
  const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';

  const {
    projects,
    upsertAndSetCurrentProject,
    addProject,
    setCurrentProject,
    toggleProjectFavorite,
    moveProjectToTrash,
  } = useAppStore();

  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showWorkspacePicker, setShowWorkspacePicker] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [projectToRemove, setProjectToRemove] = useState<{ id: string; name: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const sortedProjects = [...projects].sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    const dateA = a.lastOpened ? new Date(a.lastOpened).getTime() : 0;
    const dateB = b.lastOpened ? new Date(b.lastOpened).getTime() : 0;
    return dateB - dateA;
  });

  const filteredProjects = sortedProjects.filter((project) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return project.name.toLowerCase().includes(query) || project.path.toLowerCase().includes(query);
  });

  const favoriteProjects = filteredProjects.filter((p) => p.isFavorite);
  const recentProjects = filteredProjects.filter((p) => !p.isFavorite);

  const initializeAndOpenProject = useCallback(
    async (path: string, name: string) => {
      setIsOpening(true);
      try {
        const initResult = await initializeProject(path);
        if (!initResult.success) {
          toast.error('Failed to initialize project', { description: initResult.error });
          return;
        }
        upsertAndSetCurrentProject(path, name);
        toast.success('Project opened');
        navigate({ to: '/board' });
      } catch (error) {
        toast.error('Failed to open project');
      } finally {
        setIsOpening(false);
      }
    },
    [upsertAndSetCurrentProject, navigate]
  );

  const handleOpenProject = useCallback(() => {
    setShowWorkspacePicker(true);
  }, []);

  const handleWorkspaceSelect = useCallback(
    async (path: string, name: string) => {
      setShowWorkspacePicker(false);
      await initializeAndOpenProject(path, name);
    },
    [initializeAndOpenProject]
  );

  const handleProjectClick = useCallback(
    async (project: { id: string; name: string; path: string }) => {
      await initializeAndOpenProject(project.path, project.name);
    },
    [initializeAndOpenProject]
  );

  const handleCreateBlankProject = async (projectName: string, parentDir: string) => {
    setIsCreating(true);
    try {
      const projectPath = `${parentDir}/${projectName}`;
      const initResult = await initializeProject(projectPath);
      if (!initResult.success) {
        toast.error('Failed to initialize project');
        return;
      }
      const project = { id: `project-${Date.now()}`, name: projectName, path: projectPath, lastOpened: new Date().toISOString() };
      addProject(project);
      setCurrentProject(project);
      setShowNewProjectModal(false);
      navigate({ to: '/board' });
    } catch (error) {
      toast.error('Failed to create project');
    } finally {
      setIsCreating(false);
    }
  };

  const hasProjects = projects.length > 0;

  return (
    <div className="flex-1 flex flex-col h-full content-bg" data-testid="dashboard-view">
      <header className="shrink-0 border-b border-border bg-glass backdrop-blur-md">
        <div className="px-4 sm:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 cursor-pointer group" onClick={() => navigate({ to: '/dashboard' })}>
            <div className="flex flex-col">
              <span className="font-bold text-foreground text-xl sm:text-2xl tracking-tight leading-none">
                automaker<span className="text-brand-500">.</span>
              </span>
              <span className="text-xs text-muted-foreground leading-none font-medium mt-1">v{appVersion} (Web Fork)</span>
            </div>
          </div>
          {hasProjects && (
            <Button variant="outline" size="sm" onClick={() => navigate({ to: '/overview' })} className="hidden sm:flex gap-2">
              <LayoutDashboard className="w-4 h-4" /> Overview
            </Button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="max-w-6xl mx-auto">
          {!hasProjects && (
            <div className="text-center py-20">
              <h2 className="text-3xl font-bold mb-4">Welcome to Automaker</h2>
              <p className="text-muted-foreground mb-8">Your simplified AI development studio.</p>
              <div className="flex justify-center gap-4">
                <Button onClick={() => setShowNewProjectModal(true)} className="bg-brand-500 hover:bg-brand-600 text-white">
                  <Plus className="w-4 h-4 mr-2" /> New Project
                </Button>
                <Button variant="outline" onClick={handleOpenProject}>
                  <FolderOpen className="w-4 h-4 mr-2" /> Open Project
                </Button>
              </div>
            </div>
          )}

          {hasProjects && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Your Projects</h2>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleOpenProject}><FolderOpen className="w-4 h-4 mr-2" /> Open Folder</Button>
                  <Button onClick={() => setShowNewProjectModal(true)} className="bg-brand-500 hover:bg-brand-600 text-white"><Plus className="w-4 h-4 mr-2" /> New Project</Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedProjects.map(project => (
                  <div key={project.id} className="p-4 rounded-xl border border-border bg-card hover:border-brand-500/50 transition-all cursor-pointer" onClick={() => handleProjectClick(project)}>
                    <h3 className="font-bold">{project.name}</h3>
                    <p className="text-xs text-muted-foreground truncate">{project.path}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <NewProjectModal open={showNewProjectModal} onOpenChange={setShowNewProjectModal} onCreateBlankProject={handleCreateBlankProject} isCreating={isCreating} />
      <WorkspacePickerModal open={showWorkspacePicker} onOpenChange={setShowWorkspacePicker} onSelect={handleWorkspaceSelect} />
    </div>
  );
}
