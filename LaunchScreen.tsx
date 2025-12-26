
import React from 'react';

interface LaunchScreenProps {
  onStart: () => void;
}

const LaunchScreen: React.FC<LaunchScreenProps> = ({ onStart }) => {
  return (
    <div 
      className="fixed inset-0 bg-[#0A0A0A] flex flex-col items-center justify-center p-8 z-50 cursor-pointer animate-in fade-in duration-1000"
      onClick={onStart}
    >
      <div className="text-center">
        <h1 className="text-4xl md:text-5xl font-semibold text-white/95 tracking-tighter mb-4">
          Christopher Celaya
        </h1>
        <div className="flex items-center justify-center space-x-3 text-white/40 text-sm font-medium tracking-tight pulse">
          <p>Currently: Building CLOS cognitive optimization systems</p>
        </div>
      </div>
      
      <div className="absolute bottom-16 text-white/10 text-[10px] uppercase tracking-[0.4em] font-bold">
        Enter Portal
      </div>
    </div>
  );
};

export default LaunchScreen;
