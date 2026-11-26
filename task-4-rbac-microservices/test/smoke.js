// Automated endpoint verification. Run after: docker compose up --build -d
const assert = require('node:assert/strict');
const base = process.env.BASE_URL || 'http://localhost:4300';
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function waitFor(url, attempts=30) {
  for(let i=0;i<attempts;i++){try{const r=await fetch(url);if(r.ok)return;}catch{} await sleep(1000);}
  throw new Error(`Service did not become ready: ${url}`);
}
(async()=>{
  await waitFor(`${base}/health`);
  const health=await (await fetch(`${base}/health`)).json();
  assert.equal(health.status,'ok');
  const noAuth=await fetch(`${base}/api/orders`);
  assert.equal(noAuth.status,401,'orders route must require authentication');
  const login=await fetch(`${base}/api/auth/login`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'admin@example.com',password:'AdminPass123!'})});
  assert.equal(login.status,200);
  const {token}=await login.json(); assert.ok(token);
  const order=await fetch(`${base}/api/orders`,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${token}`},body:JSON.stringify({product:'Test Product',quantity:2})});
  assert.equal(order.status,201);
  const body=await order.json(); assert.equal(body.data.product,'Test Product');
  console.log('PASS: gateway health, unauthenticated denial, admin login and authenticated order creation');
})().catch(err=>{console.error('FAIL:',err);process.exit(1);});
