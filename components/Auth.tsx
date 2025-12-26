
import React, { useState } from 'react';

interface AuthProps {
  onIdentity: (name: string) => void;
  currentIdentity?: string;
  onLogout: () => void;
}

const Auth: React.FC<AuthProps> = ({ onIdentity, currentIdentity, onLogout }) => {
  const [isExpanding, setIsExpanding] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onIdentity(inputValue.trim().toLowerCase());
      setInputValue('');
      setIsExpanding(false);
    }
  };

  if (currentIdentity) {
    return (
      <div className="flex items-center space-x-3 mt-1">
        <span className="text-white/60 text-[9px] tracking-[0.3em] uppercase font-bold">
          Identity established: {currentIdentity}
        </span>
        <button 
          onClick={onLogout}
          className="text-white/20 hover:text-white/50 text-[9px] tracking-[0.3em] uppercase transition-all duration-300 font-bold"
        >
          [ Release ]
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center mt-1">
      {!isExpanding ? (
        <button 
          onClick={() => setIsExpanding(true)}
          className="text-white/40 hover:text-white text-[9px] tracking-[0.3em] uppercase transition-all duration-300 font-bold border-b border-white/5 pb-0.5"
        >
          Connect Identity
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="flex items-center animate-in fade-in slide-in-from-top-1 duration-500">
          <input 
            autoFocus
            type="text"
            placeholder="WHO ARE YOU?..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="bg-transparent border-none text-[9px] tracking-[0.3em] uppercase text-white placeholder-white/10 focus:ring-0 w-32 p-0 font-bold"
          />
          <button type="submit" className="hidden">Submit</button>
          <button 
            type="button"
            onClick={() => setIsExpanding(false)}
            className="ml-4 text-white/10 hover:text-white text-[9px] font-bold"
          >
            ESC
          </button>
        </form>
      )}
    </div>
  );
};

export default Auth;
