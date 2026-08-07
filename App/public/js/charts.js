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

  /* ------------------------------------------------- glucose (single series) */
  const sugarEl = document.getElementById('sugarChart');
  if (sugarEl && D.vitals) {
    const ctx = sugarEl.getContext('2d');
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: D.vitals.labels,
        datasets: [
          line(S1, 'Fasting glucose', D.vitals.sugar, { backgroundColor: gradFill(ctx, S1), fill: true }),
          line(WARN, 'Target limit (95)', D.vitals.labels.map(() => 95),
            { borderDash: [6, 6], borderWidth: 1.5, pointRadius: 0, pointHoverRadius: 0, fill: false }),
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: hoverLine,
        plugins: { legend: legendTop(), tooltip: glassTooltip },
        scales: baseScales('mg/dL'),
      },
    });
  }

  /* -------------------------------------------------- weight (single series) */
  const weightEl = document.getElementById('weightChart');
  if (weightEl && D.vitals) {
    const ctx = weightEl.getContext('2d');
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: D.vitals.labels,
        datasets: [line(S1, 'Weight', D.vitals.weight, { backgroundColor: gradFill(ctx, S1), fill: true })],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: hoverLine,
        plugins: { legend: legendTop(false), tooltip: glassTooltip },
        scales: baseScales('kg'),
      },
    });
  }

  /* -------------------------------------------- dashboard mini vitals spark */
  const sparkEl = document.getElementById('sparkChart');
  if (sparkEl && D.vitals) {
    const ctx = sparkEl.getContext('2d');
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: D.vitals.labels,
        datasets: [
          line(S1, 'Systolic', D.vitals.systolic, { backgroundColor: gradFill(ctx, S1), fill: true }),
          line(S2, 'Diastolic', D.vitals.diastolic),
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

  /* --------------------------------------------------- WHO growth percentiles */
  const whoEl = document.getElementById('whoChart');
  if (whoEl && D.who) {
    const ctx = whoEl.getContext('2d');
    new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [
          { label: 'WHO P97', data: D.who.months.map((m, i) => ({ x: m, y: D.who.p97[i] })),
            borderColor: 'rgba(42,120,214,0.35)', borderWidth: 1.2, pointRadius: 0, tension: 0.3, fill: '+2',
            backgroundColor: 'rgba(157,197,244,0.28)' },
          { label: 'WHO P50 (median)', data: D.who.months.map((m, i) => ({ x: m, y: D.who.p50[i] })),
            borderColor: S1, borderDash: [7, 5], borderWidth: 1.6, pointRadius: 0, tension: 0.3 },
          { label: 'WHO P3', data: D.who.months.map((m, i) => ({ x: m, y: D.who.p3[i] })),
            borderColor: 'rgba(42,120,214,0.35)', borderWidth: 1.2, pointRadius: 0, tension: 0.3 },
          { label: (D.who.childName || 'Child') + ' — weight', data: D.who.child,
            borderColor: S2, backgroundColor: '#fff', borderWidth: 2.4,
            pointRadius: 4.5, pointBorderWidth: 2.4, pointBorderColor: S2, tension: 0.32 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'nearest', intersect: false },
        plugins: { legend: legendTop(), tooltip: { ...glassTooltip,
          callbacks: { title: (it) => 'Age ' + it[0].parsed.x + ' months' } } },
        scales: {
          x: { type: 'linear', min: 0, max: 24, grid: { display: false },
               border: { color: 'rgba(36,31,51,0.12)' },
               title: { display: true, text: 'Age (months)', color: MUTED, font: { size: 10.5, weight: '600' } },
               ticks: { stepSize: 3 } },
          y: { grid: { color: GRID, drawTicks: false }, border: { display: false },
               title: { display: true, text: 'Weight (kg)', color: MUTED, font: { size: 10.5, weight: '600' } } },
        },
      },
    });
  }

