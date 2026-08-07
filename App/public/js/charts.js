/* MaternityCare+ — chart layer (Chart.js)
   Colors follow the validated data-viz palette:
   series: blue #2a78d6 · orange #eb6834 · aqua #1baf7a
   status: good #0ca30c · warning #fab219 · critical #d03b3b            */
(function () {
  if (typeof Chart === 'undefined') return;
  const D = window.MC || {};

  const S1 = '#2a78d6', S2 = '#eb6834', S3 = '#1baf7a';
  const GOOD = '#0ca30c', WARN = '#fab219', CRIT = '#d03b3b';
  const INK2 = '#5c5575', MUTED = '#898781', GRID = 'rgba(36,31,51,0.07)';

  Chart.defaults.font.family = "'Plus Jakarta Sans', system-ui, sans-serif";
  Chart.defaults.font.size = 11.5;
  Chart.defaults.color = MUTED;

  const glassTooltip = {
    backgroundColor: 'rgba(30,26,43,0.92)',
    titleFont: { weight: '700', size: 12 },
    bodyFont: { size: 11.5 },
    padding: 12,
    cornerRadius: 12,
    boxPadding: 5,
    displayColors: true,
    usePointStyle: true,
    caretSize: 6,
  };

