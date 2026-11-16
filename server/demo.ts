import path from 'node:path';
import {createServer} from 'vite';

if(process.env.NODE_ENV==='production') throw new Error('Le mode démo est réservé au développement local.');
process.env.NODE_ENV='development';
const server=await createServer({root:process.cwd(),configFile:path.resolve('vite.config.ts'),mode:'demo',
  server:{host:'127.0.0.1',port:3020,strictPort:true},logLevel:'info'});
const close=()=>void server.close();
process.once('SIGINT',close);process.once('SIGTERM',close);
try {
  await server.listen();
  process.stdout.write('Démo TMS/DMS : http://127.0.0.1:3020\nSimulation — Aucun e-mail réel envoyé.\nBase isolée : '+path.resolve('.data/demo/demo.sqlite')+'\n');
} catch(error){await server.close();throw error;}
