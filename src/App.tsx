import React from 'react';
import ParticleScene from './components/ParticleScene';
import { motion, AnimatePresence } from 'motion/react';

const App: React.FC = () => {
  return (
    <div className="fixed inset-0 w-screen h-screen bg-black overflow-hidden select-none">
      <div className="absolute inset-0 pointer-events-auto">
        <ParticleScene />
      </div>
      
      {/* Cinematic Vignette */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]" />
    </div>
  );
};

export default App;
