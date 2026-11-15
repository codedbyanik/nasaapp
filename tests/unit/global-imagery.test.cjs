const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {plan}=require('../../src/terrain/imagery.js'),root=path.resolve(__dirname,'../..'),meta=JSON.parse(fs.readFileSync(path.join(root,'data/processed/imagery/global_ctx_manifest.json'),'utf8'));
for(const [name,bbox] of Object.entries(meta.presets)){
 const p=plan(bbox);assert(p.tiles.length>0&&p.tiles.length<=64);assert(p.resolution*Math.PI/180*3396190>100,'Broad-region texture must not pretend to use native 5 m pixels');
 for(const t of p.tiles){const record=meta.tiles[[t.level,t.row,t.col].join('_')];assert(record,name+' demo tile must be cached');const bytes=fs.readFileSync(path.join(root,'data/processed/imagery',record.file));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),record.sha256);assert.equal(bytes.readUInt32BE(16),512);assert.equal(bytes.readUInt32BE(20),512);}
}
const seam=plan({lat0:-3,lat1:3,lon0:-183,lon1:-177});assert(seam.tiles.some(t=>t.west<-180));assert(seam.tiles.every(t=>t.col>=0&&t.col<2**(t.level+1)));assert(seam.tiles.some(t=>t.col===0)&&seam.tiles.some(t=>t.col===2**(t.level+1)-1));
for(const b of [{lat0:0,lat1:0,lon0:0,lon1:2},{lat0:-90,lat1:-80,lon0:0,lon1:2},{lat0:0,lat1:2,lon0:0,lon1:100}])assert.throws(()=>plan(b));
console.log('Global CTX checks passed: cached preset coverage, PNG dimensions, hashes, source/display resolution and longitude wrap.');
