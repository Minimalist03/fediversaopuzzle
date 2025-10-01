import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { puzzleImages, PuzzleImageData } from "@/data/puzzleImages";
import { useGameProgress } from "@/hooks/useGameProgress";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { Trophy, Clock, Target, Star, Lock, Home, RotateCcw, ChevronRight, Share2, Sparkles } from "lucide-react";
import Confetti from "react-confetti";

interface PuzzlePiece {
  id: number;
  row: number;
  col: number;
  correctPosition: { row: number; col: number };
  isPlaced: boolean;
}

const PuzzleGame = () => {
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
  const [isMobile, setIsMobile] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [moves, setMoves] = useState(0);
  const [earnedStars, setEarnedStars] = useState(0);
  const [showWelcome, setShowWelcome] = useState(!progress.playerName);
  const [showParentDashboard, setShowParentDashboard] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  
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
  const GRID_SIZE = 3;

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameStarted && !isComplete) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameStarted, isComplete, startTime]);

  const getPieceSize = () => {
    const width = window.innerWidth;
    if (width <= 480) {
      const padding = 48;
      const gaps = 16;
      const extraSpace = 250;
      const maxWidth = Math.floor((width - padding - gaps) / 3.2);
      const maxHeight = Math.floor((window.innerHeight - extraSpace) / 6.5);
      const optimalSize = Math.min(maxWidth, maxHeight);
      if (width <= 360) return Math.max(65, Math.min(70, optimalSize));
      if (width <= 375) return Math.max(68, Math.min(73, optimalSize));
      if (width <= 414) return Math.max(72, Math.min(78, optimalSize));
      return Math.max(75, Math.min(82, optimalSize));
    }
    if (width < 768) return 90;
    return 100;
  };

  const pieceSize = getPieceSize();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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
    setShowConfetti(false);
  }, [currentPuzzle]);

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
        const stars = savePuzzleCompletion(`puzzle-${currentPuzzleIndex}`, timeSpent, moves);
        setEarnedStars(stars);
        playCompletionSound();
        setShowConfetti(true);
        setTimeout(() => {
          setShowCongratulations(true);
          setShowConfetti(false);
        }, 3000);
      }
    }
  }, [pieces, isComplete, startTime, moves, currentPuzzleIndex, savePuzzleCompletion, playCompletionSound]);

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
    setTouchStartPos({ x: touch.clientX - rect.left, y: touch.clientY - rect.top });
    setDraggedPiece(piece);
    setIsDragging(true);
    setDragPreview({ x: touch.clientX, y: touch.clientY, piece });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!draggedPiece || !isDragging) return;
    const touch = e.touches[0];
    setDragPreview(prev => prev ? { ...prev, x: touch.clientX, y: touch.clientY } : null);
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    document.querySelectorAll('.puzzle-slot').forEach(slot => slot.classList.remove('drag-over'));
    if (element && element.classList.contains('puzzle-slot')) {
      element.classList.add('drag-over');
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!draggedPiece || !isDragging) return;
    const touch = e.changedTouches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    document.querySelectorAll('.puzzle-slot').forEach(slot => slot.classList.remove('drag-over'));
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
    const existingPiece = pieces.find(p => p.isPlaced && p.row === targetRow && p.col === targetCol);
    if (existingPiece) return;

    setMoves(prev => prev + 1);
    setPieces(prevPieces => 
      prevPieces.map(piece => 
        piece.id === draggedPiece.id
          ? { ...piece, row: targetRow, col: targetCol, isPlaced: true }
          : piece
      )
    );

    if (draggedPiece.correctPosition.row === targetRow && draggedPiece.correctPosition.col === targetCol) {
      playSuccessSound();
    } else {
      playPieceDropSound();
    }
  };

  const renderPuzzlePiece = (piece: PuzzlePiece) => {
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
            piece.col === piece.correctPosition.col ? 'ring-4 ring-yellow-400 animate-pulse' : ''}
          rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-200`}
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
    const placedPiece = pieces.find(p => p.isPlaced && p.row === row && p.col === col);

    return (
      <div
        key={`slot-${row}-${col}`}
        data-slot={`${row}-${col}`}
        className={`puzzle-slot flex items-center justify-center border-4 border-dashed 
          ${placedPiece ? 'border-transparent' : 'border-purple-300 hover:border-purple-500 hover:bg-purple-50'} 
          rounded-xl transition-all duration-200`}
        style={{ width: `${pieceSize}px`, height: `${pieceSize}px` }}
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.classList.add('bg-green-100', 'border-green-400', 'scale-105');
        }}
        onDragLeave={(e) => {
          e.currentTarget.classList.remove('bg-green-100', 'border-green-400', 'scale-105');
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.classList.remove('bg-green-100', 'border-green-400', 'scale-105');
          handleDrop(row, col);
        }}
      >
        {placedPiece && renderPuzzlePiece(placedPiece)}
      </div>
    );
  };

  if (showWelcome) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-300 to-yellow-300 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 bg-white shadow-2xl border-4 border-purple-400 rounded-3xl">
          <div className="text-center mb-8">
            <div className="text-8xl mb-4 animate-bounce">🧩</div>
            <h1 className="text-4xl font-black text-purple-600 mb-3 drop-shadow-lg">
              Quebra-Cabeças Bíblicos
            </h1>
            <p className="text-xl text-pink-600 font-bold">
              Diversão e aprendizado garantidos!
            </p>
          </div>

          <div className="space-y-4">
            <Input
              type="text"
              placeholder="Como você se chama?"
              className="text-2xl p-6 text-center font-bold border-4 border-purple-300 rounded-2xl focus:border-pink-400 focus:ring-4 focus:ring-pink-200"
              maxLength={20}
              autoFocus
              id="nameInput"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  setPlayerName(e.currentTarget.value.trim());
                  setShowWelcome(false);
                  toast.success('Vamos brincar!', { duration: 2000 });
                }
              }}
            />
            
            <Button
              onClick={() => {
                const input = document.getElementById('nameInput') as HTMLInputElement;
                if (input?.value.trim()) {
                  setPlayerName(input.value.trim());
                  setShowWelcome(false);
                  toast.success('Vamos brincar!', { duration: 2000 });
                } else {
                  toast.error('Psiu! Qual é seu nome?', { duration: 2000 });
                }
              }}
              className="w-full text-2xl py-8 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 font-black rounded-2xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-200"
            >
              VAMOS LÁ!
            </Button>
          </div>

          <div className="mt-8 pt-6 border-t-4 border-purple-200">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-yellow-100 rounded-2xl p-3 border-2 border-yellow-300">
                <div className="font-black text-3xl text-yellow-600">10</div>
                <div className="text-sm font-bold text-yellow-700">Aventuras</div>
              </div>
              <div className="bg-pink-100 rounded-2xl p-3 border-2 border-pink-300">
                <div className="font-black text-3xl text-pink-600">⭐</div>
                <div className="text-sm font-bold text-pink-700">Estrelinhas</div>
              </div>
              <div className="bg-purple-100 rounded-2xl p-3 border-2 border-purple-300">
                <div className="font-black text-3xl text-purple-600">🏆</div>
                <div className="text-sm font-bold text-purple-700">Prêmios</div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (showParentDashboard) {
    const stats = getStats();
    return (
      <div className="min-h-screen p-6 bg-gradient-to-br from-purple-100 via-pink-100 to-yellow-100">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-black text-purple-600">
              Relatório de {progress.playerName}
            </h1>
            <Button onClick={() => setShowParentDashboard(false)} className="bg-purple-500 hover:bg-purple-600 rounded-xl font-bold">
              <Home className="mr-2 h-5 w-5" />Voltar
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-6 text-center bg-gradient-to-br from-blue-100 to-blue-200 border-4 border-blue-300 rounded-2xl">
              <Clock className="h-12 w-12 mx-auto mb-3 text-blue-600" />
              <div className="text-3xl font-black text-blue-700">{Math.floor(stats.totalTime / 60)}min</div>
              <div className="text-sm font-bold text-blue-600">Tempo jogando</div>
            </Card>
            <Card className="p-6 text-center bg-gradient-to-br from-green-100 to-green-200 border-4 border-green-300 rounded-2xl">
              <Target className="h-12 w-12 mx-auto mb-3 text-green-600" />
              <div className="text-3xl font-black text-green-700">{stats.puzzlesCompleted}/10</div>
              <div className="text-sm font-bold text-green-600">Completou</div>
            </Card>
            <Card className="p-6 text-center bg-gradient-to-br from-yellow-100 to-yellow-200 border-4 border-yellow-300 rounded-2xl">
              <Star className="h-12 w-12 mx-auto mb-3 text-yellow-600" />
              <div className="text-3xl font-black text-yellow-700">{stats.totalStars}</div>
              <div className="text-sm font-bold text-yellow-600">Estrelinhas</div>
            </Card>
            <Card className="p-6 text-center bg-gradient-to-br from-purple-100 to-purple-200 border-4 border-purple-300 rounded-2xl">
              <Trophy className="h-12 w-12 mx-auto mb-3 text-purple-600" />
              <div className="text-3xl font-black text-purple-700">{stats.certificates.length}</div>
              <div className="text-sm font-bold text-purple-600">Troféus</div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!gameStarted) {
    return (
      <div className="min-h-screen p-4 sm:p-6 bg-gradient-to-br from-purple-200 via-pink-200 to-yellow-200">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl font-black text-purple-600 mb-4 drop-shadow-lg animate-pulse">
              Olá, {progress.playerName}!
            </h1>
            <div className="flex flex-wrap justify-center gap-3 mb-6">
              <div className="bg-gradient-to-r from-yellow-300 to-yellow-400 px-6 py-3 rounded-full border-4 border-yellow-500 shadow-lg transform hover:scale-110 transition-all">
                <span className="text-yellow-800 font-black flex items-center gap-2 text-lg">
                  <Star className="h-6 w-6 fill-yellow-800" />
                  {progress.totalStars} estrelinhas
                </span>
              </div>
              <div className="bg-gradient-to-r from-pink-300 to-pink-400 px-6 py-3 rounded-full border-4 border-pink-500 shadow-lg transform hover:scale-110 transition-all">
                <span className="text-pink-800 font-black text-lg">
                  {progress.puzzlesCompleted.length}/10 aventuras
                </span>
              </div>
            </div>
            <Button 
              onClick={() => setShowParentDashboard(true)} 
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-2xl font-bold text-lg px-8 py-6 shadow-lg transform hover:scale-105 transition-all"
            >
              <Sparkles className="mr-2" />
              Ver meu progresso!
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {puzzleImages.map((puzzle, index) => {
              const puzzleProgress = getPuzzleProgress(`puzzle-${index}`);
              const isUnlocked = isPuzzleUnlocked(index);
              
              return (
                <Card 
                  key={puzzle.id} 
                  className={`relative overflow-hidden transition-all duration-300 border-4 rounded-2xl shadow-xl
                    ${isUnlocked ? 'hover:scale-105 cursor-pointer hover:shadow-2xl border-purple-400 bg-white' : 'opacity-70 border-gray-400'}
                    ${puzzleProgress?.completed ? 'ring-4 ring-green-400 border-green-400' : ''}`}
                >
                  <div 
                    onClick={() => {
                      if (isUnlocked) {
                        setCurrentPuzzleIndex(index);
                        initializePuzzle();
                      } else {
                        toast.error('Termine a aventura anterior primeiro!', { duration: 2000 });
                      }
                    }}
                    className="p-4"
                  >
                    <div className="relative">
                      <img 
                        src={puzzle.image} 
                        alt={puzzle.title}
                        className={`w-full h-36 object-cover rounded-xl mb-3 border-4 border-purple-200
                          ${!isUnlocked ? 'filter grayscale blur-sm' : ''}`}
                      />
                      
                      {puzzleProgress?.completed && (
                        <div className="absolute top-2 right-2 bg-yellow-300 rounded-full px-3 py-2 border-2 border-yellow-500 shadow-lg animate-bounce">
                          <div className="flex gap-1">
                            {[...Array(3)].map((_, i) => (
                              <Star 
                                key={i} 
                                className={`h-5 w-5 ${i < puzzleProgress.stars ? 'text-yellow-600 fill-yellow-600' : 'text-gray-400'}`}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {!isUnlocked && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl">
                          <Lock className="h-16 w-16 text-white drop-shadow-2xl animate-pulse" />
                        </div>
                      )}
                    </div>
                    
                    <h3 className="text-xl font-black text-purple-600 mb-2">
                      {puzzle.title}
                    </h3>
                    <p className="text-sm font-bold text-pink-600">
                      {puzzle.description}
                    </p>
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
    <div className="min-h-screen p-4 sm:p-6 bg-gradient-to-br from-purple-200 via-pink-200 to-yellow-200">
      {showConfetti && <Confetti width={windowSize.width} height={windowSize.height} recycle={false} numberOfPieces={500} />}
      
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-black text-purple-600 mb-3 drop-shadow-lg">
            {currentPuzzle.title}
          </h1>
          <div className="flex justify-center gap-4 text-sm sm:text-base flex-wrap">
            <div className="flex items-center gap-2 bg-blue-300 px-4 py-2 rounded-full border-3 border-blue-500 font-bold shadow-lg">
              <Clock className="h-5 w-5" />
              <span className="font-mono text-lg">{formatTime(elapsedTime)}</span>
            </div>
            <div className="flex items-center gap-2 bg-green-300 px-4 py-2 rounded-full border-3 border-green-500 font-bold shadow-lg">
              <Target className="h-5 w-5" />
              <span className="text-lg">{moves} jogadas</span>
            </div>
            <div className="flex items-center gap-2 bg-yellow-300 px-4 py-2 rounded-full border-3 border-yellow-500 font-bold shadow-lg">
              <Star className="h-5 w-5" />
              <span className="text-lg">{currentPuzzleIndex + 1}/{puzzleImages.length}</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Card className="p-4 mx-auto max-w-fit bg-gradient-to-br from-yellow-100 to-orange-100 border-4 border-yellow-400 rounded-3xl shadow-2xl">
            <h2 className="text-xl font-black text-center mb-3 text-orange-600 flex items-center justify-center gap-2">
              <Sparkles className="animate-spin" />
              Monte aqui a imagem!
              <Sparkles className="animate-spin" />
            </h2>
            <div className="bg-white/50 p-3 rounded-2xl border-4 border-yellow-300">
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: GRID_SIZE }, (_, row) =>
                  Array.from({ length: GRID_SIZE }, (_, col) =>
                    renderPuzzleSlot(row, col)
                  )
                )}
              </div>
            </div>
          </Card>

          <Card className="p-4 mx-auto max-w-fit bg-gradient-to-br from-purple-100 to-pink-100 border-4 border-purple-400 rounded-3xl shadow-2xl">
            <h3 className="text-lg font-black text-center mb-3 text-purple-600">
              Suas peças mágicas ({pieces.filter(p => !p.isPlaced).length})
            </h3>
            <div className="bg-white/50 rounded-2xl p-3 border-4 border-purple-300">
              <div className="grid grid-cols-3 gap-2">
                {pieces.filter(p => !p.isPlaced).map(piece => (
                  <div key={piece.id} className="flex justify-center items-center">
                    {renderPuzzlePiece(piece)}
                  </div>
                ))}
                {[...Array(9 - pieces.filter(p => !p.isPlaced).length)].map((_, i) => (
                  <div 
                    key={`empty-${i}`} 
                    className="border-4 border-dashed border-purple-200 rounded-xl"
                    style={{ width: `${pieceSize}px`, height: `${pieceSize}px` }}
                  />
                ))}
              </div>
            </div>
          </Card>
        </div>

        <div className="text-center mt-6 space-y-4">
          <div className="flex justify-center gap-3">
            <Button 
              onClick={goToPuzzleSelection} 
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-2xl font-bold px-6 py-6 text-lg shadow-lg transform hover:scale-110 transition-all"
            >
              <Home className="mr-2 h-5 w-5" />
              Voltar
            </Button>
            <Button 
              onClick={() => { setShowCongratulations(false); setShowNextPuzzleDialog(false); initializePuzzle(); }} 
              className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 rounded-2xl font-bold px-6 py-6 text-lg shadow-lg transform hover:scale-110 transition-all"
            >
              <RotateCcw className="mr-2 h-5 w-5" />
              Tentar de novo
            </Button>
          </div>
          
          {isComplete && (
            <div className="p-6 rounded-3xl bg-gradient-to-r from-green-400 via-yellow-400 to-pink-400 text-white shadow-2xl animate-bounce border-4 border-white">
              <p className="text-3xl font-black drop-shadow-lg">
                VOCÊ CONSEGUIU! PARABÉNS!
              </p>
            </div>
          )}
        </div>

        <Dialog open={showCongratulations} onOpenChange={setShowCongratulations}>
          <DialogContent className="max-w-[90vw] sm:max-w-lg bg-gradient-to-br from-purple-100 to-pink-100 border-4 border-purple-400 rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-3xl font-black text-center text-purple-600">
                VOCÊ É DEMAIS, {progress.playerName}!
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <p className="text-center text-xl font-bold text-pink-600">
                Completou {currentPuzzle.title}!
              </p>

              <div className="flex justify-center gap-2">
                {[...Array(3)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`h-16 w-16 ${
                      i < earnedStars 
                        ? 'text-yellow-400 fill-yellow-400 animate-bounce' 
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>

              <div className="p-4 bg-blue-100 rounded-2xl border-4 border-blue-300">
                <p className="text-sm italic text-center font-bold text-blue-700">
                  "{currentPuzzle.verse}"
                </p>
                <p className="text-xs text-center mt-2 text-blue-600 font-bold">
                  - {currentPuzzle.reference}
                </p>
              </div>
            </div>

            <div className="grid gap-3 pt-4">
              {currentPuzzleIndex < puzzleImages.length - 1 && (
                <Button 
                  onClick={() => {
                    setCurrentPuzzleIndex(prev => prev + 1);
                    setShowCongratulations(false);
                    initializePuzzle();
                  }}
                  className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 rounded-2xl font-black text-xl py-6 shadow-lg transform hover:scale-105 transition-all"
                >
                  Próxima aventura! <ChevronRight className="ml-2 h-6 w-6" />
                </Button>
              )}
              
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  onClick={() => { setShowCongratulations(false); initializePuzzle(); }}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-2xl font-bold py-4 shadow-lg"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Jogar de novo
                </Button>
                
                <Button 
                  onClick={() => { setShowCongratulations(false); goToPuzzleSelection(); }}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-2xl font-bold py-4 shadow-lg"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Menu
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {dragPreview && isMobile && (
          <div
            className="fixed pointer-events-none z-50 opacity-80 rounded-xl shadow-2xl"
            style={{
              left: dragPreview.x - pieceSize / 2,
              top: dragPreview.y - pieceSize / 2,
              width: pieceSize,
              height: pieceSize,
              backgroundImage: `url(${currentPuzzle.image})`,
              backgroundSize: `${pieceSize * GRID_SIZE}px ${pieceSize * GRID_SIZE}px`,
              backgroundPosition: `-${dragPreview.piece.correctPosition.col * pieceSize}px -${dragPreview.piece.correctPosition.row * pieceSize}px`,
              border: '4px solid #a855f7',
            }}
          />
        )}
      </div>
    </div>
  );
};

export default PuzzleGame;
