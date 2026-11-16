import nodemailer from 'nodemailer';
import {validAddress, type EmailPurpose} from './companyEmail';

export const mailUnavailable = 'La récupération par e-mail est indisponible. Contactez le responsable de la plateforme.';
const loopback = (host: string) => ['localhost','127.0.0.1','::1','[::1]'].includes(host);

export function configureMail(testMode: boolean) {
  const prefix = testMode ? 'TMS_TEST_' : 'TMS_';
  const env = (name: string) => process.env[prefix+name];
  const host = env('SMTP_HOST')?.trim();
  const from = env('SMTP_FROM')?.trim() ?? '';
  const port = Number(env('SMTP_PORT') || 587);
  const secure = env('SMTP_SECURE') ?? String(port===465);
  const user = env('SMTP_USER'), pass = env('SMTP_PASS');
  if (!host || !validAddress(from) || !Number.isInteger(port) || port<1 || port>65535 ||
    !['true','false'].includes(secure) || Boolean(user)!==Boolean(pass)) return null;
  let origin: URL;
  try { origin = new URL(env('PUBLIC_URL') || (testMode ? 'http://127.0.0.1:3010' : '')); }
  catch { return null; }
  const localHttp = process.env.NODE_ENV !== 'production' && loopback(origin.hostname) && origin.protocol==='http:';
  if ((origin.protocol!=='https:' && !localHttp) || origin.username || origin.password || origin.pathname!=='/' ||
    origin.search || origin.hash || (testMode && !loopback(origin.hostname))) return null;
  const localRelay = loopback(host) && !user && process.env.NODE_ENV !== 'production';
  const transport = nodemailer.createTransport({
    host, port, secure:secure==='true', requireTLS:secure==='false' && !localRelay,
    auth:user ? {user,pass} : undefined, logger:false, debug:false,
    connectionTimeout:10000, greetingTimeout:10000, socketTimeout:15000,
    disableFileAccess:true, disableUrlAccess:true,tls:{minVersion:'TLSv1.2'},
  });
  return {
    async check() {await transport.verify();},
    async send(address: string, token: string, purpose: EmailPurpose, login: string) {
      const verification = purpose==='verify';
      const subject = verification ? 'Vérifiez votre adresse e-mail' : purpose==='activate' ? 'Activez votre accès entreprise' : 'Réinitialisez votre mot de passe';
      // The fragment stays in the browser until the user explicitly submits the form.
      const link = origin.origin + '/#company-email/' + purpose + '/' + token;
      const info = await transport.sendMail({from:{name:'TMS/DMS Delivery',address:from},to:{name:'',address},
        subject:'TMS/DMS Delivery – '+subject,
        text:subject+' dans TMS/DMS Delivery en ouvrant ce lien personnel :\n\n'+link+
          '\n\nVotre adresse de connexion : '+address+'.'+
          '\n\nLe lien est valable 15 minutes et utilisable une seule fois. Si vous ne reconnaissez pas cette demande, ignorez ce message.'});
      if (!info.accepted?.length) throw new Error('Message refusé par le serveur SMTP.');
    },
  };
}
