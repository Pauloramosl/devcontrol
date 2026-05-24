import React, { useEffect, useRef } from 'react';
import { useInView, animate } from 'framer-motion';

export function AnimatedCounter({
  value,
  formatCurrency = false,
  className = ""
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-10px" });

  useEffect(() => {
    if (isInView) {
      const controls = animate(0, value, {
        duration: 1.2,
        ease: "easeOut",
        onUpdate(latest) {
          if (ref.current) {
            if (formatCurrency) {
              ref.current.textContent = new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(latest);
            } else {
              ref.current.textContent = Intl.NumberFormat('pt-BR').format(Math.round(latest));
            }
          }
        }
      });
      return () => controls.stop();
    }
  }, [isInView, value, formatCurrency]);

  // Initial text just to not have empty space
  const initialText = formatCurrency 
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(0) 
    : "0";

  return <span ref={ref} className={className}>{initialText}</span>;
}
