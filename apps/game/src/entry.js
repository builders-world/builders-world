if (new URLSearchParams(location.search).get('world') === '1') {
  import('./main.js');
} else {
  import('./onboarding/app.js').catch(error => {
    console.error(error);
    document.body.textContent = 'The arrivals experience could not load. Please refresh to try again.';
  });
}
