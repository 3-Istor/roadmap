'use client';

/**
 * Project Filter Component
 * 
 * Dropdown to filter timeline by project
 */

import { useViewStore } from '@/lib/store/viewStore';
import { cn } from '@/lib/utils/cn';

interface Project {
  id: string;
  name: string;
  status: string;
  _count?: {
    tasks: number;
  };
}

interface ProjectFilterProps {
  projects: Project[];
}

export function ProjectFilter({ projects }: ProjectFilterProps) {
  const { selectedProjectId, setSelectedProject } = useViewStore();
  
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Project
      </label>
      <select
        value={selectedProjectId || ''}
        onChange={(e) => setSelectedProject(e.target.value || null)}
        className={cn(
          'px-3 py-2 rounded-lg border bg-white dark:bg-gray-800',
          'border-gray-300 dark:border-gray-700',
          'text-gray-900 dark:text-white',
          'focus:outline-none focus:ring-2 focus:ring-blue-500',
          'text-sm'
        )}
      >
        <option value="">All Projects</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name} ({project._count?.tasks || 0} tasks)
          </option>
        ))}
      </select>
    </div>
  );
}
