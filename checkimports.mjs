import fs from 'fs';
import path from 'path';
const root = process.cwd();
function walk(dir){let out=[];for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())out=out.concat(walk(p));else if(e.name.endsWith('.js'))out.push(p);}return out;}
const files = walk(path.join(root,'src')).concat([path.join(root,'sw.js')]);
let problems=0, count=0;
const importRe=/(?:import|export)\s+[^'"]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s*['"]([^'"]+)['"]/g;
for(const f of files){
  const src=fs.readFileSync(f,'utf8');
  let m;
  while((m=importRe.exec(src))){
    const spec=m[1]||m[2]||m[3];
    if(!spec) continue;
    if(spec.startsWith('http')||!spec.startsWith('.')){ continue; } // external/CDN
    count++;
    const resolved=path.resolve(path.dirname(f),spec);
    if(!fs.existsSync(resolved)){
      problems++;
      console.log('MISSING:',path.relative(root,f),'->',spec);
    }
    if(!spec.endsWith('.js')){
      console.log('NO .js EXT:',path.relative(root,f),'->',spec);
    }
  }
}
console.log(`\nChecked ${count} relative imports across ${files.length} files. Problems: ${problems}`);
