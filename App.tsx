
import React, { useState } from 'react';
import LaunchScreen from './components/LaunchScreen';
import ChatInterface from './components/ChatInterface';

const App: React.FC = () => {
  const [showLaunch, setShowLaunch] = useState(true);

  return (
    <div className="h-screen w-screen bg-[#0A0A0A] overflow-hidden text-white selection:bg-white/10">
      {showLaunch ? (
        <LaunchScreen onStart={() => setShowLaunch(false)} />
      ) : (
        <div className="h-full relative flex flex-col">
          {/* Identity Anchor - Fixed Layer */}
          <div className="fixed top-0 left-0 right-0 pt-[10vh] flex flex-col items-center pointer-events-none z-10">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-white/95 animate-in fade-in duration-1000">
              Christopher Celaya
            </h1>
            <div className="mt-4 flex items-center space-x-2 text-white/50 text-xs font-medium tracking-tight pulse">
              <p>Currently: Building CLOS cognitive optimization systems</p>
            </div>
          </div>

          {/* Conversation Layer */}
          <main className="flex-1 relative z-0">
            <ChatInterface />
          </main>

          {/* Minimalist Portal Status (Corner) */}
          <div className="fixed bottom-6 right-8 text-[9px] uppercase tracking-[0.3em] text-white/10 font-bold hidden md:block">
            Portal Environment Alpha
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
