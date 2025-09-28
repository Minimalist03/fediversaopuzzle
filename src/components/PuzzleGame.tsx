import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { puzzleImages, PuzzleImageData } from "@/data/puzzleImages";
import { useGameProgress } from "@/hooks/useGameProgress";
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
  const [earnedStars, setEarnedStars] = useState(0);
  const [showWelcome, setShowWelcome] = useState(!progress.playerName);
  const [showParentDashboard, setShowParentDashboard] = useState(false);
  const [mobileView, setMobileView] = useState<'board' | 'pieces'>('board');
  
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
  const height = window.innerHeight;
  
  // Calcula baseado na menor dimensão disponível
  const availableSize = Math.min(width - 40, height - 300);
  const optimalSize = Math.floor(availableSize / 3.2);
  
  // Tamanhos maiores e mais confortáveis
  if (width <= 375) return Math.min(95, optimalSize);
  if (width <= 414) return Math.min(105, optimalSize);
  if (width <= 480) return Math.min(115, optimalSize);
  if (width < 768) return Math.min(120, optimalSize);
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
    
    // Criar 9 peças (3x3)
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
    console.log('Total de peças criadas:', shuffledPieces.length); // Debug
    
    setPieces(shuffledPieces);
    setIsComplete(false);
    setGameStarted(true);
    setStartTime(Date.now());
    setElapsedTime(0);
    setMoves(0);
    // Removido toast daqui
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
        
        setTimeout(() => {
          setShowCongratulations(true);
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
      // Removido toast - apenas retorna
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

    // Apenas toca o som, sem toast
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
    initializePuzzle();
  };

  const goToNextPuzzle = () => {
    if (currentPuzzleIndex < puzzleImages.length - 1) {
      setCurrentPuzzleIndex(prev => prev + 1);
      setShowCongratulations(false);
      setShowNextPuzzleDialog(false);
      initializePuzzle();
    } else {
      setShowNextPuzzleDialog(true);
    }
  };

  const goToPuzzleSelection = () => {
    setGameStarted(false);
    setShowCongratulations(false);
    setShowNextPuzzleDialog(false);
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

  // Tela de Boas-Vindas SIMPLIFICADA
  if (showWelcome) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100 
                      flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6">
          <div className="text-center mb-6">
            <div className="text-6xl mb-3 animate-bounce">🧩</div>
            <h1 className="text-2xl font-bold text-gray-800">
              Quebra-Cabeças Bíblicos
            </h1>
          </div>

          <Input
            type="text"
            placeholder="Seu nome..."
            className="text-xl p-4 text-center font-bold mb-4"
            maxLength={20}
            autoFocus
            id="nameInput"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                setPlayerName(e.currentTarget.value.trim());
                setShowWelcome(false);
              }
            }}
          />
          
          <Button
            onClick={() => {
              const input = document.getElementById('nameInput') as HTMLInputElement;
              if (input?.value.trim()) {
                setPlayerName(input.value.trim());
                setShowWelcome(false);
              } else {
                toast.error('Digite seu nome primeiro! ☝️');
              }
            }}
            className="w-full text-lg py-6 bg-green-500 hover:bg-green-600"
          >
            COMEÇAR! 🎮
          </Button>

          <p className="text-xs text-center text-gray-500 mt-4">
            10 histórias • Ganhe estrelas • Certificados
          </p>
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
        <div className="text-center mb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-primary mb-2">
            {currentPuzzle.title}
          </h1>
          <div className="flex justify-center gap-3 text-xs sm:text-sm">
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

   {/* Área do jogo - LAYOUT MOBILE OTIMIZADO */}
{isMobile ? (
  <>
    {/* Botões de alternância MOBILE */}
    <div className="flex gap-2 mb-3 sticky top-0 bg-white/90 backdrop-blur z-40 p-2 rounded-lg">
      <Button
        onClick={() => setMobileView('board')}
        variant={mobileView === 'board' ? 'default' : 'outline'}
        size="sm"
        className="flex-1"
      >
        🧩 Tabuleiro
        {pieces.filter(p => p.isPlaced).length > 0 && 
          ` (${pieces.filter(p => p.isPlaced).length}/9)`}
      </Button>
      <Button
        onClick={() => setMobileView('pieces')}
        variant={mobileView === 'pieces' ? 'default' : 'outline'}
        size="sm"
        className="flex-1"
      >
        🎯 Peças
        {pieces.filter(p => !p.isPlaced).length > 0 && 
          ` (${pieces.filter(p => !p.isPlaced).length})`}
      </Button>
    </div>

    {/* Conteúdo alternado MOBILE */}
    <div className="relative" style={{ minHeight: `${pieceSize * 3 + 100}px` }}>
      {/* Tabuleiro */}
      <div className={`${mobileView !== 'board' ? 'hidden' : ''}`}>
        <Card className="p-3 mx-auto max-w-fit">
          <div className="bg-yellow-50 p-3 rounded-xl">
            <div className="grid grid-cols-3 gap-1">
              {Array.from({ length: GRID_SIZE }, (_, row) =>
                Array.from({ length: GRID_SIZE }, (_, col) =>
                  renderPuzzleSlot(row, col)
                )
              )}
            </div>
          </div>
          <p className="text-center text-xs text-gray-500 mt-2">
            Arraste as peças para cá
          </p>
        </Card>
      </div>

      {/* Peças disponíveis */}
      <div className={`${mobileView !== 'pieces' ? 'hidden' : ''}`}>
        <Card className="p-3">
          <div className="grid grid-cols-3 gap-2 max-h-[60vh] overflow-y-auto">
            {pieces.filter(p => !p.isPlaced).map(piece => (
              <div key={piece.id} className="flex justify-center">
                {renderPuzzlePiece(piece)}
              </div>
            ))}
            
            {pieces.filter(p => !p.isPlaced).length === 0 && (
              <div className="col-span-3 text-center py-8">
                <p className="text-2xl mb-2">🎯</p>
                <p className="text-sm">Todas as peças foram colocadas!</p>
                <Button 
                  onClick={() => setMobileView('board')}
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  Ver Tabuleiro
                </Button>
              </div>
            )}
          </div>
          <p className="text-center text-xs text-gray-500 mt-2">
            Segure e arraste para o tabuleiro
          </p>
        </Card>
      </div>
    </div>
  </>
) : (
  /* DESKTOP/TABLET: Layout lado a lado (mantém o original) */
  <div className="flex flex-col lg:flex-row gap-6 items-center justify-center">
    {/* Tabuleiro */}
    <Card className="p-2 sm:p-4 mx-auto">
      <h2 className="text-sm sm:text-lg font-semibold text-center mb-2 sm:mb-4 text-primary">
        Monte aqui! 🧩
      </h2>
      <div className="bg-yellow-50 p-2 sm:p-4 rounded-xl inline-block mx-auto">
        <div className="grid grid-cols-3 gap-1">
          {Array.from({ length: GRID_SIZE }, (_, row) =>
            Array.from({ length: GRID_SIZE }, (_, col) =>
              renderPuzzleSlot(row, col)
            )
          )}
        </div>
      </div>
    </Card>
    
    {/* Paleta de peças */}
    <Card className="p-2 w-full">
      <h2 className="text-sm font-semibold text-center mb-2 text-primary">
        Peças disponíveis ({pieces.filter(p => !p.isPlaced).length} de 9)
      </h2>
      
      <div className="bg-gray-50 rounded-lg p-2 max-h-[400px] overflow-y-auto">
        <div className="grid grid-cols-3 gap-2">
          {pieces
            .filter(piece => !piece.isPlaced)
            .map(piece => (
              <div key={piece.id} className="flex justify-center">
                {renderPuzzlePiece(piece)}
              </div>
            ))}
          
          {pieces.filter(p => !p.isPlaced).length === 0 && (
            <div className="col-span-3 text-center py-4">
              <p className="text-lg">✅</p>
              <p className="text-xs">Organize as peças no lugar correto!</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  </div>
)}

          {/* Paleta de peças */}
          <Card className="p-2 w-full">
            <h2 className="text-sm font-semibold text-center mb-2 text-primary">
              Peças disponíveis ({pieces.filter(p => !p.isPlaced).length} de 9)
            </h2>
            
            {/* Container com scroll se necessário */}
            <div className="bg-gray-50 rounded-lg p-2 max-h-[400px] overflow-y-auto">
              <div className="grid grid-cols-3 gap-2">
                {pieces
                  .filter(piece => !piece.isPlaced)
                  .map(piece => (
                    <div key={piece.id} className="flex justify-center">
                      {renderPuzzlePiece(piece)}
                    </div>
                  ))}
                
                {/* Mensagem quando todas colocadas */}
                {pieces.filter(p => !p.isPlaced).length === 0 && (
                  <div className="col-span-3 text-center py-4">
                    <p className="text-lg">✅</p>
                    <p className="text-xs">Organize as peças no lugar correto!</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Controles - MELHORADOS */}
        <div className="text-center mt-4 space-y-3">
          <div className="flex flex-wrap justify-center gap-2">
            <Button 
              onClick={goToPuzzleSelection} 
              variant="outline"
              size={isMobile ? "sm" : "default"}
            >
              <Home className="mr-1 h-4 w-4" />
              Menu
            </Button>
            <Button 
              onClick={resetGame} 
              variant="outline"
              size={isMobile ? "sm" : "default"}
            >
              <RotateCcw className="mr-1 h-4 w-4" />
              Reiniciar
            </Button>
          </div>
          
          {isComplete && (
            <div className="mt-3 p-3 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 text-white">
              <p className="text-lg sm:text-2xl font-bold">
                🎉 Parabéns! Puzzle Completo! 🎉
              </p>
            </div>
          )}
        </div>

        {/* Dialog de Parabéns */}
        <Dialog open={showCongratulations} onOpenChange={setShowCongratulations}>
          <DialogContent className="max-w-[90vw] sm:max-w-lg mx-auto my-4">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-lg sm:text-2xl text-center">
                🎉 Parabéns, {progress.playerName}!
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-3 max-h-[65vh] overflow-y-auto px-1">
              <p className="text-center text-sm text-gray-600">
                Você completou {currentPuzzle.title}!
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
                  ✨ Versículo para Meditar:
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
)}
  );
};

export default PuzzleGame;
