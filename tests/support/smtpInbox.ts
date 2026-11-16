import {createServer} from 'node:net';
import type {AddressInfo} from 'node:net';
import {once} from 'node:events';
import {setTimeout as delay} from 'node:timers/promises';

// Loopback SMTP receiver for integration tests. No message is forwarded outside the process.
export async function openSmtpInbox() {
  const messages: {to:string; content:string}[] = [];
  let rejectMail = false;
  const server = createServer(socket=>{
    let buffer = '', data = false, content = '', to = '';
    socket.on('error',()=>{});
    socket.setEncoding('utf8');
    socket.write('220 localhost SMTP test\r\n');
    socket.on('data',chunk=>{
      buffer+=chunk;
      let newline: number;
      while ((newline=buffer.indexOf('\r\n'))>=0) {
        const line=buffer.slice(0,newline); buffer=buffer.slice(newline+2);
        if (data) {
          if (line!=='.') { content+=line+'\r\n'; continue; }
          messages.push({to,content}); data=false; socket.write('250 stored\r\n');
        } else if (/^RCPT TO:/i.test(line)) {
          to=line.slice(line.indexOf(':')+1).trim(); socket.write(rejectMail?'550 rejected\r\n':'250 recipient OK\r\n');
        } else if (line==='DATA') { data=true; content=''; socket.write('354 enter message\r\n'); }
        else if (line==='QUIT') socket.end('221 bye\r\n');
        else socket.write('250 localhost\r\n');
      }
    });
  }).listen(0,'127.0.0.1');
  await once(server,'listening');
  async function link(index: number) {
    const deadline = performance.now()+5000;
    while (!messages[index] && performance.now()<deadline) await delay(10);
    if (!messages[index]) throw new Error('Aucun message reçu par SMTP.');
    const raw=messages[index].content;
    const parts=raw.split('\r\n\r\n');
    const headers=parts.shift();
    let body=parts.join('\r\n\r\n');
    if (/Content-Transfer-Encoding: base64/i.test(headers)) body=Buffer.from(body,'base64').toString('utf8');
    else body=body.replace(/=\r\n/g,'');
    const match=body.match(/https?:\/\/[^\s]+\/#company-email\/(?:reset|verify|activate)\/[a-zA-Z0-9_-]{43}/);
    if (!match) throw new Error('Lien absent du message SMTP.');
    return new URL(match[0]);
  }
  return {port:(server.address() as AddressInfo).port,messages,link,
    refuseMail(){rejectMail=true;},
    close:()=>new Promise<void>(done=>server.close(()=>done()))};
}
