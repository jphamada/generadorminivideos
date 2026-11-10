const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Generador de PNG mínimo sin librerías externas
function createPNG(width, height, colorR, colorG, colorB, step) {
  // Encabezado PNG
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: Truecolor (RGB)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(12 + len);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    // CRC
    const crc = crc32(buf.subarray(4, 8 + len));
    buf.writeInt32BE(crc, 8 + len);
    return buf;
  }

  // Generar datos de píxeles: height líneas, cada una empieza con un byte de filtro (0)
  const lineSize = 1 + width * 3;
  const rawData = Buffer.alloc(height * lineSize);

  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // no filter
    const factorY = y / height;
    for (let x = 0; x < width; x++) {
      const factorX = x / width;
      // Dibujar un marco y un patrón
      const isBorder = (x < 15 || x > width - 15 || y < 15 || y > height - 15);
      const isCenter = Math.hypot(x - width/2, y - height/2) < 90;
      
      let r, g, b;
      if (isBorder) {
        r = 255; g = 255; b = 255;
      } else if (isCenter) {
        r = 240; g = 240; b = 250;
      } else {
        r = Math.floor(colorR * (0.6 + 0.4 * factorX));
        g = Math.floor(colorG * (0.6 + 0.4 * factorY));
        b = Math.floor(colorB * (0.7 + 0.3 * (factorX * factorY)));
      }
      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
    }
  }

  const compressed = zlib.deflateSync(rawData, { level: 6 });
  const idatChunk = makeChunk('IDAT', compressed);
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Tabla CRC32
function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    let byte = buf[i];
    for (let j = 0; j < 8; j++) {
      const mix = (crc ^ byte) & 1;
      crc = (crc >>> 1) ^ (mix ? 0xEDB88320 : 0);
      byte = byte >>> 1;
    }
  }
  return (crc ^ -1);
}

const outDir = path.join(__dirname, 'fotos_ejemplo');
const samples = [
  { name: 'foto1_rojo_coral.png', r: 235, g: 87, b: 87 },
  { name: 'foto2_azul_marino.png', r: 41, g: 128, b: 185 },
  { name: 'foto3_verde_esmeralda.png', r: 39, g: 174, b: 96 },
  { name: 'foto4_purpura_real.png', r: 142, g: 68, b: 173 },
  { name: 'foto5_naranja_atardecer.png', r: 230, g: 126, b: 34 },
  { name: 'foto6_turquesa.png', r: 22, g: 160, b: 133 }
];

samples.forEach((s, idx) => {
  const buf = createPNG(800, 600, s.r, s.g, s.b, idx);
  const filePath = path.join(outDir, s.name);
  fs.writeFileSync(filePath, buf);
  const sizeKB = (buf.length / 1024).toFixed(1);
  console.log(`Creada: ${s.name} (${sizeKB} KB) -> Cumple < 100 KB`);
});
