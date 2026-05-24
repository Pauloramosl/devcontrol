import React from "react";

function AppLoadingScreen({ size = 180, text = "DC" }) {
  const letters = text.split("");

  return (
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-[#0a1220]">

      <div
        className="relative flex items-center justify-center font-inter select-none mb-10 z-10 text-dn-accent font-bold"
        style={{ width: size, height: size, fontSize: size * 0.16 }}
      >
        <span className="inline-block animate-bracketLeft text-dn-accent-strong">[</span>
        <div className="inline-block animate-spinCenter mx-1 text-white">
          DC
        </div>
        <span className="inline-block animate-bracketRight text-dn-accent-strong">]</span>

        <div className="absolute inset-0 rounded-full animate-loaderCircle pointer-events-none"></div>
      </div>

      {/* Mensagem informativa para o usuário */}
      <div className="flex flex-col items-center space-y-3 mt-4 text-center z-10">
        <h2 className="text-xl md:text-2xl font-semibold text-white tracking-wide animate-pulse">
          Iniciando o DevControl
        </h2>
        <p className="text-sm md:text-base text-gray-400 font-light max-w-xs">
          Carregando módulos e preparando o seu ambiente de trabalho...
        </p>
      </div>

      <style>{`
        @keyframes loaderCircle {
          0% {
            transform: rotate(90deg);
            box-shadow:
              0 6px 12px 0 #38bdf8 inset,
              0 12px 18px 0 #005dff inset,
              0 36px 36px 0 #1e40af inset,
              0 0 3px 1.2px rgba(56, 189, 248, 0.3),
              0 0 6px 1.8px rgba(0, 93, 255, 0.2);
          }
          50% {
            transform: rotate(270deg);
            box-shadow:
              0 6px 12px 0 #60a5fa inset,
              0 12px 6px 0 #0284c7 inset,
              0 24px 36px 0 #005dff inset,
              0 0 3px 1.2px rgba(56, 189, 248, 0.3),
              0 0 6px 1.8px rgba(0, 93, 255, 0.2);
          }
          100% {
            transform: rotate(450deg);
            box-shadow:
              0 6px 12px 0 #4dc8fd inset,
              0 12px 18px 0 #005dff inset,
              0 36px 36px 0 #1e40af inset,
              0 0 3px 1.2px rgba(56, 189, 248, 0.3),
              0 0 6px 1.8px rgba(0, 93, 255, 0.2);
          }
        }

        @keyframes bracketLeft {
          0%, 100% { transform: translateX(0); opacity: 0.8; }
          15%, 85% { transform: translateX(-${size * 0.15}px); opacity: 1; }
        }

        @keyframes bracketRight {
          0%, 100% { transform: translateX(0); opacity: 0.8; }
          15%, 85% { transform: translateX(${size * 0.15}px); opacity: 1; }
        }

        @keyframes spinCenter {
          0%, 15% { transform: rotate(0deg); }
          85%, 100% { transform: rotate(360deg); }
        }

        .animate-loaderCircle {
          animation: loaderCircle 5s linear infinite;
        }

        .animate-bracketLeft {
          animation: bracketLeft 2.5s ease-in-out infinite;
        }

        .animate-bracketRight {
          animation: bracketRight 2.5s ease-in-out infinite;
        }

        .animate-spinCenter {
          animation: spinCenter 2.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;
        }

        @media (prefers-color-scheme: dark) {
          .animate-loaderCircle {
            box-shadow:
              0 6px 12px 0 #4b5563 inset,
              0 12px 18px 0 #6b7280 inset,
              0 36px 36px 0 #9ca3af inset,
              0 0 3px 1.2px rgba(107, 114, 128, 0.3),
              0 0 6px 1.8px rgba(156, 163, 175, 0.2);
          }
        }
      `}</style>
    </div>
  );
}

export default AppLoadingScreen;
