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

  const baseScales = (yTitle) => ({
    x: {
      grid: { display: false },
      border: { color: 'rgba(36,31,51,0.12)' },
      ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
    },
    y: {
      grid: { color: GRID, drawTicks: false },
      border: { display: false },
      ticks: { padding: 8 },
      title: yTitle ? { display: true, text: yTitle, color: MUTED, font: { size: 10.5, weight: '600' } } : undefined,
    },
  });

  const line = (color, label, data, extra = {}) => ({
    label, data,
    borderColor: color,
    backgroundColor: color,
    borderWidth: 2,
    pointRadius: 0,
    pointHoverRadius: 5,
    pointHoverBackgroundColor: '#fff',
    pointHoverBorderWidth: 2.5,
    tension: 0.38,
    ...extra,
  });

  const gradFill = (ctx, color, alphaTop = 0.16) => {
    const g = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
    g.addColorStop(0, color + Math.round(alphaTop * 255).toString(16).padStart(2, '0'));
    g.addColorStop(1, color + '00');
    return g;
  };

  const legendTop = (show = true) => ({
    display: show,
    position: 'top',
    align: 'end',
    labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 7, boxHeight: 7, padding: 14, color: INK2, font: { weight: '600' } },
  });

  const hoverLine = { mode: 'index', intersect: false };

  /* ---------------------------------------------- blood pressure (2 series) */
  const bpEl = document.getElementById('bpChart');
  if (bpEl && D.vitals) {
    const ctx = bpEl.getContext('2d');
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: D.vitals.labels,
        datasets: [
          line(S1, 'Systolic', D.vitals.systolic, { backgroundColor: gradFill(ctx, S1), fill: true }),
          line(S2, 'Diastolic', D.vitals.diastolic, { backgroundColor: gradFill(ctx, S2), fill: true }),
          line(CRIT, 'Safe limit (140)', D.vitals.labels.map(() => 140),
            { borderDash: [6, 6], borderWidth: 1.5, pointRadius: 0, pointHoverRadius: 0, fill: false }),
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: hoverLine,
        plugins: { legend: legendTop(), tooltip: glassTooltip },
        scales: baseScales('mmHg'),
      },
    });
  }


