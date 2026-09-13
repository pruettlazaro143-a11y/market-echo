import {mkdir,cp,readFile,writeFile,rm} from 'node:fs/promises';
const root=new URL('../',import.meta.url),dest=new URL('../dist/',import.meta.url);
await rm(dest,{recursive:true,force:true});await mkdir(dest,{recursive:true});
for(const dir of ['web','lib','examples'])await cp(new URL(dir,root),new URL(dir,dest),{recursive:true});
await writeFile(new URL('index.html',dest),await readFile(new URL('web/index.html',root)));
console.log('Static build: dist/ (no build dependencies)');
