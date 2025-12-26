
import React from 'react';
import { Project } from '../types';

interface ProjectCardProps {
  project: Project;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  return (
    <div className="bg-[#1A1A1A] rounded-xl p-8 my-10 shadow-2xl transition-all hover:ring-1 hover:ring-white/5 group border-none">
      <div className="flex justify-between items-baseline mb-6">
        <h3 className="text-xl font-semibold text-white/95 tracking-tight">{project.name}</h3>
        <span className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-bold">
          {project.status.split(' ')[0]}
        </span>
      </div>
      
      <p className="text-[#A0A0A0] text-base leading-relaxed mb-8 font-light">
        {project.description}
      </p>
      
      <div className="flex flex-wrap gap-3 mb-8">
        {project.tech.map((t, i) => (
          <span key={i} className="text-[11px] font-mono text-white/30 bg-white/[0.03] px-2.5 py-1 rounded">
            {t}
          </span>
        ))}
      </div>
      
      <div className="pt-6 border-t border-white/[0.03] flex items-center justify-between">
        <span className="text-[10px] text-white/20 font-mono tracking-wide">{project.status}</span>
        <button className="text-[10px] text-white/40 group-hover:text-white transition-colors uppercase tracking-[0.2em] font-bold">
          Details →
        </button>
      </div>
    </div>
  );
};

export default ProjectCard;
