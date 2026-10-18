import { cp, mkdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
const root=process.cwd(), out=join(root,'dist');
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
const entries=['index.html','admin','admin-preview.html','css','js','ghost','data','assets'];
for(const entry of entries){
  const source=join(root,entry),destination=join(out,entry);
  try{const s=await stat(source);await cp(source,destination,{recursive:s.isDirectory()});}
  catch(e){if(e.code!=='ENOENT')throw e;}
}
console.log('Static site built → dist (no bot code, secrets or server functions exposed).');
