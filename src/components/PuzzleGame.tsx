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

// ==================== INTERFACES ====================
interface PuzzlePiece {
  id: number;
  row: number;
  col: number;
  correctPosition: { row: number; col: number };
  isPlaced: boolean;
}

type DifficultyLevel = 'easy' | 'medium' | 'hard';

const DIFFICULTY_CONFIG = {
  easy: { gridSize: 2, name: 'Fácil', icon: '😊', color: 'bg-green-500', stars: 1 },
  medium: { gridSize: 3, name: 'Médio', icon: '🤔', color: 'bg-yellow-500', stars: 2 },
  hard: { gridSize: 4, name: 'Difícil', icon: '😤', color: 'bg-red-500', stars: 3 }
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
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('medium');
  const [showDifficultySelector, setShowDifficultySelector] = useState(false);
  const [currentGridSize, setCurrentGridSize] = useState(3);
  
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
  const [earnedStars, setEarnedStars] = useState(0);
  const [showWelcome, setShowWelcome] = useState(!progress.playerName);
  const [showParentDashboard, setShowParentDashboard] = useState(false);
  
  // Sons
  const { playSuccessSound, playPieceDropSound, playCompletionSound } = useSoundEffects();

  const currentPuzzle: PuzzleImageData = puzzleImages[currentPuzzleIndex];

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
    if (gameStarted && !isComplete && !showDifficultySelector) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameStarted, isComplete, startTime, showDifficultySelector]);

  // Tamanhos otimizados por dispositivo e dificuldade
  const getPieceSize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    if (width <= 480) {
      const padding = 48;
      const gaps = 16;
      const extraSpace = 250;
      
      const maxWidth = Math.floor((width - padding - gaps) / (currentGridSize + 0.2));
      const maxHeight = Math.floor((height - extraSpace) / (currentGridSize * 2 + 0.5));
      const optimalSize = Math.min(maxWidth, maxHeight);
      
      if (currentGridSize === 2) return Math.max(80, Math.min(100, optimalSize));
      if (currentGridSize === 3) return Math.max(65, Math.min(80, optimalSize));
      return Math.max(50, Math.min(65, optimalSize));
    }
    
    if (width < 768) {
      if (currentGridSize === 2) return 110;
      if (currentGridSize === 3) return 90;
      return 70;
    }
    
    if (currentGridSize === 2) return 130;
    if (currentGridSize === 3) return 100;
    return 80;
  };

  const pieceSize = getPieceSize();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Inicializa as peças - CORRIGIDO
  const initializePuzzle = useCallback((selectedDifficulty: DifficultyLevel) => {
    const gridSize = DIFFICULTY_CONFIG[selectedDifficulty].gridSize;
    setCurrentGridSize(gridSize);
    
    const newPieces: PuzzlePiece[] = [];
    
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        newPieces.push({
          id: row * gridSize + col,
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
    setShowDifficultySelector(false);
    setStartTime(Date.now());
    setElapsedTime(0);
    setMoves(0);
  }, []);

  // Verifica se o quebra-cabeça está completo
  const checkCompletion = useCallback(() => {
    if (pieces.length === 0) return;
    
    const placedPieces = pieces.filter(piece => piece.isPlaced);
    if (placedPieces.length === currentGridSize * currentGridSize) {
      const allCorrect = placedPieces.every(piece => 
        piece.row === piece.correctPosition.row && 
        piece.col === piece.correctPosition.col
      );
      
      if (allCorrect && !isComplete) {
        setIsComplete(true);
        const timeSpent = Math.floor((Date.now() - startTime) / 1000);
        
        const baseStars = savePuzzleCompletion(
          `puzzle-${currentPuzzleIndex}`, 
          timeSpent, 
          moves
        );
        
        const difficultyBonus = DIFFICULTY_CONFIG[difficulty].stars;
        const totalStars = Math.min(baseStars + difficultyBonus, 3);
        
        setEarnedStars(totalStars);
        playCompletionSound();
        
        setTimeout(() => {
          setShowCongratulations(true);
        }, 500);
      }
    }
  }, [pieces, isComplete, startTime, moves, currentPuzzleIndex, savePuzzleCompletion, playCompletionSound, currentGridSize, difficulty]);

  useEffect(() => {
    checkCompletion();
  }, [pieces, checkCompletion]);

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

    if (existingPiece) return;

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
    } else {
      playPieceDropSound();
    }
  };

  const resetGame = () => {
    setShowCongratulations(false);
    setShowNextPuzzleDialog(false);
    setShowDifficultySelector(true);
  };

  const goToNextPuzzle = () => {
    if (currentPuzzleIndex < puzzleImages.length - 1) {
      setCurrentPuzzleIndex(prev => prev + 1);
      setShowCongratulations(false);
      setShowNextPuzzleDialog(false);
      setShowDifficultySelector(true);
    } else {
      setShowNextPuzzleDialog(true);
    }
  };

  const goToPuzzleSelection = () => {
    setGameStarted(false);
    setShowCongratulations(false);
    setShowNextPuzzleDialog(false);
    setShowDifficultySelector(false);
  };

  const shareProgress = () => {
    const stats = getStats();
    const text = `🎉 ${progress.playerName} já completou ${stats.puzzlesCompleted} quebra-cabeças bíblicos e ganhou ${stats.totalStars} estrelas!`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Quebra-Cabeças Bíblicos',
        text: text,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(text);
      toast.success('Texto copiado! Cole no WhatsApp');
    }
  };

  const renderPuzzlePiece = (piece: PuzzlePiece) => {
    // Calcula o tamanho total da imagem de fundo (grid completo)
    const totalSize = pieceSize * currentGridSize;
    
    // Calcula a posição de corte baseada na posição correta da peça
    const bgPosX = -(piece.correctPosition.col * pieceSize);
    const bgPosY = -(piece.correctPosition.row * pieceSize);
    
    const style = {
      backgroundImage: `url(${currentPuzzle.image})`,
      backgroundSize: `${totalSize}px ${totalSize}px`,
      backgroundPosition: `${bgPosX}px ${bgPosY}px`,
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

  // Seletor de Dificuldade
  if (showDifficultySelector && gameStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100 
                      flex items-center justify-center p-4">
        <Card className="max-w-lg w-full p-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-2">{currentPuzzle.title}</h2>
            <p className="text-gray-600">Escolha a dificuldade:</p>
          </div>

          <div className="space-y-3">
            {Object.entries(DIFFICULTY_CONFIG).map(([key, config]) => (
              <Button
                key={key}
                onClick={() => {
                  const selectedDiff = key as DifficultyLevel;
                  setDifficulty(selectedDiff);
                  initializePuzzle(selectedDiff);
                }}
                className={`w-full h-20 text-lg ${config.color} hover:opacity-90`}
                variant="default"
              >
                <div className="flex items-center justify-between w-full px-4">
                  <span className="text-3xl">{config.icon}</span>
                  <div className="text-left flex-1 ml-4">
                    <div className="font-bold">{config.name}</div>
                    <div className="text-sm opacity-90">
                      {config.gridSize}x{config.gridSize} peças
                    </div>
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

          <Button
            onClick={goToPuzzleSelection}
            variant="outline"
            className="w-full mt-4"
          >
            Voltar ao Menu
          </Button>
        </Card>
      </div>
    );
  }

  // Tela de Boas-Vindas
  if (showWelcome) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100 
                      flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8">
          <div className="text-center mb-8">
            <div className="text-7xl mb-4 animate-bounce">🧩</div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Quebra-Cabeças Bíblicos
            </h1>
            <p className="text-gray-600">
              10 histórias para aprender e se divertir
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
                Qual é o seu nome?
              </label>
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
            </div>
            
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
              <div>
                <div className="font-bold text-lg">10</div>
                <div>Histórias</div>
              </div>
              <div>
                <div className="font-bold text-lg">3</div>
                <div>Níveis</div>
              </div>
              <div>
                <div className="font-bold text-lg">⭐</div>
                <div>Estrelas</div>
              </div>
            </div>
          </div>
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
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary mb-2">
              Olá, {progress.playerName}!
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
                  {progress.puzzlesCompleted.length}/10 completos
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
                  className={`relative overflow-hidden transition-all duration-300 
                    ${isUnlocked ? 'hover:scale-105 cursor-pointer hover:shadow-xl' : 'opacity-60'}
                    ${puzzleProgress?.completed ? 'ring-2 ring-green-500' : ''}`}
                >
                  <div 
                    onClick={() => {
                      if (isUnlocked) {
                        setCurrentPuzzleIndex(index);
                        setGameStarted(true);
                        setShowDifficultySelector(true);
                      } else {
                        toast.error('Complete a história anterior primeiro!');
                      }
                    }}
                    className="p-4"
                  >
                    <div className="relative">
                      <img 
                        src={puzzle.image} 
                        alt={puzzle.title}
                        className={`w-full h-32 object-cover rounded-xl mb-3 
                          ${!isUnlocked ? 'filter grayscale blur-sm' : ''}`}
                      />
                      
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
                    
                    <div className="mt-2">
                      {puzzleProgress?.completed ? (
                        <span className="text-xs text-green-600 font-medium">
                          Completo em {Math.floor(puzzleProgress.timeSpent / 60)}min
                        </span>
                      ) : isUnlocked ? (
                        <span className="text-xs text-blue-600 font-medium">
                          Disponível para jogar
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500 font-medium">
                          Complete a anterior
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
        <div className="text-center mb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-primary mb-2">
            {currentPuzzle.title}
          </h1>
          <div className="flex justify-center gap-3 text-xs sm:text-sm flex-wrap">
            <div className={`flex items-center gap-1 px-2 py-1 rounded ${DIFFICULTY_CONFIG[difficulty].color} text-white font-bold`}>
              <Zap className="h-3 w-3" />
              <span>{DIFFICULTY_CONFIG[difficulty].name}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span className="font-mono">{formatTime(elapsedTime)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Target className="h-3 w-3" />
              <span>{moves} movimentos</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3" />
              <span>Puzzle {currentPuzzleIndex + 1}/{puzzleImages.length}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Card className="p-2 mx-auto max-w-fit">
            <h2 className="text-sm font-semibold text-center mb-2 text-primary">
              Monte aqui!
            </h2>
            <div className="bg-yellow-50 p-2 rounded-lg">
              <div className={`grid gap-1`} style={{ 
                gridTemplateColumns: `repeat(${currentGridSize}, 1fr)` 
              }}>
                {Array.from({ length: currentGridSize }, (_, row) =>
                  Array.from({ length: currentGridSize }, (_, col) =>
                    renderPuzzleSlot(row, col)
                  )
                )}
              </div>
            </div>
          </Card>

          <Card className="p-2 mx-auto max-w-fit">
            <h3 className="text-xs font-semibold text-center mb-2 text-primary">
              Peças disponíveis ({pieces.filter(p => !p.isPlaced).length})
            </h3>
            <div className="bg-gray-50 rounded-lg p-2">
              <div className={`grid gap-1`} style={{ 
                gridTemplateColumns: `repeat(${currentGridSize}, 1fr)` 
              }}>
                {pieces.filter(p => !p.isPlaced).map(piece => (
                  <div key={piece.id} className="flex justify-center items-center">
                    {renderPuzzlePiece(piece)}
                  </div>
                ))}
                
                {[...Array((currentGridSize * currentGridSize) - pieces.filter(p => !p.isPlaced).length)].map((_, i) => (
                  <div 
                    key={`empty-${i}`} 
                    className="border-2 border-dashed border-gray-200 rounded-lg"
                    style={{ width: `${pieceSize}px`, height: `${pieceSize}px` }}
                  />
                ))}
              </div>
              
              {pieces.filter(p => !p.isPlaced).length === 0 && (
                <div className="text-center py-2 text-gray-500">
                  <p className="text-xs">Todas as peças foram colocadas!</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="text-center mt-4 space-y-3">
          <div className="flex justify-center gap-2">
            <Button 
              onClick={goToPuzzleSelection} 
              variant="outline"
              size="sm"
            >
              <Home className="mr-1 h-4 w-4" />
              Menu
            </Button>
            <Button 
              onClick={resetGame} 
              variant="outline"
              size="sm"
            >
              <RotateCcw className="mr-1 h-4 w-4" />
              Reiniciar
            </Button>
          </div>
          
          {isComplete && (
            <div className="mt-3 p-3 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 text-white animate-pulse">
              <p className="text-lg font-bold">
                Parabéns! Puzzle Completo!
              </p>
            </div>
          )}
        </div>

        <Dialog open={showCongratulations} onOpenChange={setShowCongratulations}>
          <DialogContent className="max-w-[90vw] sm:max-w-lg mx-auto my-4">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-lg sm:text-2xl text-center">
                Parabéns, {progress.playerName}!
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-3 max-h-[65vh] overflow-y-auto px-1">
              <p className="text-center text-sm text-gray-600">
                Você completou {currentPuzzle.title} no nível {DIFFICULTY_CONFIG[difficulty].name}!
              </p>

              <div className="flex justify-center gap-1">
                {[...Array(3)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`h-8 w-8 ${
                      i < earnedStars 
                        ? 'text-yellow-500 fill-yellow-500' 
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>

              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs font-medium text-blue-600 mb-1">
                  Versículo para Meditar:
                </p>
                <p className="text-xs italic text-center">
                  "{currentPuzzle.verse}"
                </p>
                <p className="text-xs text-center mt-1 text-gray-500">
                  - {currentPuzzle.reference}
                </p>
              </div>
            </div>

            <div className="grid gap-2 pt-3 border-t">
              {currentPuzzleIndex < puzzleImages.length - 1 && (
                <Button 
                  onClick={goToNextPuzzle}
                  className="w-full bg-green-500 hover:bg-green-600"
                >
                  Próxima História <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              )}
              
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={resetGame}
                  variant="outline"
                  size="sm"
                >
                  <RotateCcw className="mr-1 h-3 w-3" />
                  Repetir
                </Button>
                
                <Button 
                  onClick={() => {
                    setShowCongratulations(false);
                    goToPuzzleSelection();
                  }}
                  variant="outline"
                  size="sm"
                >
                  <Home className="mr-1 h-3 w-3" />
                  Menu
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {dragPreview && isMobile && (
          <div
            className="fixed pointer-events-none z-50 opacity-80 rounded-lg"
            style={{
              left: dragPreview.x - pieceSize / 2,
              top: dragPreview.y - pieceSize / 2,
              width: pieceSize,
              height: pieceSize,
              backgroundImage: `url(${currentPuzzle.image})`,
              backgroundSize: `${pieceSize * currentGridSize}px ${pieceSize * currentGridSize}px`,
              backgroundPosition: `${-(dragPreview.piece.correctPosition.col * pieceSize)}px ${-(dragPreview.piece.correctPosition.row * pieceSize)}px`,
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
