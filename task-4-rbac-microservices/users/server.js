const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = express(); app.use(express.json());
const secret = process.env.JWT_SECRET || 'local-development-secret-change-this';
const users = [];
const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPass123!';
users.push({ id: 'u-admin', name: 'Platform Admin', email: adminEmail, passwordHash: bcrypt.hashSync(adminPassword, 10), role: 'admin' });
app.get('/health', (_req,res)=>res.json({status:'ok',service:'users'}));
app.post('/register',(req,res)=>{
  const {name,email,password}=req.body||{};
  if(typeof name!=='string'||name.trim().length<2||typeof email!=='string'||!email.includes('@')||typeof password!=='string'||password.length<8)
    return res.status(400).json({error:'Valid name, email and password (8+ chars) are required'});
  if(users.some(u=>u.email===email.toLowerCase())) return res.status(409).json({error:'Email already registered'});
  const user={id:`u-${Date.now()}-${Math.random().toString(16).slice(2,6)}`,name:name.trim(),email:email.toLowerCase(),passwordHash:bcrypt.hashSync(password,10),role:'user'};
  users.push(user); res.status(201).json({id:user.id,name:user.name,email:user.email,role:user.role});
});
app.post('/login',(req,res)=>{
  const {email,password}=req.body||{}; const user=users.find(u=>u.email===String(email||'').toLowerCase());
  if(!user||!bcrypt.compareSync(String(password||''),user.passwordHash)) return res.status(401).json({error:'Invalid credentials'});
  const token=jwt.sign({sub:user.id,email:user.email,role:user.role},secret,{expiresIn:'2h'});
  res.json({token,tokenType:'Bearer',expiresIn:'2h'});
});
app.listen(process.env.PORT||4301,()=>console.log('Users service listening'));
