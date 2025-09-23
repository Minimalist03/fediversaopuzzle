import { useCallback } from 'react';

export const useSoundEffects = () => {
  const createAudioContext = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Resolve contexto suspenso (necessário para iOS/mobile)
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    
    return audioContext;
  };

  const playSuccessSound = useCallback(() => {
    try {
      const audioContext = createAudioContext();
      
      // Create a cheerful success melody
      const frequencies = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      let currentTime = audioContext.currentTime;
      
      // Volume mais baixo para mobile
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const volume = isMobile ? 0.1 : 0.2;
      
      frequencies.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(freq, currentTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, currentTime);
        gainNode.gain.linearRampToValueAtTime(volume, currentTime + 0.1);
        gainNode.gain.linearRampToValueAtTime(0, currentTime + 0.3);
        
        oscillator.start(currentTime);
        oscillator.stop(currentTime + 0.3);
        
        currentTime += 0.15;
      });
    } catch (error) {
      console.log('Audio não suportado:', error);
    }
  }, []);

  const playPieceDropSound = useCallback(() => {
    try {
      const audioContext = createAudioContext();
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
      oscillator.frequency.linearRampToValueAtTime(660, audioContext.currentTime + 0.1);
      oscillator.type = 'triangle';
      
      // Volume mais baixo para mobile
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const volume = isMobile ? 0.08 : 0.15;
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.log('Audio não suportado:', error);
    }
  }, []);

  const playCompletionSound = useCallback(() => {
    try {
      const audioContext = createAudioContext();
      
      // Create a triumphant celebration melody
      const melody = [
        { freq: 523.25, duration: 0.2 }, // C5
        { freq: 659.25, duration: 0.2 }, // E5
        { freq: 783.99, duration: 0.2 }, // G5
        { freq: 1046.50, duration: 0.4 }, // C6
        { freq: 783.99, duration: 0.2 }, // G5
        { freq: 1046.50, duration: 0.6 }, // C6
      ];
      
      let currentTime = audioContext.currentTime;
      
      // Volume mais baixo para mobile
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const volume = isMobile ? 0.15 : 0.3;
      
      melody.forEach(note => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(note.freq, currentTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, currentTime);
        gainNode.gain.linearRampToValueAtTime(volume, currentTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, currentTime + note.duration);
        
        oscillator.start(currentTime);
        oscillator.stop(currentTime + note.duration);
        
        currentTime += note.duration * 0.8;
      });
    } catch (error) {
      console.log('Audio não suportado:', error);
    }
  }, []);

  return {
    playSuccessSound,
    playPieceDropSound,
    playCompletionSound,
  };
};