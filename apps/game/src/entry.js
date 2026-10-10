import { boot } from './session.js';

const start = () => {
  if (new URLSearchParams(location.search).get('world') === '1') {
    import('./main.js');
  } else {
    import('./onboarding/app.js').catch(error => {
      console.error(error);
      document.body.textContent = 'The arrivals experience could not load. Please refresh to try again.';
    });
  }
};
// who is playing is settled first (a few seconds at most); the game starts either way
boot().catch(() => {}).then(start);
