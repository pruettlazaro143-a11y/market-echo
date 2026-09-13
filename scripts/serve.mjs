import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {AiError,endpoints,explain} from '../server/ai.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.csv':'text/csv; charset=utf-8','.png':'image/png'};
const security={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; worker-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",'Referrer-Policy':'no-referrer'};
let active=false;const calls=[];
function json(res,status,value){res.writeHead(status,{...security,'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(value));}
const server=http.createServer(async(req,res)=>{
 try{
  const allowed=[`127.0.0.1:${req.socket.localPort}`,`localhost:${req.socket.localPort}`];
  if(!allowed.includes(req.headers.host)){json(res,403,{error:'ORIGIN_DENIED'});return;}
  const url=new URL(req.url,'http://'+req.headers.host);
  if(url.pathname==='/api/config'&&req.method==='GET'){json(res,200,{ai:true,endpoints:endpoints()});return;}
  if(url.pathname==='/api/explain'){
   if(req.method!=='POST'){json(res,405,{error:'METHOD_DENIED'});return;}
   if(req.headers.origin!==url.origin||!req.headers['content-type']?.startsWith('application/json')){json(res,403,{error:'ORIGIN_DENIED'});return;}
   while(calls[0]<Date.now()-60000)calls.shift();
   if(active||calls.length>=5){json(res,429,{error:'AI_LOCAL_LIMIT'});return;}
   active=true;calls.push(Date.now());
   try{const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>24000)throw new AiError('AI_REQUEST_TOO_LARGE',413);chunks.push(chunk);}
    let body;try{body=JSON.parse(Buffer.concat(chunks).toString());}catch{throw new AiError('AI_REQUEST_INVALID');}
    json(res,200,await explain(body));
   }catch(error){json(res,error instanceof AiError?error.status:500,{error:error instanceof AiError?error.code:'AI_INTERNAL_ERROR'});}finally{active=false;}return;
  }
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  const pathname=decodeURIComponent(url.pathname),relative=pathname==='/'?'web/index.html':pathname.replace(/^\//,'');
  if(!/^(web|lib|examples)\//.test(relative)||relative.split('/').some(p=>p==='..'||p.startsWith('.'))){res.writeHead(404);res.end();return;}
  const file=path.resolve(root,relative);if(!file.startsWith(root)||!(await stat(file)).isFile())throw Error();
  const data=await readFile(file);res.writeHead(200,{...security,'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(req.method==='HEAD'?undefined:data);
 }catch{if(!res.headersSent){res.writeHead(404);res.end('Not found');}}
});
server.requestTimeout=60000;server.headersTimeout=10000;
server.listen(Number(process.env.PORT||4173),'127.0.0.1',()=>console.log(`Market Echo: http://127.0.0.1:${server.address().port}`));
