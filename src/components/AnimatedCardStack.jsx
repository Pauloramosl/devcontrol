import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const CARDS = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'Monitore indicadores importantes em tempo real.',
    color: '#EAB308', // dourado/yellow
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"></line>
        <line x1="12" y1="20" x2="12" y2="4"></line>
        <line x1="6" y1="20" x2="6" y2="14"></line>
        <polyline points="2 16 6 12 10 16 18 8"></polyline>
        <polyline points="14 8 18 8 18 12"></polyline>
      </svg>
    ),
  },
  {
    id: 'financeiro',
    title: 'Financeiro',
    description: 'Controle receitas, cobranças e previsões.',
    color: '#22C55E', // verde
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"></path>
        <path d="M12 18V6"></path>
      </svg>
    ),
  },
  {
    id: 'clientes',
    title: 'Clientes',
    description: 'Organize contatos, empresas e histórico de relacionamento.',
    color: '#3B82F6', // azul
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
      </svg>
    ),
  },
  {
    id: 'kanban',
    title: 'Kanban',
    description: 'Visualize o fluxo de trabalho por etapas.',
    color: '#A855F7', // roxo
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="9" y1="3" x2="9" y2="21"></line>
        <line x1="15" y1="3" x2="15" y2="21"></line>
      </svg>
    ),
  },
  {
    id: 'projetos',
    title: 'Projetos',
    description: 'Acompanhe entregas, progresso e atividades.',
    color: '#06B6D4', // ciano
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
      </svg>
    ),
  },
];

const POSITIONS = [
  { x: -140, scale: 0.75, zIndex: 1, opacity: 0.4, rotateY: 15 },
  { x: -70, scale: 0.85, zIndex: 2, opacity: 0.6, rotateY: 5 },
  { x: 0, scale: 1, zIndex: 4, opacity: 1, rotateY: 0 },
  { x: 70, scale: 0.85, zIndex: 2, opacity: 0.6, rotateY: -5 },
  { x: 140, scale: 0.75, zIndex: 1, opacity: 0.4, rotateY: -15 },
];

export default function AnimatedCardStack() {
  const [activeIndex, setActiveIndex] = useState(2); // Start with 'clientes' in the center

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((current) => (current + 1) % CARDS.length);
    }, 3000); // Rotate every 3 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-[400px] flex items-center justify-center perspective-[1000px]">
      {CARDS.map((card, i) => {
        // Calculate the visual position for each card based on the activeIndex.
        // We want the activeIndex to correspond to POSITIONS[2] (the center).
        const offset = (i - activeIndex + CARDS.length) % CARDS.length;
        // Map offset to the appropriate position.
        // If there are 5 cards:
        // offset 0 -> center (POSITIONS[2])
        // offset 1 -> right mid (POSITIONS[3])
        // offset 2 -> right back (POSITIONS[4])
        // offset 3 -> left back (POSITIONS[0])
        // offset 4 -> left mid (POSITIONS[1])
        
        let posIndex;
        if (offset === 0) posIndex = 2;
        else if (offset === 1) posIndex = 3;
        else if (offset === 2) posIndex = 4;
        else if (offset === 3) posIndex = 0;
        else if (offset === 4) posIndex = 1;

        const pos = POSITIONS[posIndex];

        // Is it the center card?
        const isCenter = posIndex === 2;

        return (
          <motion.div
            key={card.id}
            initial={false}
            animate={{
              x: pos.x,
              scale: pos.scale,
              zIndex: pos.zIndex,
              opacity: pos.opacity,
              rotateY: pos.rotateY,
            }}
            transition={{
              duration: 0.8,
              ease: [0.32, 0.72, 0, 1], // Custom ease-out for premium motion feel
            }}
            className="absolute flex flex-col items-center p-6 w-[220px] h-[320px] rounded-2xl cursor-pointer"
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.4)', // bg-dn-bg-base translúcido
              backdropFilter: 'blur(12px)',
              border: `1px solid ${isCenter ? card.color + '80' : 'rgba(255,255,255,0.1)'}`,
              boxShadow: isCenter ? `0 0 30px ${card.color}20, 0 8px 32px rgba(0,0,0,0.5)` : '0 8px 32px rgba(0,0,0,0.4)',
              transformStyle: 'preserve-3d',
            }}
            onClick={() => setActiveIndex(i)} // Allow clicking to center a card
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500"
              style={{
                backgroundColor: `${card.color}15`,
                color: card.color,
                boxShadow: isCenter ? `0 0 20px ${card.color}40 inset` : 'none',
              }}
            >
              {card.icon}
            </div>
            
            <h3 className="text-xl font-bold mb-3 tracking-tight text-white">
              {card.title}
            </h3>
            
            <p className="text-sm text-center text-slate-300 leading-relaxed font-light">
              {card.description}
            </p>

            {/* Glowing dot indicator at the bottom */}
            <div 
              className="absolute bottom-6 w-1.5 h-1.5 rounded-full transition-all duration-500"
              style={{
                backgroundColor: card.color,
                opacity: isCenter ? 1 : 0.4,
                boxShadow: isCenter ? `0 0 10px ${card.color}` : 'none',
              }}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
