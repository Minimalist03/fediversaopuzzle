import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader as Loader2, Lock } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireSubscription?: boolean;
}

export const ProtectedRoute = ({ children, requireSubscription = true }: ProtectedRouteProps) => {
  const { user, loading, hasActiveSubscription } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
        <Card className="p-8 text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Carregando...</p>
        </Card>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireSubscription && !hasActiveSubscription) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50 p-4">
        <Card className="p-8 max-w-md text-center">
          <Lock className="h-16 w-16 mx-auto mb-4 text-orange-600" />
          <h2 className="text-2xl font-bold mb-3">Assinatura Necessária</h2>
          <p className="text-gray-700 mb-6">
            Você precisa de uma assinatura ativa para acessar o jogo completo.
            Entre em contato para adquirir seu acesso.
          </p>
          <div className="space-y-3">
            <Button
              onClick={() => window.location.href = 'mailto:contato@feediversao.com.br?subject=Quero adquirir o jogo'}
              className="w-full"
            >
              Entrar em Contato
            </Button>
            <Button
              onClick={() => window.location.href = '/login'}
              variant="outline"
              className="w-full"
            >
              Voltar
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
