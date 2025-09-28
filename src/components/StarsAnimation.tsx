import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface StarsAnimationProps {
  stars: number;
  show: boolean;
  onComplete?: () => void;
}

export const StarsAnimation = ({ stars, show, onComplete }: StarsAnimationProps) => {
  const [currentStar, setCurrentStar] = useState(0);

  useEffect(() => {
    if (!show) {
      setCurrentStar(0);
      return;
    }

    const showStars = async () => {
      for (let i = 1; i <= stars; i++) {
        await new Promise(resolve => setTimeout(resolve, 400));
        setCurrentStar(i);
        
        // Som de estrela
        const audio = new Audio('/sounds/star-ding.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {});
      }
      
      setTimeout(() => {
        onComplete?.();
      }, 1000);
    };

    showStars();
  }, [show, stars]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="bg-black/50 rounded-3xl p-8 pointer-events-auto">
        <h2 className="text-3xl font-bold text-white text-center mb-6">
          Parabéns! 🎉
        </h2>
        
        <div className="flex gap-4 justify-center">
          <AnimatePresence>
            {[1, 2, 3].map((starNum) => (
              <motion.div
                key={starNum}
                initial={{ scale: 0, rotate: -180 }}
                animate={
                  currentStar >= starNum
                    ? { 
                        scale: 1, 
                        rotate: 0,
                        transition: {
                          type: "spring",
                          stiffness: 260,
                          damping: 20
                        }
                      }
                    : { scale: 0 }
                }
              >
                <div className={`text-6xl ${currentStar >= starNum ? '' : 'grayscale opacity-30'}`}>
                  ⭐
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <p className="text-white text-center mt-4 text-lg">
          {stars === 3 && "Perfeito! Você é incrível!"}
          {stars === 2 && "Muito bem! Continue assim!"}
          {stars === 1 && "Bom trabalho! Tente novamente para mais estrelas!"}
        </p>
      </div>
    </div>
  );
};
