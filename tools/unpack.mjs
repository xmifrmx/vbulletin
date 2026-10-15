// Tarayıcıdaki "Veri klasörü paketi" (JSON) dosyasını doğrulayıp data/ klasörüne yazar:
//   node tools/unpack.mjs mifrm-data-files.json
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {fromFiles} from '../assets/js/core/files.js';import {validateDb} from '../assets/js/core/schema.js';import {saveDb} from './lib/fsdata.mjs';
const f=process.argv[2];if(!f){console.error('Kullanım: node tools/unpack.mjs <paket.json>');process.exit(2)}
const db=fromFiles(JSON.parse(fs.readFileSync(f,'utf8')));const r=validateDb(db);
if(!r.ok){r.errors.forEach(e=>console.error('HATA:',e));process.exit(1)}
saveDb(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../data'),db);console.log('data/ güncellendi. Şimdi: git add data && git commit && git push');
