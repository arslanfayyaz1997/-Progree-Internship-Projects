const express=require('express'); const helmet=require('helmet'); const rateLimit=require('express-rate-limit'); const jwt=require('jsonwebtoken');
const app=express(); app.use(helmet()); app.use(express.json()); app.use(rateLimit({windowMs:60000,limit:120}));
const secret=process.env.JWT_SECRET||'local-development-secret-change-this';
const users=process.env.USERS_URL||'http://localhost:4301'; const orders=process.env.ORDERS_URL||'http://localhost:4302';
async function forward(url,req,res){
  try{const response=await fetch(url,{method:req.method,headers:{'content-type':'application/json'},body:['GET','HEAD'].includes(req.method)?undefined:JSON.stringify(req.body)});
  const body=await response.text(); res.status(response.status).type(response.headers.get('content-type')||'application/json').send(body);}
  catch(e){res.status(502).json({error:'Upstream service unavailable',detail:e.message});}
}
function authenticate(req,res,next){
  const h=req.headers.authorization||''; if(!h.startsWith('Bearer ')) return res.status(401).json({error:'Bearer token required'});
  try{req.user=jwt.verify(h.slice(7),secret); next();}catch{return res.status(401).json({error:'Invalid or expired token'});}
}
function authorize(...roles){return (req,res,next)=>{if(!roles.includes(req.user.role))return res.status(403).json({error:'Insufficient role'});next();};}
app.get('/health',(_req,res)=>res.json({status:'ok',service:'gateway'}));
app.post('/api/auth/register',(req,res)=>forward(`${users}/register`,req,res));
app.post('/api/auth/login',(req,res)=>forward(`${users}/login`,req,res));
app.get('/api/admin/users',authenticate,authorize('admin'),(_req,res)=>res.json({message:'Admin-only route',note:'Connect a persistent user repository to list user records.'}));
app.get('/api/orders',authenticate,(req,res)=>forward(`${orders}/orders`,req,res));
app.post('/api/orders',authenticate,authorize('user','admin'),(req,res)=>forward(`${orders}/orders`,req,res));
app.listen(process.env.PORT||4300,()=>console.log('API Gateway listening'));
