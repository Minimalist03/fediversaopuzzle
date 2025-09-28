import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { puzzleImages, PuzzleImageData } from "@/data/puzzleImages";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { Trophy, Clock, Target, Star, Lock, Home, RotateCcw, ChevronRight, Share2 } from "lucide-react";

// ==================== INTERFACES ====================
interface PuzzlePiece {
  id: number;
  row: number;
  col: number;
  correctPosition: { row: number; col: number };
  isPlaced: boolean;
}

interface Position {
  row: number;
  col: number;
}

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

// ==================== CUSTOM HOOKS ====================
const useGameProgress = () => {
  const [progress, setProgress] = useState<GameProgress>(() => {
    const saved = localStorage.getItem('biblePuzzleProgress');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Se falhar ao parsear, retorna estado inicial
      }
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

  useEffect(() => {
    localStorage.setItem('biblePuzzleProgress', JSON.stringify(progress));
  }, [progress]);

  const calculateStars = (timeSeconds: number, moves: number): number => {
    if (timeSeconds < 60 && moves < 15) return 3;
    if (timeSeconds < 120 && moves < 25) return 2;
    return 1;
  };

  const savePuzzleCompletion = (puzzleId: string, timeSpent: number, moves: number) => {
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

      // Verifica certificados
      const totalCompleted = newPuzzles.length;
      let newCertificates = [...prev.certificates];
      
      if (totalCompleted === 3 && !newCertificates.includes('iniciante')) {
        newCertificates.push('iniciante');
        toast.success('🏆 Certificado Iniciante Desbloqueado!', { duration: 5000 });
      }
      if (totalCompleted === 7 && !newCertificates.includes('explorador')) {
        newCertificates.push('explorador');
        toast.success('🎯 Certificado Explorador Desbloqueado!', { duration: 5000 });
      }
      if (totalCompleted === 10 && !newCertificates.includes('mestre')) {
        newCertificates.push('mestre');
        toast.success('👑 Certificado Mestre Bíblico Desbloqueado!', { duration: 5000 });
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

  const getPuzzleProgress = (puzzleId: string): PuzzleProgress | undefined => {
    return progress.puzzlesCompleted.find(p => p.id === puzzleId);
  };

  const isPuzzleUnlocked = (puzzleIndex: number): boolean => {
    if (puzzleIndex === 0) return true;
    const previousPuzzleId = `puzzle-${puzzleIndex - 1}`;
    return progress.puzzlesCompleted.some(p => p.id === previousPuzzleId);
  };

  const setPlayerName = (name: string) => {
    setProgress(prev => ({ ...prev, playerName: name }));
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

  return {
    progress,
    savePuzzleCompletion,
    getPuzzleProgress,
    isPuzzleUnlocked,
    setPlayerName,
    getStats,
    calculateStars
  };
};

// ==================== COMPONENTE PRINCIPAL ====================
const PuzzleGame = () => {
  // Estados básicos do jogo
  const [pieces, setPieces] = useState<PuzzlePiece[]>([]);
  const [draggedPiece, setDraggedPiece] = useState<PuzzlePiece | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [showCongratulations, setShowCongratulations] = useState(false);
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  const [showNextPuzzleDialog, setShowNextPuzzleDialog] = useState(false);
  const [touchStartPos, setTouchStartPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPreview, setDragPreview] = useState<{ x: number; y: number; piece: PuzzlePiece } | null>(null);
  
  // Estados de responsividade
  const [isMobile, setIsMobile] = useState(false);
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  
  // Sistema de progresso
  const { 
    progress, 
    savePuzzleCompletion, 
    getPuzzleProgress,
    isPuzzleUnlocked,
    setPlayerName,
    getStats
  } = useGameProgress();
  
  // Estados para tempo e performance
  const [startTime, setStartTime] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [moves, setMoves] = useState(0);
  const [showStars, setShowStars] = useState(false);
  const [earnedStars, setEarnedStars] = useState(0);
  const [showWelcome, setShowWelcome] = useState(!progress.playerName);
  const [showParentDashboard, setShowParentDashboard] = useState(false);
  
  // Sons
  const { playSuccessSound, playPieceDropSound, playCompletionSound } = useSoundEffects();

  const currentPuzzle: PuzzleImageData = puzzleImages[currentPuzzleIndex];
  const GRID_SIZE = 3;

  // Detecta tipo de dispositivo
  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      if (width < 480) {
        setDeviceType('mobile');
      } else if (width < 768) {
        setDeviceType('tablet');
      } else {
        setDeviceType('desktop');
      }
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameStarted && !isComplete) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameStarted, isComplete, startTime]);

  // Tamanhos otimizados por dispositivo
  const getPieceSize = () => {
  const width = window.innerWidth;
  if (width < 480) return 90;
  if (width < 768) return 100;
  return 120;
};
  
  const pieceSize = getPieceSize();

  // Formatar tempo
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Inicializa as peças do quebra-cabeça
  const initializePuzzle = useCallback(() => {
    const newPieces: PuzzlePiece[] = [];
    
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        newPieces.push({
          id: row * GRID_SIZE + col,
          row: row,
          col: col,
          correctPosition: { row, col },
          isPlaced: false,
        });
      }
    }
    
    const shuffledPieces = [...newPieces].sort(() => Math.random() - 0.5);
    setPieces(shuffledPieces);
    setIsComplete(false);
    setGameStarted(true);
    setStartTime(Date.now());
    setElapsedTime(0);
    setMoves(0);
    toast(`✨ Monte ${currentPuzzle.title} arrastando as peças! 🙏`);
  }, [currentPuzzle]);

  // Verifica se o quebra-cabeça está completo
  const checkCompletion = useCallback(() => {
    const placedPieces = pieces.filter(piece => piece.isPlaced);
    if (placedPieces.length === GRID_SIZE * GRID_SIZE) {
      const allCorrect = placedPieces.every(piece => 
        piece.row === piece.correctPosition.row && 
        piece.col === piece.correctPosition.col
      );
      
      if (allCorrect && !isComplete) {
        setIsComplete(true);
        const timeSpent = Math.floor((Date.now() - startTime) / 1000);
        const stars = savePuzzleCompletion(
          `puzzle-${currentPuzzleIndex}`, 
          timeSpent, 
          moves
        );
        
        setEarnedStars(stars);
        playCompletionSound();
        
        // Mostra estrelas depois de 500ms
        setTimeout(() => {
          setShowStars(true);
          setTimeout(() => {
            setShowStars(false);
            setShowCongratulations(true);
          }, 2000);
        }, 500);
      }
    }
  }, [pieces, isComplete, startTime, moves, currentPuzzleIndex, savePuzzleCompletion, playCompletionSound]);

  useEffect(() => {
    checkCompletion();
  }, [pieces, checkCompletion]);

  // Handlers de drag
  const handleDragStart = (piece: PuzzlePiece) => {
    setDraggedPiece(piece);
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setDraggedPiece(null);
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent, piece: PuzzlePiece) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    setTouchStartPos({ 
      x: touch.clientX - rect.left, 
      y: touch.clientY - rect.top 
    });
    setDraggedPiece(piece);
    setIsDragging(true);
    setDragPreview({
      x: touch.clientX,
      y: touch.clientY,
      piece
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!draggedPiece || !isDragging) return;
    
    const touch = e.touches[0];
    setDragPreview(prev => prev ? {
      ...prev,
      x: touch.clientX,
      y: touch.clientY
    } : null);
    
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    document.querySelectorAll('.puzzle-slot').forEach(slot => {
      slot.classList.remove('drag-over');
    });
    
    if (element && element.classList.contains('puzzle-slot')) {
      element.classList.add('drag-over');
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!draggedPiece || !isDragging) return;
    
    const touch = e.changedTouches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    
    document.querySelectorAll('.puzzle-slot').forEach(slot => {
      slot.classList.remove('drag-over');
    });
    
    if (element && element.classList.contains('puzzle-slot')) {
      const slotKey = element.getAttribute('data-slot');
      if (slotKey) {
        const [row, col] = slotKey.split('-').map(Number);
        handleDrop(row, col);
      }
    }
    
    setDraggedPiece(null);
    setIsDragging(false);
    setTouchStartPos(null);
    setDragPreview(null);
  };

  const handleDrop = (targetRow: number, targetCol: number) => {
    if (!draggedPiece) return;

    const existingPiece = pieces.find(
      p => p.isPlaced && p.row === targetRow && p.col === targetCol
    );

    if (existingPiece) {
      toast("Já existe uma peça aqui! 🤔");
      return;
    }

    setMoves(prev => prev + 1);

    setPieces(prevPieces => 
      prevPieces.map(piece => 
        piece.id === draggedPiece.id
          ? { ...piece, row: targetRow, col: targetCol, isPlaced: true }
          : piece
      )
    );

    if (draggedPiece.correctPosition.row === targetRow && 
        draggedPiece.correctPosition.col === targetCol) {
      playSuccessSound();
      toast("🎉 Perfeito! Peça no lugar certo!");
    } else {
      playPieceDropSound();
      toast("😊 Continue tentando!");
    }
  };

  const resetGame = () => {
    setShowCongratulations(false);
    setShowNextPuzzleDialog(false);
    setShowStars(false);
    initializePuzzle();
  };

  const goToNextPuzzle = () => {
    if (currentPuzzleIndex < puzzleImages.length - 1) {
      setCurrentPuzzleIndex(prev => prev + 1);
      setShowCongratulations(false);
      setShowNextPuzzleDialog(false);
      setShowStars(false);
      initializePuzzle();
    } else {
      setShowNextPuzzleDialog(true);
    }
  };

  const goToPuzzleSelection = () => {
    setGameStarted(false);
    setShowCongratulations(false);
    setShowNextPuzzleDialog(false);
    setShowStars(false);
  };

  const shareProgress = () => {
    const stats = getStats();
    const text = `🎉 ${progress.playerName} já completou ${stats.puzzlesCompleted} quebra-cabeças bíblicos e ganhou ${stats.totalStars} estrelas! 🌟`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Quebra-Cabeças Bíblicos',
        text: text,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(text);
      toast.success('Texto copiado! Cole no WhatsApp 📱');
    }
  };

  const renderPuzzlePiece = (piece: PuzzlePiece, isInPalette = false) => {
    const style = {
      backgroundImage: `url(${currentPuzzle.image})`,
      backgroundSize: `${pieceSize * GRID_SIZE}px ${pieceSize * GRID_SIZE}px`,
      backgroundPosition: `-${piece.correctPosition.col * pieceSize}px -${piece.correctPosition.row * pieceSize}px`,
      width: `${pieceSize}px`,
      height: `${pieceSize}px`,
    };

    return (
      <div
        key={piece.id}
        className={`puzzle-piece cursor-grab active:cursor-grabbing touch-none select-none 
          ${draggedPiece?.id === piece.id ? 'opacity-50' : ''} 
          ${piece.isPlaced && piece.row === piece.correctPosition.row && 
            piece.col === piece.correctPosition.col ? 'ring-2 ring-green-500' : ''}
          rounded-lg shadow-md hover:shadow-lg transition-all`}
        style={style}
        draggable
        onDragStart={() => handleDragStart(piece)}
        onDragEnd={handleDragEnd}
        onTouchStart={(e) => handleTouchStart(e, piece)}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />
    );
  };

  const renderPuzzleSlot = (row: number, col: number) => {
    const placedPiece = pieces.find(
      p => p.isPlaced && p.row === row && p.col === col
    );

    return (
      <div
        key={`slot-${row}-${col}`}
        data-slot={`${row}-${col}`}
        className={`puzzle-slot flex items-center justify-center border-2 border-dashed 
          ${placedPiece ? 'border-transparent' : 'border-gray-300'} 
          rounded-lg transition-all hover:bg-gray-50`}
        style={{ width: `${pieceSize}px`, height: `${pieceSize}px` }}
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.classList.add('bg-green-50', 'border-green-400');
        }}
        onDragLeave={(e) => {
          e.currentTarget.classList.remove('bg-green-50', 'border-green-400');
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.classList.remove('bg-green-50', 'border-green-400');
          handleDrop(row, col);
        }}
      >
        {placedPiece && renderPuzzlePiece(placedPiece)}
      </div>
    );
  };

  // Tela de Boas-Vindas
  if (showWelcome) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100 
                      flex items-center justify-center p-4">
        <Card className="max-w-lg w-full p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 
                         bg-clip-text text-transparent mb-2">
              Quebra-Cabeças Bíblicos
            </h1>
            <p className="text-gray-600">Aprenda histórias sagradas brincando! 🙏</p>
          </div>

          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Qual é o seu nome, campeão(ã)?
            </label>
            <Input
              type="text"
              placeholder="Digite seu nome..."
              className="text-lg p-3"
              maxLength={20}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const value = (e.target as HTMLInputElement).value.trim();
                  if (value) {
                    setPlayerName(value);
                    setShowWelcome(false);
                  }
                }
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-8">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-3 rounded-xl text-white">
              <div className="text-2xl mb-1">📖</div>
              <div className="text-sm font-medium">10 Histórias</div>
            </div>
            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-3 rounded-xl text-white">
              <div className="text-2xl mb-1">⭐</div>
              <div className="text-sm font-medium">Ganhe Estrelas</div>
            </div>
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-3 rounded-xl text-white">
              <div className="text-2xl mb-1">🏆</div>
              <div className="text-sm font-medium">Certificados</div>
            </div>
            <div className="bg-gradient-to-r from-green-500 to-teal-500 p-3 rounded-xl text-white">
              <div className="text-2xl mb-1">🎮</div>
              <div className="text-sm font-medium">Jogue Offline</div>
            </div>
          </div>

          <Button
            onClick={() => {
              const input = document.querySelector('input') as HTMLInputElement;
              const name = input?.value.trim() || 'Campeão';
              setPlayerName(name);
              setShowWelcome(false);
            }}
            className="w-full text-lg py-6 bg-gradient-to-r from-green-500 to-green-600"
          >
            Começar Aventura! 🚀
          </Button>
        </Card>
      </div>
    );
  }

  // Dashboard dos Pais
  if (showParentDashboard) {
    const stats = getStats();
    const formatTotalTime = (seconds: number) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return hours > 0 ? `${hours}h ${minutes}min` : `${minutes} minutos`;
    };

    return (
      <div className="min-h-screen p-6 bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">
              Acompanhamento - {progress.playerName}
            </h1>
            <Button onClick={() => setShowParentDashboard(false)} variant="outline">
              <Home className="mr-2 h-4 w-4" />
              Voltar ao Jogo
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="p-4 text-center">
              <Clock className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <div className="text-2xl font-bold">{formatTotalTime(stats.totalTime)}</div>
              <div className="text-sm text-gray-600">Tempo Total</div>
            </Card>

            <Card className="p-4 text-center">
              <Target className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <div className="text-2xl font-bold">{stats.puzzlesCompleted}/10</div>
              <div className="text-sm text-gray-600">Completos</div>
            </Card>

            <Card className="p-4 text-center">
              <Star className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
              <div className="text-2xl font-bold">{stats.totalStars}</div>
              <div className="text-sm text-gray-600">Estrelas Total</div>
            </Card>

            <Card className="p-4 text-center">
              <Trophy className="h-8 w-8 mx-auto mb-2 text-purple-500" />
              <div className="text-2xl font-bold">{stats.certificates.length}</div>
              <div className="text-sm text-gray-600">Certificados</div>
            </Card>
          </div>

          <Card className="p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Histórias Completadas</h2>
            <div className="space-y-3">
              {progress.puzzlesCompleted.map((puzzle, idx) => (
                <div key={puzzle.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">{puzzleImages[parseInt(puzzle.id.split('-')[1])]?.title || `História ${idx + 1}`}</div>
                    <div className="text-sm text-gray-600">
                      Tempo: {Math.floor(puzzle.timeSpent / 60)}min | Movimentos: {puzzle.moves}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {[...Array(3)].map((_, i) => (
                      <Star key={i} className={`h-5 w-5 ${i < puzzle.stars ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Button onClick={shareProgress} className="w-full" size="lg">
            <Share2 className="mr-2" />
            Compartilhar Progresso no WhatsApp
          </Button>
        </div>
      </div>
    );
  }

  // Seleção de Puzzles
  if (!gameStarted) {
    return (
      <div className="min-h-screen p-4 sm:p-6 bg-gradient-to-br from-background via-card to-secondary/20">
        <div className="max-w-6xl mx-auto">
          {/* Header com progresso */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary mb-2">
              Olá, {progress.playerName}! 👋
            </h1>
            <div className="flex flex-wrap justify-center gap-3 mb-4">
              <div className="bg-yellow-100 px-4 py-2 rounded-full">
                <span className="text-yellow-800 font-bold flex items-center gap-1">
                  <Star className="h-4 w-4" />
                  {progress.totalStars} estrelas
                </span>
              </div>
              <div className="bg-blue-100 px-4 py-2 rounded-full">
                <span className="text-blue-800 font-bold">
                  🧩 {progress.puzzlesCompleted.length}/10 completos
                </span>
              </div>
              {progress.certificates.length > 0 && (
                <div className="bg-purple-100 px-4 py-2 rounded-full">
                  <span className="text-purple-800 font-bold flex items-center gap-1">
                    <Trophy className="h-4 w-4" />
                    {progress.certificates.length} certificados
                  </span>
                </div>
              )}
            </div>
            <Button 
              onClick={() => setShowParentDashboard(true)} 
              variant="outline"
              size="sm"
            >
              📊 Ver Relatório Completo
            </Button>
          </div>

          {/* Grid de puzzles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {puzzleImages.map((puzzle, index) => {
              const puzzleProgress = getPuzzleProgress(`puzzle-${index}`);
              const isUnlocked = isPuzzleUnlocked(index);
              
              return (
                <Card 
                  key={puzzle.id} 
                  className={`relative overflow-hidden transition-all duration-300 
                    ${isUnlocked ? 'hover:scale-105 cursor-pointer hover:shadow-xl' : 'opacity-60'}
                    ${puzzleProgress?.completed ? 'ring-2 ring-green-500' : ''}`}
                >
                  <div 
                    onClick={() => {
                      if (isUnlocked) {
                        setCurrentPuzzleIndex(index);
                        initializePuzzle();
                      } else {
                        toast.error('Complete a história anterior primeiro! 🔒');
                      }
                    }}
                    className="p-4"
                  >
                    {/* Imagem com overlay se bloqueado */}
                    <div className="relative">
                      <img 
                        src={puzzle.image} 
                        alt={puzzle.title}
                        className={`w-full h-32 object-cover rounded-xl mb-3 
                          ${!isUnlocked ? 'filter grayscale blur-sm' : ''}`}
                      />
                      
                      {/* Estrelas se completado */}
                      {puzzleProgress?.completed && (
                        <div className="absolute top-2 right-2 bg-white/90 rounded-full px-2 py-1">
                          <div className="flex gap-0.5">
                            {[...Array(3)].map((_, i) => (
                              <Star 
                                key={i} 
                                className={`h-4 w-4 ${i < puzzleProgress.stars ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Cadeado se bloqueado */}
                      {!isUnlocked && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Lock className="h-12 w-12 text-white drop-shadow-lg" />
                        </div>
                      )}
                    </div>
                    
                    <h3 className="text-lg font-bold text-primary mb-1">
                      {puzzle.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {puzzle.description}
                    </p>
                    
                    {/* Status */}
                    <div className="mt-2">
                      {puzzleProgress?.completed ? (
                        <span className="text-xs text-green-600 font-medium">
                          ✅ Completo em {Math.floor(puzzleProgress.timeSpent / 60)}min
                        </span>
                      ) : isUnlocked ? (
                        <span className="text-xs text-blue-600 font-medium">
                          🔓 Disponível para jogar
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500 font-medium">
                          🔒 Complete a anterior
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Tela do Jogo
  return (
    <div className="min-h-screen p-4 sm:p-6 bg-gradient-to-br from-background via-card to-secondary/20">
      <div className="max-w-7xl mx-auto">
        {/* Header do jogo */}
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-4xl font-bold text-primary mb-2">
            {currentPuzzle.title}
          </h1>
          <div className="flex justify-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span className="font-mono">{formatTime(elapsedTime)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Target className="h-4 w-4" />
              <span>{moves} movimentos</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4" />
              <span>Puzzle {currentPuzzleIndex + 1}/{puzzleImages.length}</span>
            </div>
          </div>
        </div>

        {/* Área do jogo */}
        <div className="flex flex-col lg:flex-row gap-6 items-center justify-center">
          {/* Tabuleiro */}
          <Card className="p-4">
            <h2 className="text-lg font-semibold text-center mb-4 text-primary">
              Monte a imagem aqui! 🧩
            </h2>
            <div className="grid grid-cols-3 gap-2 bg-game-board p-4 rounded-xl">
              {Array.from({ length: GRID_SIZE }, (_, row) =>
                Array.from({ length: GRID_SIZE }, (_, col) =>
                  renderPuzzleSlot(row, col)
                )
              )}
            </div>
          </Card>

          {/* Paleta de peças */}
         {/* Paleta de peças - CORRIGIDA PARA MOBILE */}
<Card className="p-2 w-full">
  <h2 className="text-sm font-semibold text-center mb-2 text-primary">
    Peças disponíveis 🎯 ({pieces.filter(p => !p.isPlaced).length})
  </h2>
  
  <div className={`
    ${isMobile 
      ? 'flex gap-2 overflow-x-auto pb-2' 
      : 'grid grid-cols-3 gap-2'} 
    bg-gray-50 rounded-lg p-2 max-h-[300px] overflow-y-auto
  `}>
    {pieces.filter(piece => !piece.isPlaced).length > 0 ? (
      pieces
        .filter(piece => !piece.isPlaced)
        .map(piece => (
          <div key={piece.id} className="flex-shrink-0">
            {renderPuzzlePiece(piece, true)}
          </div>
        ))
    ) : (
      <div className="col-span-3 text-center py-4 text-gray-500">
        <p className="text-lg">🎉</p>
        <p className="text-xs">Todas as peças colocadas!</p>
      </div>
    )}
  </div>
</Card>
        </div>

        {/* Controles */}
        <div className="text-center mt-6 space-y-3">
          <div className="flex justify-center gap-3">
            <Button onClick={goToPuzzleSelection} variant="outline">
              <Home className="mr-2 h-4 w-4" />
              Escolher História
            </Button>
            <Button onClick={resetGame} variant="outline">
              <RotateCcw className="mr-2 h-4 w-4" />
              Reiniciar
            </Button>
          </div>
          
          {isComplete && (
            <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 text-white">
              <p className="text-2xl font-bold">
                🎉 Parabéns! Puzzle Completo! 🎉
              </p>
            </div>
          )}
        </div>

        {/* Animação de Estrelas */}
        {showStars && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-3xl p-8">
              <h2 className="text-3xl font-bold text-center mb-6">Parabéns! 🎉</h2>
              <div className="flex gap-4 justify-center">
                {[1, 2, 3].map((starNum) => (
                  <Star
                    key={starNum}
                    className={`h-16 w-16 transition-all duration-500 ${
                      starNum <= earnedStars 
                        ? 'text-yellow-500 fill-yellow-500 scale-110' 
                        : 'text-gray-300 scale-90'
                    }`}
                  />
                ))}
              </div>
              <p className="text-center mt-4 text-lg">
                {earnedStars === 3 && "Perfeito! Você é incrível!"}
                {earnedStars === 2 && "Muito bem! Continue assim!"}
                {earnedStars === 1 && "Bom trabalho! Tente ser mais rápido!"}
              </p>
            </div>
          </div>
        )}

        {/* Dialog de Parabéns */}
        <Dialog open={showCongratulations} onOpenChange={setShowCongratulations}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-3xl font-bold text-center text-primary">
                🎉 Parabéns, {progress.playerName}! 🎉
              </DialogTitle>
              <DialogDescription className="text-center space-y-4">
                <div className="text-xl font-semibold">
                  Você completou {currentPuzzle.title}!
                </div>
                
                <div className="flex justify-center gap-2">
                  {[...Array(3)].map((_, i) => (
                    <Star 
                      key={i} 
                      className={`h-12 w-12 ${i < earnedStars ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
                    />
                  ))}
                </div>

                <div className="bg-gradient-to-r from-primary/5 to-accent/5 p-6 rounded-lg">
                  <p className="text-sm font-medium text-primary mb-2">
                    ✨ Versículo para Meditar:
                  </p>
                  <p className="text-base italic">
                    "{currentPuzzle.verse}"
                  </p>
                  <p className="text-sm text-muted-foreground mt-2 text-right">
                    - {currentPuzzle.reference}
                  </p>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm">
                    <strong>Para os pais:</strong> Converse com seu filho sobre esta história!
                  </p>
                </div>

                <div className="flex gap-3 justify-center pt-4">
                  <Button onClick={() => setShowCongratulations(false)} variant="outline">
                    Fechar
                  </Button>
                  <Button onClick={resetGame} variant="outline">
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Jogar Novamente
                  </Button>
                  {currentPuzzleIndex < puzzleImages.length - 1 && (
                    <Button onClick={goToNextPuzzle} className="bg-primary">
                      Próxima História
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </div>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>

        {/* Dialog Final */}
        <Dialog open={showNextPuzzleDialog} onOpenChange={setShowNextPuzzleDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-3xl font-bold text-center text-primary">
                🌟 Incrível! Você Completou Tudo! 🌟
              </DialogTitle>
              <DialogDescription className="text-center space-y-4">
                <div className="text-xl font-semibold">
                  Parabéns por completar todas as 10 histórias bíblicas!
                </div>
                <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 p-6 rounded-lg">
                  <Trophy className="h-16 w-16 mx-auto mb-3 text-yellow-600" />
                  <p className="text-lg font-bold">Você é um verdadeiro campeão!</p>
                  <p className="text-sm mt-2">Total de {progress.totalStars} estrelas conquistadas!</p>
                </div>
                <Button onClick={goToPuzzleSelection} className="w-full">
                  <Home className="mr-2 h-4 w-4" />
                  Voltar ao Início
                </Button>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>

        {/* Preview de Drag para Mobile */}
        {dragPreview && isMobile && (
          <div
            className="fixed pointer-events-none z-50 opacity-80 rounded-lg"
            style={{
              left: dragPreview.x - pieceSize / 2,
              top: dragPreview.y - pieceSize / 2,
              width: pieceSize,
              height: pieceSize,
              backgroundImage: `url(${currentPuzzle.image})`,
              backgroundSize: `${pieceSize * GRID_SIZE}px ${pieceSize * GRID_SIZE}px`,
              backgroundPosition: `-${dragPreview.piece.correctPosition.col * pieceSize}px -${dragPreview.piece.correctPosition.row * pieceSize}px`,
              border: '2px solid hsl(var(--primary))',
              boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            }}
          />
        )}
      </div>
    </div>
  );
};

export default PuzzleGame;
