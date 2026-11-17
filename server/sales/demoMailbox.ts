import {createHash,randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import type {EmailPurpose} from './companyEmail';
import {assertDemoDatabase} from './demoDatabase';

type Message={id:string;recipient:string;purpose:EmailPurpose|'unblock'|'notice';subject:string;link:string|null;token:string|null;body?:string;createdAt:number;expiresAt:number};
export class DemoMailbox {
  private db:DatabaseSync;
  private messages:Message[]=[];
  constructor(file:string) {assertDemoDatabase(file);this.db=new DatabaseSync(file,{readOnly:true});}
  async check() { /* Simulation explicitly selected by the local demo factory; no SMTP. */ }
  async sendUnblockVerification(address:string,token:string) {
    const createdAt=Date.now();
    this.messages.unshift({id:randomUUID(),recipient:address,purpose:'unblock',token,createdAt,expiresAt:createdAt+900000,
      subject:'Confirmez votre demande de déblocage',link:'/#company-email/unblock/'+token});this.messages=this.messages.slice(0,100);
  }
  async sendNotice(address:string,subject:string,body:string) {
    this.messages.unshift({id:randomUUID(),recipient:address,purpose:'notice',token:null,createdAt:Date.now(),expiresAt:0,subject,body,link:null});this.messages=this.messages.slice(0,100);
  }
  async send(address:string,token:string,purpose:EmailPurpose,_login:string) {
    const createdAt=Date.now();
    this.messages.unshift({id:randomUUID(),recipient:address,purpose,token,createdAt,expiresAt:createdAt+900000,
      subject:purpose==='verify'?'Vérification de votre adresse e-mail':purpose==='activate'?'Invitation à votre espace entreprise':'Récupération de votre mot de passe',
      link:'/#company-email/'+purpose+'/'+token});
    // The demo mailbox keeps its simulated links in memory, never in production storage or logs.
    this.messages=this.messages.slice(0,100);
  }
  list() {
    return this.messages.map(({token,...message})=>{
      if(!token)return {...message,state:'information',link:null};
      const table=message.purpose==='unblock'?'account_unblock_links':'company_email_links';
      const row=this.db.prepare('SELECT expires_at FROM '+table+' WHERE digest=?')
        .get(createHash('sha256').update(token).digest('hex'));
      const state=!row?'used':Number(row.expires_at)<=Date.now()?'expired':'valid';
      return {...message,state,link:state==='valid'?message.link:null,expiresAt:row?Number(row.expires_at):message.expiresAt};
    });
  }
  token(id:string) {return this.messages.find(message=>message.id===id)?.token;}
  clear() {this.messages=[];}
  close() {this.clear();this.db.close();}
}
