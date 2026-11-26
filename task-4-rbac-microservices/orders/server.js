const express=require('express'); const amqp=require('amqplib');
const app=express(); app.use(express.json());
const orders=[]; let channel; const queue='order.events';
async function connectBroker(){
  const url=process.env.RABBITMQ_URL||'amqp://localhost';
  while(!channel){try{const conn=await amqp.connect(url); channel=await conn.createChannel(); await channel.assertQueue(queue,{durable:true}); console.log('RabbitMQ connected');}
  catch(e){console.error('RabbitMQ not ready:',e.message); await new Promise(r=>setTimeout(r,3000));}}
}
app.get('/health',(_req,res)=>res.json({status:'ok',service:'orders',broker:!!channel}));
app.get('/orders',(_req,res)=>res.json({data:orders}));
app.post('/orders',(req,res)=>{
  const {product,quantity}=req.body||{};
  if(typeof product!=='string'||!product.trim()||!Number.isInteger(quantity)||quantity<1||quantity>10000)
    return res.status(400).json({error:'product and positive integer quantity are required'});
  const order={id:`ord-${Date.now()}`,product:product.trim(),quantity,status:'created',createdAt:new Date().toISOString()};
  orders.push(order);
  if(channel) channel.sendToQueue(queue,Buffer.from(JSON.stringify({event:'order.created',data:order})),{persistent:true});
  res.status(201).json({data:order,eventPublished:!!channel});
});
connectBroker();
app.listen(process.env.PORT||4302,()=>console.log('Orders service listening'));
