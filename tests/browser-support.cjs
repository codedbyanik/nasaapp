const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
let chromium;try{({chromium}=require('playwright'));}catch(error){if(!process.env.APPDATA)throw error;({chromium}=require(path.join(process.env.APPDATA,'npm/node_modules/playwright')));}
function launchOptions(){
 const candidates=[process.env.BROWSER_EXECUTABLE_PATH,chromium.executablePath(),process.env.PROGRAMFILES&&path.join(process.env.PROGRAMFILES,'Google/Chrome/Application/chrome.exe'),process.env['PROGRAMFILES(X86)']&&path.join(process.env['PROGRAMFILES(X86)'],'Microsoft/Edge/Application/msedge.exe')];
 const executablePath=candidates.find(p=>p&&fs.existsSync(p));return {headless:true,...(executablePath?{executablePath}:{})};
}
function assertCleanText(text){assert(!/\uFFFD|\u00c2\u00b0|\s\?\s|[A-Za-z0-9]\?[A-Za-z0-9]|\?\d|\d\?|^Loading[^\n]*\?/m.test(text),'Display text contains damaged or lost symbols');}
async function serve(root){
 const server=http.createServer((req,res)=>{let relative;try{relative=decodeURIComponent(req.url.split('?')[0]);}catch{res.writeHead(400);return res.end();}const file=path.resolve(root,'.'+(relative==='/'?'/index.html':relative));if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}fs.readFile(file,(error,data)=>{if(error){res.writeHead(404);return res.end();}res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.geojson':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg'})[path.extname(file)]||'application/octet-stream');res.end(data);});});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));return {url:'http://127.0.0.1:'+server.address().port,close:()=>new Promise(resolve=>server.close(resolve))};
}
module.exports={chromium,launchOptions,assertCleanText,serve};
