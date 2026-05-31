import React from 'react';
import { motion } from 'framer-motion';

export const DigitizedBackground = ({ children, className = '' }) => {
  return (
    <div className={`relative w-full h-full bg-[#050A14] overflow-hidden ${className}`}>
      
      {/* ── DIGITAL GRID ── */}
      <div 
        className="absolute inset-0 z-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(58, 191, 255, 0.2) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(58, 191, 255, 0.2) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />

      {/* ── SCANNING LASER EFFECT ── */}
      <motion.div
        className="absolute left-0 right-0 z-0 pointer-events-none"
        style={{
          height: '150px',
          background: 'linear-gradient(to bottom, transparent, rgba(58, 191, 255, 0.05), rgba(58, 191, 255, 0.4), rgba(58, 191, 255, 0.8), rgba(58, 191, 255, 0.4), rgba(58, 191, 255, 0.05), transparent)',
          boxShadow: '0 0 20px 0 rgba(58, 191, 255, 0.3)',
          mixBlendMode: 'screen',
        }}
        animate={{
          top: ['-20%', '120%']
        }}
        transition={{
          duration: 3.5,
          ease: "linear",
          repeat: Infinity,
          repeatType: "loop"
        }}
      />

      {/* ── BINARY DATA BITS BLINKING ── */}
      <div className="absolute inset-0 z-0 opacity-30 pointer-events-none mix-blend-screen overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-[#38bdf8] font-mono text-xs font-bold"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0, 1, 0],
              y: [0, -20]
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 3,
            }}
          >
            {Math.random() > 0.5 ? '01' : '10'}
          </motion.div>
        ))}
      </div>

      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
};

export default DigitizedBackground;
