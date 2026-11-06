import React from 'react';import{createRoot}from'react-dom/client';import App from './App';import './style.css';
import {AccountGate,usePlayer} from './auth/AccountGate';import './auth/account.css';
function PlayerGame(){const {userId}=usePlayer();return <App key={userId}/>;}
createRoot(document.getElementById('root')!).render(<React.StrictMode><AccountGate><PlayerGame/></AccountGate></React.StrictMode>);
