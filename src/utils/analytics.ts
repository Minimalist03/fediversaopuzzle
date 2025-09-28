export const trackEvent = (eventName: string, parameters?: Record<string, any>) => {
  if (typeof window !== 'undefined' && (window as any).dataLayer) {
    (window as any).dataLayer.push({
      event: eventName,
      ...parameters
    });
  }
};

export const analytics = {
  trackGameStart: (puzzleName: string) => {
    trackEvent('game_start', {
      puzzle_name: puzzleName,
      puzzle_index: puzzleName.split('-').pop()
    });
  },

  trackPuzzleComplete: (puzzleName: string, timeSpent: number, moves: number, stars: number) => {
    trackEvent('puzzle_complete', {
      puzzle_name: puzzleName,
      time_spent_seconds: timeSpent,
      moves_count: moves,
      stars_earned: stars
    });
  },

  trackMenuReturn: () => {
    trackEvent('return_to_menu');
  },

  trackShare: (method: string) => {
    trackEvent('share_progress', {
      share_method: method
    });
  }
};
