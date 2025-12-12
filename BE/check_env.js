require('dotenv').config();

const requiredVars = [
  'SECRET_KEY_OCR',
  'CLOVA_OCR_URL',
  'CLOVA_STUDIO_API_KEY',
  'CLOVA_STUDIO_URL'
];

console.log('Checking environment variables...');
requiredVars.forEach(varName => {
  if (process.env[varName]) {
    if (varName.includes('URL')) {
      console.log(`${varName}: ${process.env[varName]}`);
    } else {
      console.log(`${varName}: SET (Length: ${process.env[varName].length})`);
    }
  } else {
    console.log(`${varName}: MISSING`);
  }
});
