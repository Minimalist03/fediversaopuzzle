import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { puzzleImages, PuzzleImageData } from "@/data/puzzleImages";
import { useSoundEffects } from "@/hooks/useSoundEffects";

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

const GRID_SIZE = 3;
const PIECE_SIZE_DESKTOP = 120;
const PIECE_SIZE_MOBILE = 100;

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
  const { playSuccessSound, playPieceDropSound, playCompletionSound } = useSoundEffects();

  const currentPuzzle: PuzzleImageData = puzzleImages[currentPuzzleIndex];

  // Detecta se é mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const pieceSize = isMobile ? PIECE_SIZE_MOBILE : PIECE_SIZE_DESKTOP;

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
    
    // Embaralha as peças
    const shuffledPieces = [...newPieces].sort(() => Math.random() - 0.5);
    setPieces(shuffledPieces);
    setIsComplete(false);
    setGameStarted(true);
    toast(`✨ Monte ${currentPuzzle.title} arrastando as peças! 🙏`);
  }, []);

  // Verifica se o quebra-cabeça está completo
  const checkCompletion = useCallback(() => {
    const placedPieces = pieces.filter(piece => piece.isPlaced);
    if (placedPieces.length === GRID_SIZE * GRID_SIZE) {
      const allCorrect = placedPieces.every(piece => 
        piece.row === piece.correctPosition.row && 
        piece.col === piece.correctPosition.col
      );
      
      if (allCorrect) {
        setIsComplete(true);
        playCompletionSound();
        setShowCongratulations(true);
        toast(`🎉 Parabéns! Você completou ${currentPuzzle.title}! 🎉`);
      }
    }
  }, [pieces]);

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

  // Touch events for mobile com visual feedback
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
    
    // Atualiza a posição da peça que está sendo arrastada
    setDragPreview(prev => prev ? {
      ...prev,
      x: touch.clientX,
      y: touch.clientY
    } : null);
    
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    
    // Remove drag-over class from all slots
    document.querySelectorAll('.puzzle-slot').forEach(slot => {
      slot.classList.remove('drag-over');
    });
    
    // Add drag-over class to current slot
    if (element && element.classList.contains('puzzle-slot')) {
      element.classList.add('drag-over');
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!draggedPiece || !isDragging) return;
    
    const touch = e.changedTouches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    
    // Remove drag-over class from all slots
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

    // Verifica se já existe uma peça nesta posição
    const existingPiece = pieces.find(
      p => p.isPlaced && p.row === targetRow && p.col === targetCol
    );

    if (existingPiece) {
      toast("Já existe uma peça aqui! 🤔");
      return;
    }

    setPieces(prevPieces => 
      prevPieces.map(piece => 
        piece.id === draggedPiece.id
          ? { ...piece, row: targetRow, col: targetCol, isPlaced: true }
          : piece
      )
    );

    // Feedback de sucesso se a peça estiver na posição correta
    if (draggedPiece.correctPosition.row === targetRow && 
        draggedPiece.correctPosition.col === targetCol) {
      playSuccessSound();
      toast("🎉 Perfeito! Deus abençoe sua sabedoria! ✨");
    } else {
      playPieceDropSound();
      toast("😊 Continue tentando! Com fé tudo é possível! 🙏");
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
    setCurrentPuzzleIndex(0);
    setShowCongratulations(false);
    setShowNextPuzzleDialog(false);
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
        className={`puzzle-piece cursor-grab active:cursor-grabbing touch-none select-none ${
          draggedPiece?.id === piece.id ? 'dragging' : ''
        } ${
          piece.isPlaced && 
          piece.row === piece.correctPosition.row && 
          piece.col === piece.correctPosition.col ? 'correct' : ''
        }`}
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
        className={`puzzle-slot flex items-center justify-center ${
          placedPiece ? 'filled' : ''
        }`}
        style={{ width: `${pieceSize}px`, height: `${pieceSize}px` }}
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.classList.add('drag-over');
        }}
        onDragLeave={(e) => {
          e.currentTarget.classList.remove('drag-over');
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.classList.remove('drag-over');
          handleDrop(row, col);
        }}
      >
        {placedPiece && renderPuzzlePiece(placedPiece)}
      </div>
    );
  };

  if (!gameStarted) {
    return (
      <div className="min-h-screen p-4 sm:p-6 bg-gradient-to-br from-background via-card to-secondary/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold text-primary mb-4 font-serif">
              📖 Quebra-Cabeças Bíblicos Infantis ✨
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 md:mb-8 max-w-4xl mx-auto">
              Aprenda histórias da Bíblia de forma divertida! Escolha uma história sagrada para montar e descobrir a mensagem de Deus! 🙏
            </p>
            <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-3 md:p-4 rounded-xl border border-primary/20 max-w-2xl mx-auto mb-6">
              <p className="text-sm md:text-base text-primary font-medium">
                "Ensina a criança no caminho em que deve andar" - Provérbios 22:6 ✨
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {puzzleImages.map((puzzle, index) => (
              <Card key={puzzle.id} className="puzzle-card overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer">
                <div 
                  onClick={() => {
                    setCurrentPuzzleIndex(index);
                    initializePuzzle();
                  }}
                  className="p-4 text-center"
                >
                  <img 
                    src={puzzle.image} 
                    alt={puzzle.title}
                    className="w-full h-28 sm:h-32 md:h-40 object-cover rounded-xl mb-3 md:mb-4 shadow-md"
                  />
                  <h3 className="text-lg font-bold text-primary mb-2 font-serif">
                    {puzzle.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {puzzle.description}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 bg-gradient-to-br from-background via-card to-secondary/20">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-primary mb-2 font-serif">
            {currentPuzzle.title}
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground mb-2">
            Arraste as peças para o lugar correto!
          </p>
          <p className="text-sm text-accent font-medium">
            Quebra-cabeça {currentPuzzleIndex + 1} de {puzzleImages.length}
          </p>
        </div>

        {/* Game Area */}
        <div className="flex flex-col lg:flex-row gap-4 md:gap-6 lg:gap-8 items-center justify-center">
          {/* Puzzle Board */}
          <Card className="game-container flex-shrink-0">
            <h2 className="text-lg sm:text-xl font-semibold text-center mb-4 text-primary font-serif">
              Monte a imagem aqui! 🧩
            </h2>
            <div className="grid grid-cols-3 gap-1 md:gap-2 bg-game-board p-2 md:p-4 rounded-2xl shadow-lg">
              {Array.from({ length: GRID_SIZE }, (_, row) =>
                Array.from({ length: GRID_SIZE }, (_, col) =>
                  renderPuzzleSlot(row, col)
                )
              )}
            </div>
          </Card>

          {/* Pieces Palette */}
          <Card className="game-container w-full lg:w-auto">
            <h2 className="text-base md:text-lg lg:text-xl font-semibold text-center mb-3 md:mb-4 text-primary font-serif">
              Peças disponíveis 🎯
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-2 xl:grid-cols-3 gap-2 md:gap-3 lg:gap-4 justify-items-center max-h-96 overflow-y-auto">
              {pieces
                .filter(piece => !piece.isPlaced)
                .map(piece => renderPuzzlePiece(piece, true))
              }
            </div>
          </Card>
        </div>

        {/* Controls */}
        <div className="text-center mt-4 md:mt-6 lg:mt-8 space-y-3 md:space-y-4">
          <div className="flex flex-wrap justify-center gap-2 md:gap-3 lg:gap-4">
            <Button
              onClick={goToPuzzleSelection}
              variant="outline"
              size={isMobile ? "default" : "lg"}
              className="text-sm md:text-base lg:text-lg px-3 md:px-4 lg:px-6 py-2 md:py-3 rounded-xl font-serif"
            >
              🏠 Escolher História
            </Button>
            <Button
              onClick={resetGame}
              variant="outline"
              size={isMobile ? "default" : "lg"}
              className="text-sm md:text-base lg:text-lg px-3 md:px-4 lg:px-6 py-2 md:py-3 rounded-xl font-serif"
            >
              🔄 Reiniciar
            </Button>
          </div>
          
          {/* Dicas para os pais */}
          <div className="bg-gradient-to-r from-accent/10 to-primary/10 p-3 md:p-4 rounded-xl border border-accent/20 max-w-2xl mx-auto">
            <p className="text-xs md:text-sm text-muted-foreground font-medium">
              💡 Dica para os pais: Converse com seu filho sobre a história enquanto montam juntos!
            </p>
          </div>
          
          {isComplete && (
            <div className="mt-3 md:mt-4 p-3 md:p-4 rounded-2xl bg-gradient-to-r from-celebration to-primary/80 shadow-lg animate-pulse">
              <p className="text-base md:text-lg lg:text-2xl font-bold text-white font-serif">
                🎉 Parabéns! Deus abençoe sua sabedoria! 🎉
              </p>
            </div>
          )}
        </div>

        {/* Congratulations Dialog */}
        <Dialog open={showCongratulations} onOpenChange={setShowCongratulations}>
          <DialogContent className="max-w-2xl mx-4">
            <DialogHeader>
              <DialogTitle className="text-xl md:text-2xl lg:text-3xl font-bold text-center text-primary font-serif">
                🎉 Parabéns! Deus abençoe! 🎉
              </DialogTitle>
              <DialogDescription className="text-center space-y-4 md:space-y-6">
                <div className="text-base md:text-lg lg:text-xl font-semibold text-foreground">
                  Você completou {currentPuzzle.title}!
                </div>
                <div className="bg-gradient-to-r from-primary/5 to-accent/5 p-4 md:p-6 rounded-lg border-l-4 border-primary shadow-inner">
                  <p className="text-sm font-medium text-primary mb-2">
                    ✨ Versículo Bíblico para Meditar:
                  </p>
                  <p className="text-sm md:text-base italic text-foreground leading-relaxed font-medium">
                    "{currentPuzzle.verse}"
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground mt-2 text-right font-medium">
                    - {currentPuzzle.reference}
                  </p>
                </div>
                <div className="bg-muted/50 p-3 md:p-4 rounded-lg">
                  <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                    💝 <strong>Para os pais:</strong> Agora é um ótimo momento para conversar com seu filho sobre esta história bíblica e como ela se aplica à vida cotidiana!
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                  <Button onClick={() => setShowCongratulations(false)} variant="outline" className="font-serif">
                    Fechar
                  </Button>
                  <Button onClick={resetGame} variant="outline" className="font-serif">
                    🔄 Jogar Novamente
                  </Button>
                  {currentPuzzleIndex < puzzleImages.length - 1 && (
                    <Button onClick={goToNextPuzzle} className="bg-primary hover:bg-primary-glow font-serif">
                      ➡️ Próxima História
                    </Button>
                  )}
                </div>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>

        {/* Next Puzzle Dialog */}
        <Dialog open={showNextPuzzleDialog} onOpenChange={setShowNextPuzzleDialog}>
          <DialogContent className="max-w-lg mx-4">
            <DialogHeader>
              <DialogTitle className="text-xl md:text-2xl lg:text-3xl font-bold text-center text-primary font-serif">
                🌟 Incrível! Glória a Deus! 🌟
              </DialogTitle>
              <DialogDescription className="text-center space-y-4">
                <div className="text-base md:text-lg lg:text-xl font-semibold text-foreground">
                  Você completou todas as histórias bíblicas!
                </div>
                <div className="bg-gradient-to-r from-celebration/10 to-primary/10 p-4 rounded-lg border border-primary/20">
                  <p className="text-sm md:text-base text-foreground font-medium mb-2">
                    🎊 Parabéns por sua dedicação e perseverança!
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground italic">
                    "O temor do Senhor é o princípio da sabedoria" - Provérbios 9:10
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">
                  Continue explorando as maravilhosas histórias da Bíblia! 📖✨
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                  <Button onClick={goToPuzzleSelection} className="bg-primary hover:bg-primary-glow font-serif">
                    🏠 Voltar ao Início
                  </Button>
                </div>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>

        {/* Drag Preview for Mobile */}
        {dragPreview && isMobile && (
          <div
            className="fixed pointer-events-none z-50 opacity-80"
            style={{
              left: dragPreview.x - pieceSize / 2,
              top: dragPreview.y - pieceSize / 2,
              width: pieceSize,
              height: pieceSize,
              backgroundImage: `url(${currentPuzzle.image})`,
              backgroundSize: `${pieceSize * GRID_SIZE}px ${pieceSize * GRID_SIZE}px`,
              backgroundPosition: `-${dragPreview.piece.correctPosition.col * pieceSize}px -${dragPreview.piece.correctPosition.row * pieceSize}px`,
              borderRadius: '8px',
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