import iconifyTools from '@iconify/json-tools';
import fs from 'fs';
import path from 'path';


const { getIcons } = iconifyTools;

async function createIconBundle() {
  const iconSets = ['material-symbols:list', 'mage:box-3d-fill', 'mingcute:building-5-line'];
  const data = await getIcons(iconSets);
  
  const outputPath = path.join(process.cwd(), 'dist', 'icon-bundle.js');
  const outputData = `window.iconifyData = ${JSON.stringify(data)};`;

  fs.writeFileSync(outputPath, outputData, 'utf8');
  console.log(`Icon bundle created at ${outputPath}`);
}

createIconBundle().catch(err => {
  console.error('Failed to create icon bundle:', err);
});