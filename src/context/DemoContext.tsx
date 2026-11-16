import {createContext,useContext} from 'react';

export const DemoContext=createContext(false);
export const useDemoMode=()=>useContext(DemoContext);
export const deliveryNotice=(demo:boolean)=>demo?'Message simulé disponible dans la boîte de réception démo.':'Le serveur SMTP a accepté le message.';
