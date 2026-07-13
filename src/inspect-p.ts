import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

try {
  const filePath = path.join(process.cwd(), 'public', 'op.xlsx');
  const fileBuffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  console.log('Cell P1:', worksheet['P1']);
  console.log('Cell P2:', worksheet['P2']);
  console.log('Cell P3:', worksheet['P3']);
  console.log('Cell P4:', worksheet['P4']);
  console.log('Cell P5:', worksheet['P5']);
} catch (err) {
  console.error('Error:', err);
}
