const fs = require('fs');
const path = require('path');

// Carpeta de fotos de ejemplo
const outDir = path.join(__dirname, 'fotos_ejemplo');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Generar 6 SVGs convertidos o archivos de prueba limpios
const colors = [
  { name: '01_Amanecer_Dorado', bg1: '#ff7e5f', bg2: '#feb47b', title: 'Foto 1: Amanecer' },
  { name: '02_Oceano_Profundo', bg1: '#00c6ff', bg2: '#0072ff', title: 'Foto 2: Océano' },
  { name: '03_Bosque_Esmeralda', bg1: '#11998e', bg2: '#38ef7d', title: 'Foto 3: Bosque' },
  { name: '04_Atardecer_Violeta', bg1: '#8a2387', bg2: '#e94057', title: 'Foto 4: Atardecer' },
  { name: '05_Nebulosa_Cosmica', bg1: '#4776e6', bg2: '#8e54e9', title: 'Foto 5: Galaxia' },
  { name: '06_Noche_Estrellada', bg1: '#141e30', bg2: '#243b55', title: 'Foto 6: Noche' }
];

colors.forEach((c, index) => {
  const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" width="720" height="480" viewBox="0 0 720 480">
  <defs>
    <linearGradient id="grad${index}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c.bg1}" />
      <stop offset="100%" stop-color="${c.bg2}" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000" flood-opacity="0.3"/>
    </filter>
  </defs>
  <rect width="720" height="480" fill="url(#grad${index})" />
  <circle cx="360" cy="190" r="90" fill="#ffffff" opacity="0.18" />
  <circle cx="360" cy="190" r="55" fill="#ffffff" opacity="0.25" />
  <text x="360" y="210" font-family="system-ui, sans-serif" font-size="56" font-weight="bold" fill="#ffffff" text-anchor="middle" filter="url(#shadow)">${index + 1}</text>
  <text x="360" y="330" font-family="system-ui, sans-serif" font-size="28" font-weight="bold" fill="#ffffff" text-anchor="middle" filter="url(#shadow)">${c.title}</text>
  <text x="360" y="375" font-family="system-ui, sans-serif" font-size="16" fill="#f1f5f9" text-anchor="middle" opacity="0.9">Ejemplo de prueba &lt; 100 KB</text>
  <rect x="220" y="410" width="280" height="30" rx="15" fill="rgba(0,0,0,0.25)" />
  <text x="360" y="430" font-family="system-ui, sans-serif" font-size="13" fill="#ffffff" text-anchor="middle">Formato 3:2 | 720 x 480 px</text>
</svg>
`.trim();

  const filePath = path.join(outDir, `${c.name}.svg`);
  fs.writeFileSync(filePath, svgContent, 'utf-8');
  const stat = fs.statSync(filePath);
  console.log(`Generado: ${c.name}.svg (${(stat.size / 1024).toFixed(2)} KB)`);
});
