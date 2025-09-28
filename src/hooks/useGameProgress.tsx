import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export interface PuzzleProgress {
  id: string;
  completed: boolean;
  stars: number;
  timeSpent: number;
  completedAt?: string; // Mudando para string para melhor serialização
  moves: number;
  attempts: number; // NOVO: quantas vezes jogou
}

export interface GameProgress {
  playerName: string;
  totalStars: number;
  puzzlesCompleted: PuzzleProgress[];
  streakDays: number;
  lastPlayed: string; // Mudando para string
  certificates: string[];
  totalTimePlayed: number;
  soundEnabled: boolean; // NOVO
  vibrationEnabled: boolean; // NOVO
  highScores: { puzzleId: string; time: number; moves: number }[]; // NOVO
  currentLevel: number; // NOVO: puzzle atual
}

export const useGameProgress = () => {
  const [progress, setProgress] = useState<GameProgress>(() => {
    const saved = localStorage.getItem('biblePuzzleProgress');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Garante compatibilidade com versões antigas
        return {
          ...parsed,
          soundEnabled: parsed.soundEnabled ?? true,
          vibrationEnabled: parsed.vibrationEnabled ?? true,
          highScores: parsed.highScores ?? [],
          currentLevel: parsed.currentLevel ?? 0
        };
      } catch (e) {
        console.error('Erro ao carregar progresso:', e);
      }
    }
    return {
      playerName: '',
      totalStars: 0,
      puzzlesCompleted: [],
      streakDays: 0,
      lastPlayed: new Date().toISOString(),
      certificates: [],
      totalTimePlayed: 0,
      soundEnabled: true,
      vibrationEnabled: true,
      highScores: [],
      currentLevel: 0
    };
  });

  // Salva automaticamente quando progresso muda
  useEffect(() => {
    try {
      localStorage.setItem('biblePuzzleProgress', JSON.stringify(progress));
    } catch (e) {
      console.error('Erro ao salvar progresso:', e);
      toast.error('Erro ao salvar seu progresso');
    }
  }, [progress]);

  // Verifica e atualiza streak
  useEffect(() => {
    const lastDate = progress.lastPlayed ? new Date(progress.lastPlayed) : new Date();
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      // Jogou ontem, mantém streak
      setProgress(prev => ({ ...prev, streakDays: prev.streakDays + 1 }));
    } else if (diffDays > 1) {
      // Perdeu o streak
      setProgress(prev => ({ ...prev, streakDays: 0 }));
    }
  }, []);

  const calculateStars = (timeSeconds: number, moves: number): number => {
    // Sistema mais justo de estrelas
    if (timeSeconds < 45 && moves < 12) return 3; // Perfeito
    if (timeSeconds < 90 && moves < 20) return 2; // Bom
    return 1; // Completou
  };

  const savePuzzleCompletion = (
    puzzleId: string, 
    timeSpent: number, 
    moves: number
  ) => {
    const stars = calculateStars(timeSpent, moves);
    
    setProgress(prev => {
      const existingIndex = prev.puzzlesCompleted.findIndex(p => p.id === puzzleId);
      
      let newPuzzles = [...prev.puzzlesCompleted];
      let additionalStars = stars;
      let isNewRecord = false;

      if (existingIndex >= 0) {
        // Atualiza tentativas
        const oldPuzzle = newPuzzles[existingIndex];
        const attempts = (oldPuzzle.attempts || 0) + 1;
        
        // Verifica se é novo recorde
        if (timeSpent < oldPuzzle.timeSpent || moves < oldPuzzle.moves) {
          isNewRecord = true;
        }
        
        // Atualiza se conseguiu mais estrelas ou melhor tempo
        if (stars > oldPuzzle.stars || timeSpent < oldPuzzle.timeSpent) {
          additionalStars = Math.max(0, stars - oldPuzzle.stars);
          newPuzzles[existingIndex] = {
            id: puzzleId,
            completed: true,
            stars: Math.max(stars, oldPuzzle.stars),
            timeSpent: Math.min(timeSpent, oldPuzzle.timeSpent),
            moves: Math.min(moves, oldPuzzle.moves),
            completedAt: new Date().toISOString(),
            attempts
          };
        } else {
          additionalStars = 0;
          newPuzzles[existingIndex].attempts = attempts;
        }
      } else {
        // Primeira vez completando
        newPuzzles.push({
          id: puzzleId,
          completed: true,
          stars,
          timeSpent,
          moves,
          completedAt: new Date().toISOString(),
          attempts: 1
        });
      }

      // Atualiza high scores
      const newHighScores = [...prev.highScores];
      const scoreIndex = newHighScores.findIndex(s => s.puzzleId === puzzleId);
      
      if (scoreIndex >= 0) {
        if (timeSpent < newHighScores[scoreIndex].time) {
          newHighScores[scoreIndex] = { puzzleId, time: timeSpent, moves };
          isNewRecord = true;
        }
      } else {
        newHighScores.push({ puzzleId, time: timeSpent, moves });
      }

      // Verifica certificados
      const totalCompleted = newPuzzles.length;
      let newCertificates = [...prev.certificates];
      
      if (totalCompleted === 3 && !newCertificates.includes('iniciante')) {
        newCertificates.push('iniciante');
        showCertificateUnlocked('🏆 Certificado Iniciante Desbloqueado!');
      }
      if (totalCompleted === 7 && !newCertificates.includes('explorador')) {
        newCertificates.push('explorador');
        showCertificateUnlocked('🎯 Certificado Explorador Desbloqueado!');
      }
      if (totalCompleted === 10 && !newCertificates.includes('mestre')) {
        newCertificates.push('mestre');
        showCertificateUnlocked('👑 Certificado Mestre Bíblico Desbloqueado!');
      }

      // Verifica conquistas especiais
      const totalThreeStars = newPuzzles.filter(p => p.stars === 3).length;
      if (totalThreeStars === 5 && !newCertificates.includes('perfeito')) {
        newCertificates.push('perfeito');
        showCertificateUnlocked('⭐ Conquista: 5 Puzzles Perfeitos!');
      }

      if (isNewRecord) {
        toast.success('🎊 Novo Recorde!', { duration: 3000 });
      }

      // Atualiza level atual
      const nextLevel = Math.min(totalCompleted, 9);

      return {
        ...prev,
        puzzlesCompleted: newPuzzles,
        totalStars: prev.totalStars + additionalStars,
        certificates: newCertificates,
        lastPlayed: new Date().toISOString(),
        totalTimePlayed: prev.totalTimePlayed + timeSpent,
        highScores: newHighScores,
        currentLevel: nextLevel
      };
    });

    return stars;
  };

  const showCertificateUnlocked = (message: string) => {
    // Vibração de celebração
    if (progress.vibrationEnabled && 'vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 400]);
    }
    
    toast.success(message, {
      duration: 5000,
      style: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        fontSize: '18px',
        fontWeight: 'bold'
      }
    });
  };

  const getPuzzleProgress = (puzzleId: string): PuzzleProgress | undefined => {
    return progress.puzzlesCompleted.find(p => p.id === puzzleId);
  };

  const isPuzzleUnlocked = (puzzleIndex: number): boolean => {
    if (puzzleIndex === 0) return true;
    const previousPuzzleId = `puzzle-${puzzleIndex - 1}`;
    return progress.puzzlesCompleted.some(p => p.id === previousPuzzleId);
  };

  const getStats = () => {
    const totalPuzzles = 10;
    const completedCount = progress.puzzlesCompleted.length;
    const completionRate = (completedCount / totalPuzzles) * 100;
    const averageStars = progress.totalStars / Math.max(completedCount, 1);
    const totalAttempts = progress.puzzlesCompleted.reduce((sum, p) => sum + (p.attempts || 1), 0);
    const perfectPuzzles = progress.puzzlesCompleted.filter(p => p.stars === 3).length;
    
    return {
      totalStars: progress.totalStars,
      puzzlesCompleted: completedCount,
      completionRate,
      averageStars,
      totalTime: progress.totalTimePlayed,
      certificates: progress.certificates,
      totalAttempts,
      perfectPuzzles,
      currentStreak: progress.streakDays
    };
  };

  const setPlayerName = (name: string) => {
    setProgress(prev => ({ ...prev, playerName: name }));
  };

  const toggleSound = () => {
    setProgress(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }));
    return !progress.soundEnabled;
  };

  const toggleVibration = () => {
    setProgress(prev => ({ ...prev, vibrationEnabled: !prev.vibrationEnabled }));
    return !progress.vibrationEnabled;
  };

  const resetPuzzle = (puzzleId: string) => {
    setProgress(prev => ({
      ...prev,
      puzzlesCompleted: prev.puzzlesCompleted.filter(p => p.id !== puzzleId)
    }));
  };

  const resetAllProgress = () => {
    if (confirm('Tem certeza? Isso apagará todo seu progresso!')) {
      setProgress({
        playerName: progress.playerName,
        totalStars: 0,
        puzzlesCompleted: [],
        streakDays: 0,
        lastPlayed: new Date().toISOString(),
        certificates: [],
        totalTimePlayed: 0,
        soundEnabled: progress.soundEnabled,
        vibrationEnabled: progress.vibrationEnabled,
        highScores: [],
        currentLevel: 0
      });
      toast.success('Progresso resetado com sucesso!');
    }
  };

  const exportProgress = () => {
    const dataStr = JSON.stringify(progress, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `biblical-puzzle-progress-${Date.now()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importProgress = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        setProgress(imported);
        toast.success('Progresso importado com sucesso!');
      } catch {
        toast.error('Erro ao importar arquivo');
      }
    };
    reader.readAsText(file);
  };

  return {
    progress,
    savePuzzleCompletion,
    getPuzzleProgress,
    isPuzzleUnlocked,
    getStats,
    setPlayerName,
    calculateStars,
    toggleSound,
    toggleVibration,
    resetPuzzle,
    resetAllProgress,
    exportProgress,
    importProgress
  };
};
