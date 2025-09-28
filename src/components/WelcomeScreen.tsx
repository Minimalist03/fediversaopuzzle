import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';

interface WelcomeScreenProps {
  onStart: (name: string) => void;
  existingName?: string;
}

export const WelcomeScreen = ({ onStart, existingName }: WelcomeScreenProps) => {
  const [name, setName] = useState(existingName || '');
  const [showInput, setShowInput] = useState(!existingName);

  const features = [
    { icon: '📖', text: '10 Histórias Bíblicas', color: 'from-blue-500 to-blue-600' },
    { icon: '⭐', text: 'Ganhe Estrelas', color: 'from-yellow-500 to-orange-500' },
    { icon: '🏆', text: 'Desbloqueie Certificados', color: 'from-purple-500 to-pink-500' },
    { icon: '🎮', text: 'Jogue Offline', color: 'from-green-500 to-teal-500' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100 
                    flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8"
      >
        <div className="text-center mb-8">
          <motion.h1 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 
                       bg-clip-text text-transparent mb-2"
          >
            Quebra-Cabeças Bíblicos
          </motion.h1>
          <p className="text-gray-600">Aprenda histórias sagradas brincando! 🙏</p>
        </div>

        {showInput ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-8"
          >
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Qual é o seu nome, campeão(ã)?
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Digite seu nome..."
              className="text-lg p-3"
              maxLength={20}
            />
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-8 text-center"
          >
            <p className="text-2xl font-bold text-gray-800">
              Bem-vindo(a) de volta, {existingName}! 🎉
            </p>
          </motion.div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className={`bg-gradient-to-r ${feature.color} p-3 rounded-xl text-white`}
            >
              <div className="text-2xl mb-1">{feature.icon}</div>
              <div className="text-sm font-medium">{feature.text}</div>
            </motion.div>
          ))}
        </div>

        <Button
          onClick={() => onStart(name || 'Campeão')}
          disabled={showInput && !name.trim()}
          className="w-full text-lg py-6 bg-gradient-to-r from-green-500 to-green-600 
                     hover:from-green-600 hover:to-green-700"
        >
          {showInput ? 'Começar Aventura! 🚀' : 'Continuar Jogando! 🎮'}
        </Button>

        {!showInput && (
          <button
            onClick={() => setShowInput(true)}
            className="w-full mt-3 text-sm text-gray-500 hover:text-gray-700"
          >
            Não é você? Clique aqui
          </button>
        )}
      </motion.div>
    </div>
  );
};
