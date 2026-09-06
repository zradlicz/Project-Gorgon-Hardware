const fs = require('fs');
// Requires Node.js and the sharp package available through normal module resolution.
const sharp = require('sharp');
let svg = fs.readFileSync(__dirname + '/regulator-board.svg', 'utf8');
svg = svg.replace(/width="297.0022mm" height="210.0072mm" viewBox="[^"]+"/, 'width="1300" height="1200" viewBox="93 103 13 12"');
sharp(Buffer.from(svg)).flatten({background:'#ffffff'}).png().toFile(__dirname + '/regulator-detail.png').catch(e => { console.error(e); process.exitCode=1; });
