import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface PuzzleProgress {
  id: string;
  completed: boolean;
  stars: number;
  timeSpent: number;
  completedAt?: Date;
  moves: number;
}

interface GameProgress {
  playerName: string;
  totalStars: number;
  puzzlesCompleted: PuzzleProgress[];
  streakDays: number;
  lastPlayed: Date;
  certificates: string[];
  totalTimePlayed: number;
}

export const useGameProgress = () => {
  const [progress, setProgress] = useState<GameProgress>(() => {
    const saved = localStorage.getItem('biblePuzzleProgress');
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      playerName: '',
      totalStars: 0,
      puzzlesCompleted: [],
      streakDays: 0,
      lastPlayed: new Date(),
      certificates: [],
      totalTimePlayed: 0
    };
  });

  // Salva automaticamente quando progresso muda
  useEffect(() => {
    localStorage.setItem('biblePuzzleProgress', JSON.stringify(progress));
  }, [progress]);

  const calculateStars = (timeSeconds: number, moves: number): number => {
    // 3 estrelas: < 60 segundos e < 15 movimentos
    if (timeSeconds < 60 && moves < 15) return 3;
    // 2 estrelas: < 120 segundos e < 25 movimentos
    if (timeSeconds < 120 && moves < 25) return 2;
    // 1 estrela: completou
    return 1;
  };

  const savePuzzleCompletion = (
    puzzleId: string, 
    timeSpent: number, 
    moves: number
  ) => {
    const stars = calculateStars(timeSpent, moves);
    
    setProgress(prev => {
      const existingIndex = prev.puzzlesCompleted.findIndex(p => p.id === puzzleId);
      const puzzleData: PuzzleProgress = {
        id: puzzleId,
        completed: true,
        stars,
        timeSpent,
        moves,
        completedAt: new Date()
      };

      let newPuzzles = [...prev.puzzlesCompleted];
      let additionalStars = stars;

      if (existingIndex >= 0) {
        // Atualiza se conseguiu mais estrelas
        const oldStars = newPuzzles[existingIndex].stars;
        if (stars > oldStars) {
          additionalStars = stars - oldStars;
          newPuzzles[existingIndex] = puzzleData;
        } else {
          additionalStars = 0;
        }
      } else {
        newPuzzles.push(puzzleData);
      }

      // Verifica conquistas
      const totalCompleted = newPuzzles.length;
      let newCertificates = [...prev.certificates];
      
      if (totalCompleted === 3 && !newCertificates.includes('iniciante')) {
        newCertificates.push('iniciante');
        showCertificateUnlocked('Certificado Iniciante! 🏆');
      }
      if (totalCompleted === 7 && !newCertificates.includes('explorador')) {
        newCertificates.push('explorador');
        showCertificateUnlocked('Certificado Explorador! 🎯');
      }
      if (totalCompleted === 10 && !newCertificates.includes('mestre')) {
        newCertificates.push('mestre');
        showCertificateUnlocked('Certificado Mestre Bíblico! 👑');
      }

      return {
        ...prev,
        puzzlesCompleted: newPuzzles,
        totalStars: prev.totalStars + additionalStars,
        certificates: newCertificates,
        lastPlayed: new Date(),
        totalTimePlayed: prev.totalTimePlayed + timeSpent
      };
    });

    return stars;
  };

  const showCertificateUnlocked = (message: string) => {
    toast.success(message, {
      duration: 5000,
      style: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontSize: '18px'
      }
    });
  };

  const getPuzzleProgress = (puzzleId: string): PuzzleProgress | undefined => {
    return progress.puzzlesCompleted.find(p => p.id === puzzleId);
  };

  const isPuzzleUnlocked = (puzzleIndex: number): boolean => {
    if (puzzleIndex === 0) return true; // Primeiro sempre desbloqueado
    // Desbloqueia se o anterior foi completado
    const previousPuzzleId = `puzzle-${puzzleIndex - 1}`;
    return progress.puzzlesCompleted.some(p => p.id === previousPuzzleId);
  };

  const getStats = () => {
    const totalPuzzles = 10;
    const completedCount = progress.puzzlesCompleted.length;
    const completionRate = (completedCount / totalPuzzles) * 100;
    const averageStars = progress.totalStars / Math.max(completedCount, 1);
    
    return {
      totalStars: progress.totalStars,
      puzzlesCompleted: completedCount,
      completionRate,
      averageStars,
      totalTime: progress.totalTimePlayed,
      certificates: progress.certificates
    };
  };

  const setPlayerName = (name: string) => {
    setProgress(prev => ({ ...prev, playerName: name }));
  };

  return {
    progress,
    savePuzzleCompletion,
    getPuzzleProgress,
    isPuzzleUnlocked,
    getStats,
    setPlayerName,
    calculateStars
  };
};
