import { useGameProgress } from '@/hooks/useGameProgress';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Share2 } from 'lucide-react';

export const ParentDashboard = () => {
  const { getStats, progress } = useGameProgress();
  const stats = getStats();

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}min` : `${minutes} minutos`;
  };

  const shareProgress = () => {
    const text = `🎉 ${progress.playerName} já completou ${stats.puzzlesCompleted} quebra-cabeças bíblicos e ganhou ${stats.totalStars} estrelas! 🌟 #QuebracabeçasBíblicos`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Progresso no Quebra-Cabeças Bíblicos',
        text: text,
        url: window.location.href
      });
    } else {
      // Fallback: copiar para clipboard
      navigator.clipboard.writeText(text);
      toast.success('Texto copiado! Cole no WhatsApp 📱');
    }
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">
          Acompanhamento - {progress.playerName}
        </h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4 text-center">
            <div className="text-3xl mb-2">⏱️</div>
            <div className="text-2xl font-bold">{formatTime(stats.totalTime)}</div>
            <div className="text-sm text-gray-600">Tempo Total</div>
          </Card>

          <Card className="p-4 text-center">
            <div className="text-3xl mb-2">🧩</div>
            <div className="text-2xl font-bold">{stats.puzzlesCompleted}/10</div>
            <div className="text-sm text-gray-600">Completos</div>
          </Card>

          <Card className="p-4 text-center">
            <div className="text-3xl mb-2">⭐</div>
            <div className="text-2xl font-bold">{stats.totalStars}</div>
            <div className="text-sm text-gray-600">Estrelas Total</div>
          </Card>

          <Card className="p-4 text-center">
            <div className="text-3xl mb-2">🏆</div>
            <div className="text-2xl font-bold">{stats.certificates.length}</div>
            <div className="text-sm text-gray-600">Certificados</div>
          </Card>
        </div>

        {/* Progresso detalhado */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Histórias Completadas</h2>
          <div className="space-y-3">
            {progress.puzzlesCompleted.map((puzzle) => (
              <div key={puzzle.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">História {puzzle.id.split('-')[1]}</div>
                  <div className="text-sm text-gray-600">
                    Tempo: {Math.floor(puzzle.timeSpent / 60)}min | Movimentos: {puzzle.moves}
                  </div>
                </div>
                <div className="flex gap-1">
                  {[...Array(3)].map((_, i) => (
                    <span key={i} className={i < puzzle.stars ? '' : 'grayscale opacity-30'}>
                      ⭐
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Button 
          onClick={shareProgress}
          className="w-full"
          size="lg"
        >
          <Share2 className="mr-2" />
          Compartilhar Progresso no WhatsApp
        </Button>
      </div>
    </div>
  );
};
