'use strict';
const { compressContext } = require('../compress-context');

// Mock 414-line file simulating games-2026-feature.js structure
const lines = [];
for (let i = 0; i < 414; i++) {
  if (i === 51) lines.push('  const LOCAL_REAL_COVERS = {');
  else if (i === 52) lines.push("    'Elden Ring': 'assets/img/game-elden.jpg',");
  else if (i === 53) lines.push("    'Crimson Desert': 'assets/img/game-crimson-real.jpg',");
  else if (i === 60) lines.push("    'Duskbloods': 'assets/img/game-duskbloods.png',");
  else if (i === 61) lines.push("    'Pokemon Pokopia': 'assets/img/game-pokopia.jpg',");
  else if (i === 62) lines.push("    'Pokemon Pokopia': 'assets/img/game-pokopia.jpg'");
  else if (i === 63) lines.push('  };');
  else if (i === 64) lines.push('  const TRUSTED_API_COVER_SOURCES = new Set([\'rawg\', \'steamgriddb\']);');
  else if (i < 50) lines.push('  // preamble line ' + i + ' - rank data, game objects, unrelated setup');
  else lines.push('  // line ' + i + ' of mock file - unrelated logic');
}
const mockContent = lines.join('\n');
const diagnosis = 'Hexe missing in LOCAL_REAL_COVERS — adicionar Assassins Creed Hexe cover entry';

const result = compressContext(mockContent, diagnosis);
console.log('original_lines:   ', result.original_lines);
console.log('compressed_lines: ', result.compressed_lines);
console.log('compression_ratio:', result.compression_ratio + '%');
console.log('window_start:     ', result.window_start);
console.log('window_end:       ', result.window_end);
console.log('fallback:         ', result.fallback);
console.log('LOCAL_REAL_COVERS preserved:', result.compressed.includes('LOCAL_REAL_COVERS'));
console.log('TRUSTED_API preserved:      ', result.compressed.includes('TRUSTED_API_COVER_SOURCES'));
console.log('Pokemon Pokopia preserved:  ', result.compressed.includes('Pokemon Pokopia'));
console.log('\n--- compressed (first 600 chars) ---');
console.log(result.compressed.slice(0, 600));
