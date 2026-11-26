const amqp = require('amqplib');
const fs = require('node:fs');
const path = require('node:path');
const queue = 'order.events';
const logFile = process.env.EVENT_LOG || '/data/processed-events.jsonl';
async function start() {
  while (true) {
    try {
      const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
      connection.on('error', err => console.error('RabbitMQ connection error:', err.message));
      const channel = await connection.createChannel();
      await channel.assertQueue(queue, { durable: true });
      channel.prefetch(10);
      fs.mkdirSync(path.dirname(logFile), { recursive: true });
      console.log(`Event worker consuming ${queue}`);
      channel.consume(queue, message => {
        if (!message) return;
        try {
          const event = JSON.parse(message.content.toString());
          fs.appendFileSync(logFile, JSON.stringify({ receivedAt: new Date().toISOString(), event }) + '\\n');
          console.log('Processed event:', event.event || 'unknown');
          channel.ack(message);
        } catch (err) {
          console.error('Invalid event; rejecting:', err.message);
          channel.nack(message, false, false);
        }
      }, { noAck: false });
      return;
    } catch (err) {
      console.error('Worker waiting for RabbitMQ:', err.message);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
}
start().catch(err => { console.error(err); process.exit(1); });
