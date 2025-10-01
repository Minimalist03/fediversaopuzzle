import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { puzzleImages, PuzzleImageData } from "@/data/puzzleImages";
import { useGameProgress } from "@/hooks/useGameProgress";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { Trophy, Clock, Target, Star, Lock, Home, RotateCcw, ChevronRight, Share2, Zap } from "lucide-react";

interface PuzzlePiece {
  id: number;
  correctRow: number;
  correctCol: number;
  currentRow: number;
  currentCol: number;
  isPlaced: boolean;
}

type DifficultyLevel = 'easy' | 'medium' | 'hard';

const DIFFICULTY_CONFIG = {
  easy: { gridSize: 2, name: 'Fácil', icon: '😊', color: 'bg-green-500', stars: 1 },
  medium: { gridSize: 3, name: 'Médio', icon: '🤔', color: 'bg-yellow-500', stars: 2 },
  hard: { gridSize: 4, name: 'Difícil', icon: '😤', color: 'bg-red-500', stars: 3 }
};

const PuzzleGame = () => {
  const [pieces, setPieces] = useState<PuzzlePiece[]>([]);
  const [gridSize, setGridSize] = useState(3);
  const [draggedPiece, setDraggedPiece] = useState<PuzzlePiece | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [showCongratulations, setShowCongratulations] = useState(false);
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  const [showNextPuzzleDialog, setShowNextPuzzleDialog] = useState(false);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('medium');
  const [showDifficultySelector, setShowDifficultySelector] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [moves, setMoves] = useState(0);
  const [earnedStars, setEarnedStars] = useState(0);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showParentDashboard, setShowParentDashboard] = useState(false);
  
  const { 
    progress, 
    savePuzzleCompletion, 
    getPuzzleProgress,
    isPuzzleUnlocked,
    setPlayerName,
    getStats
  } = useGameProgress();
  
  const { playSuccessSound, playPieceDropSound, playCompletionSound } = useSoundEffects();

  const currentPuzzle: PuzzleImageData = puzzleImages[currentPuzzleIndex];

  useEffect(() => {
    setShowWelcome(!progress.playerName);
  }, [progress.playerName]);

  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameStarted && !isComplete && !showDifficultySelector && pieces.length > 0) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameStarted, isComplete, startTime, showDifficultySelector, pieces.length]);

  const getPieceSize = useCallback(() => {
    const width = window.innerWidth;
    
    if (width <= 480) {
      if (gridSize === 2) return 100;
      if (gridSize === 3) return 75;
      return 60;
    }
    
    if (width < 768) {
      if (gridSize === 2) return 110;
      if (gridSize === 3) return 90;
      return 70;
    }
    
    if (gridSize === 2) return 130;
    if (gridSize === 3) return 100;
    return 80;
  }, [gridSize]);

  const pieceSize = getPieceSize();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startGameWithDifficulty = (selectedDifficulty: DifficultyLevel) => {
    const size = DIFFICULTY_CONFIG[selectedDifficulty].gridSize;
    setDifficulty(selectedDifficulty);
    setGridSize(size);
    
    const newPieces: PuzzlePiece[] = [];
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        newPieces.push({
          id: row * size + col,
          correctRow: row,
          correctCol: col,
          currentRow: -1,
          currentCol: -1,
          isPlaced: false,
        });
      }
    }
    
    const shuffled = [...newPieces].sort(() => Math.random() - 0.5);
    setPieces(shuffled);
    setIsComplete(false);
    setShowDifficultySelector(false);
    setStartTime(Date.now());
    setElapsedTime(0);
    setMoves(0);
  };

  useEffect(() => {
    if (pieces.length === 0) return;
    
    const placedPieces = pieces.filter(p => p.isPlaced);
    if (placedPieces.length === gridSize * gridSize) {
      const allCorrect = placedPieces.every(p => 
        p.currentRow === p.correctRow && p.currentCol === p.correctCol
      );
      
      if (allCorrect && !isComplete) {
        setIsComplete(true);
        const timeSpent = Math.floor((Date.now() - startTime) / 1000);
        const baseStars = savePuzzleCompletion(`puzzle-${currentPuzzleIndex}`, timeSpent, moves);
        const totalStars = Math.min(baseStars + DIFFICULTY_CONFIG[difficulty].stars, 3);
        setEarnedStars(totalStars);
        playCompletionSound();
        setTimeout(() => setShowCongratulations(true), 500);
      }
    }
  }, [pieces, gridSize, isComplete, startTime, moves, currentPuzzleIndex, savePuzzleCompletion, playCompletionSound, difficulty]);

  const handleDrop = (targetRow: number, targetCol: number, piece: PuzzlePiece) => {
    const existingPiece = pieces.find(
      p => p.isPlaced && p.currentRow === targetRow && p.currentCol === targetCol
    );
    if (existingPiece) return;

    setMoves(prev => prev + 1);
    setPieces(prev => prev.map(p => 
      p.id === piece.id
        ? { ...p, currentRow: targetRow, currentCol: targetCol, isPlaced: true }
        : p
    ));

    if (piece.correctRow === targetRow && piece.correctCol === targetCol) {
      playSuccessSound();
    } else {
      playPieceDropSound();
    }
  };

  const renderPiece = (piece: PuzzlePiece) => {
    const totalImageSize = pieceSize * gridSize;
    const bgX = -(piece.correctCol * pieceSize);
    const bgY = -(piece.correctRow * pieceSize);

    return (
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('pieceId', piece.id.toString());
        }}
        className={`cursor-grab active:cursor-grabbing rounded-lg shadow-md hover:shadow-lg transition-all ${
          piece.isPlaced && piece.currentRow === piece.correctRow && piece.currentCol === piece.correctCol
            ? 'ring-2 ring-green-500'
            : ''
        }`}
        style={{
          width: pieceSize,
          height: pieceSize,
          backgroundImage: `url(${currentPuzzle.image})`,
          backgroundSize: `${totalImageSize}px ${totalImageSize}px`,
          backgroundPosition: `${bgX}px ${bgY}px`,
          backgroundRepeat: 'no-repeat'
        }}
      />
    );
  };

  const renderSlot = (row: number, col: number) => {
    const placedPiece = pieces.find(p => p.isPlaced && p.currentRow === row && p.currentCol === col);

    return (
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const pieceId = parseInt(e.dataTransfer.getData('pieceId'));
          const piece = pieces.find(p => p.id === pieceId);
          if (piece) handleDrop(row, col, piece);
        }}
        className={`flex items-center justify-center border-2 border-dashed rounded-lg transition-all ${
          placedPiece ? 'border-transparent' : 'border-gray-300 hover:bg-gray-50'
        }`}
        style={{ width: pieceSize, height: pieceSize }}
      >
        {placedPiece && renderPiece(placedPiece)}
      </div>
    );
  };

  if (showWelcome) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8">
          <div className="text-center mb-8">
            <div className="text-7xl mb-4 animate-bounce">🧩</div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Quebra-Cabeças Bíblicos</h1>
            <p className="text-gray-600">10 histórias para aprender e se divertir</p>
          </div>
          <div className="space-y-4">
            <Input
              type="text"
              placeholder="Digite seu nome aqui..."
              className="text-2xl p-6 text-center font-bold"
              maxLength={20}
              autoFocus
              id="nameInput"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  setPlayerName(e.currentTarget.value.trim());
                  setShowWelcome(false);
                  toast.success(`Bem-vindo(a), ${e.currentTarget.value.trim()}!`);
                }
              }}
            />
            <Button
              onClick={() => {
                const input = document.getElementById('nameInput') as HTMLInputElement;
                if (input?.value.trim()) {
                  setPlayerName(input.value.trim());
                  setShowWelcome(false);
                  toast.success(`Bem-vindo(a), ${input.value.trim()}!`);
                } else {
                  toast.error('Por favor, digite seu nome para começar');
                }
              }}
              className="w-full text-xl py-7 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 font-bold"
            >
              COMEÇAR A JOGAR
            </Button>
          </div>
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-3 gap-3 text-center text-xs text-gray-600">
              <div><div className="font-bold text-lg">10</div><div>Histórias</div></div>
              <div><div className="font-bold text-lg">3</div><div>Níveis</div></div>
              <div><div className="font-bold text-lg">⭐</div><div>Estrelas</div></div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (showDifficultySelector && gameStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full p-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-2">{currentPuzzle.title}</h2>
            <p className="text-gray-600">Escolha a dificuldade:</p>
          </div>
          <div className="space-y-3">
            {Object.entries(DIFFICULTY_CONFIG).map(([key, config]) => (
              <Button
                key={key}
                onClick={() => startGameWithDifficulty(key as DifficultyLevel)}
                className={`w-full h-20 text-lg ${config.color} hover:opacity-90`}
              >
                <div className="flex items-center justify-between w-full px-4">
                  <span className="text-3xl">{config.icon}</span>
                  <div className="text-left flex-1 ml-4">
                    <div className="font-bold">{config.name}</div>
                    <div className="text-sm opacity-90">{config.gridSize}x{config.gridSize} peças</div>
                  </div>
                  <div className="flex gap-1">
                    {[...Array(config.stars)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-white" />
                    ))}
                  </div>
                </div>
              </Button>
            ))}
          </div>
          <Button onClick={() => { setGameStarted(false); setShowDifficultySelector(false); }} variant="outline" className="w-full mt-4">
            Voltar ao Menu
          </Button>
        </Card>
      </div>
    );
  }

  if (showParentDashboard) {
    const stats = getStats();
    return (
      <div className="min-h-screen p-6 bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Acompanhamento - {progress.playerName}</h1>
            <Button onClick={() => setShowParentDashboard(false)} variant="outline">
              <Home className="mr-2 h-4 w-4" />Voltar
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="p-4 text-center">
              <Clock className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <div className="text-2xl font-bold">{Math.floor(stats.totalTime / 60)}min</div>
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
              <div className="text-sm text-gray-600">Estrelas</div>
            </Card>
            <Card className="p-4 text-center">
              <Trophy className="h-8 w-8 mx-auto mb-2 text-purple-500" />
              <div className="text-2xl font-bold">{stats.certificates.length}</div>
              <div className="text-sm text-gray-600">Certificados</div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!gameStarted) {
    return (
      <div className="min-h-screen p-4 sm:p-6 bg-gradient-to-br from-background via-card to-secondary/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary mb-2">Olá, {progress.playerName}!</h1>
            <div className="flex flex-wrap justify-center gap-3 mb-4">
              <div className="bg-yellow-100 px-4 py-2 rounded-full">
                <span className="text-yellow-800 font-bold flex items-center gap-1">
                  <Star className="h-4 w-4" />{progress.totalStars} estrelas
                </span>
              </div>
              <div className="bg-blue-100 px-4 py-2 rounded-full">
                <span className="text-blue-800 font-bold">{progress.puzzlesCompleted.length}/10 completos</span>
              </div>
            </div>
            <Button onClick={() => setShowParentDashboard(true)} variant="outline" size="sm">
              Ver Relatório Completo
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {puzzleImages.map((puzzle, index) => {
              const puzzleProgress = getPuzzleProgress(`puzzle-${index}`);
              const isUnlocked = isPuzzleUnlocked(index);
              return (
                <Card 
                  key={puzzle.id} 
                  className={`relative overflow-hidden transition-all duration-300 ${
                    isUnlocked ? 'hover:scale-105 cursor-pointer hover:shadow-xl' : 'opacity-60'
                  } ${puzzleProgress?.completed ? 'ring-2 ring-green-500' : ''}`}
                >
                  <div onClick={() => {
                    if (isUnlocked) {
                      setCurrentPuzzleIndex(index);
                      setGameStarted(true);
                      setShowDifficultySelector(true);
                    } else {
                      toast.error('Complete a história anterior primeiro!');
                    }
                  }} className="p-4">
                    <div className="relative">
                      <img src={puzzle.image} alt={puzzle.title} className={`w-full h-32 object-cover rounded-xl mb-3 ${!isUnlocked ? 'filter grayscale blur-sm' : ''}`} />
                      {puzzleProgress?.completed && (
                        <div className="absolute top-2 right-2 bg-white/90 rounded-full px-2 py-1">
                          <div className="flex gap-0.5">
                            {[...Array(3)].map((_, i) => (
                              <Star key={i} className={`h-4 w-4 ${i < puzzleProgress.stars ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
                            ))}
                          </div>
                        </div>
                      )}
                      {!isUnlocked && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Lock className="h-12 w-12 text-white drop-shadow-lg" />
                        </div>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-primary mb-1">{puzzle.title}</h3>
                    <p className="text-sm text-muted-foreground">{puzzle.description}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 bg-gradient-to-br from-background via-card to-secondary/20">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-primary mb-2">{currentPuzzle.title}</h1>
          <div className="flex justify-center gap-3 text-xs sm:text-sm flex-wrap">
            <div className={`flex items-center gap-1 px-2 py-1 rounded ${DIFFICULTY_CONFIG[difficulty].color} text-white font-bold`}>
              <Zap className="h-3 w-3" /><span>{DIFFICULTY_CONFIG[difficulty].name}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" /><span className="font-mono">{formatTime(elapsedTime)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Target className="h-3 w-3" /><span>{moves} movimentos</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Card className="p-2 mx-auto max-w-fit">
            <h2 className="text-sm font-semibold text-center mb-2 text-primary">Monte aqui!</h2>
            <div className="bg-yellow-50 p-2 rounded-lg">
              <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}>
                {Array.from({ length: gridSize }, (_, row) =>
                  Array.from({ length: gridSize }, (_, col) => (
                    <div key={`${row}-${col}`}>{renderSlot(row, col)}</div>
                  ))
                )}
              </div>
            </div>
          </Card>

          <Card className="p-2 mx-auto max-w-fit">
            <h3 className="text-xs font-semibold text-center mb-2 text-primary">
              Peças disponíveis ({pieces.filter(p => !p.isPlaced).length})
            </h3>
            <div className="bg-gray-50 rounded-lg p-2">
              <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}>
                {pieces.filter(p => !p.isPlaced).map(piece => (
                  <div key={piece.id}>{renderPiece(piece)}</div>
                ))}
                {[...Array(Math.max(0, (gridSize * gridSize) - pieces.filter(p => !p.isPlaced).length))].map((_, i) => (
                  <div key={`empty-${i}`} className="border-2 border-dashed border-gray-200 rounded-lg" style={{ width: pieceSize, height: pieceSize }} />
                ))}
              </div>
            </div>
          </Card>
        </div>

        <div className="text-center mt-4 space-y-3">
          <div className="flex justify-center gap-2">
            <Button onClick={() => { setGameStarted(false); setShowDifficultySelector(false); }} variant="outline" size="sm">
              <Home className="mr-1 h-4 w-4" />Menu
            </Button>
            <Button onClick={() => setShowDifficultySelector(true)} variant="outline" size="sm">
              <RotateCcw className="mr-1 h-4 w-4" />Reiniciar
            </Button>
          </div>
          {isComplete && (
            <div className="mt-3 p-3 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 text-white animate-pulse">
              <p className="text-lg font-bold">Parabéns! Puzzle Completo!</p>
            </div>
          )}
        </div>

        <Dialog open={showCongratulations} onOpenChange={setShowCongratulations}>
          <DialogContent className="max-w-[90vw] sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-center">Parabéns, {progress.playerName}!</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-center text-sm">Você completou {currentPuzzle.title} no nível {DIFFICULTY_CONFIG[difficulty].name}!</p>
              <div className="flex justify-center gap-1">
                {[...Array(3)].map((_, i) => (
                  <Star key={i} className={`h-8 w-8 ${i < earnedStars ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
                ))}
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs italic text-center">"{currentPuzzle.verse}"</p>
                <p className="text-xs text-center mt-1 text-gray-500">- {currentPuzzle.reference}</p>
              </div>
            </div>
            <div className="grid gap-2 pt-3">
              {currentPuzzleIndex < puzzleImages.length - 1 && (
                <Button onClick={() => {
                  setCurrentPuzzleIndex(prev => prev + 1);
                  setShowCongratulations(false);
                  setShowDifficultySelector(true);
                }} className="w-full bg-green-500 hover:bg-green-600">
                  Próxima História <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => { setShowCongratulations(false); setShowDifficultySelector(true); }} variant="outline" size="sm">
                  <RotateCcw className="mr-1 h-3 w-3" />Repetir
                </Button>
                <Button onClick={() => { setShowCongratulations(false); setGameStarted(false); }} variant="outline" size="sm">
                  <Home className="mr-1 h-3 w-3" />Menu
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default PuzzleGame;
