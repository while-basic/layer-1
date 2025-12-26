
import React, { useState } from 'react';
import { Project } from '../types';

interface ProjectCardProps {
  project: Project;
  onTagClick?: (tag: string, projectName: string) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onTagClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div 
      onClick={() => setIsExpanded(!isExpanded)}
      className={`
        relative overflow-hidden
        bg-white/[0.02] border border-white/[0.03] 
        rounded-lg my-3 transition-all duration-500 ease-out cursor-pointer
        hover:bg-white/[0.04] hover:border-white/[0.08]
        ${isExpanded ? 'p-6 bg-white/[0.03]' : 'p-3'}
        group
      `}
    >
      <div className="relative z-10">
        <div className="flex justify-between items-center">
          <h3 className={`font-medium tracking-tight transition-all duration-300 ${isExpanded ? 'text-lg text-white' : 'text-[11px] text-white/40 uppercase tracking-[0.2em]'}`}>
            {project.name}
          </h3>
          <div className="flex items-center space-x-2">
            {!isExpanded && (
              <span className="text-[8px] text-white/10 uppercase tracking-[0.1em] opacity-0 group-hover:opacity-100 transition-opacity">
                Details
              </span>
            )}
            <div className={`w-1 h-1 rounded-full transition-all duration-500 ${isExpanded ? 'bg-blue-400' : 'bg-white/10'}`} />
          </div>
        </div>
        
        {isExpanded && (
          <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-500">
            <p className="text-white/60 text-sm leading-relaxed font-light mb-6">
              {project.description}
            </p>
            
            <div className="flex flex-wrap gap-2 mb-6">
              {project.tech.map((t, i) => (
                <button 
                  key={i} 
                  onClick={(e) => {
                    e.stopPropagation();
                    onTagClick?.(t, project.name);
                  }}
                  className="text-[9px] font-mono tracking-widest text-white/30 bg-white/[0.03] border border-white/[0.05] px-2 py-0.5 rounded-sm hover:border-white/20 transition-all"
                >
                  {t}
                </button>
              ))}
            </div>
            
            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
              <span className="text-[9px] text-white/20 font-mono italic">{project.status}</span>
              <button className="text-[8px] uppercase tracking-[0.3em] text-white/10 hover:text-white/40 transition-all">Collapse</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectCard;
