import assert from 'node:assert/strict';
import express from 'express';
import session from 'express-session';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import QRCode from 'qrcode';
import {openDb,one,all,run,transaction} from './db.js';
import {interactionRoutes} from './interactions.js';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'lucky-interaction-regression-'));
await openDb(dir);
run("INSERT INTO giveaways(id,video_id,title,status,source_mode,signup_token,overlay_token,presentation_json) VALUES(1,'local','QA','ready','custom','qa-signup-token','qa-screen-token','{}')");
const app=express();app.use(express.json());app.use(session({secret:'qa-interaction-test-session-only',resave:false,saveUninitialized:false}));
interactionRoutes(app,{auth:(req,res,next)=>next(),csrf:(req,res,next)=>next(),one,all,run,transaction,QRCode,port:0});
const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
const base='http://127.0.0.1:'+server.address().port;
async function request(route,body){const response=await fetch(base+route,{method:body?'POST':'GET',headers:body?{'content-type':'application/json'}:{},body:body?JSON.stringify(body):undefined});return {status:response.status,body:await response.json()}}
try{
 assert.equal((await request('/api/interact/1?token=qa-signup-token')).status,200);
 assert.equal((await request('/api/interact/1?token=invalid')).status,403);
 const campaign=await request('/api/miniapp/campaign/1');assert.equal(campaign.body.token,'qa-signup-token');
 const heart=await request('/api/interact/1?token=qa-signup-token',{kind:'like'});assert.equal(heart.status,201,JSON.stringify(heart));assert.equal(heart.body.likes,1);
 const blessing=await request('/api/miniapp/blessing/1',{token:campaign.body.token,text:'QA blessing',name:'QA viewer'});assert.equal(blessing.status,201);
 const snapshot=await request('/api/interact/1?token=qa-signup-token');assert(snapshot.body.events.some(event=>event.kind==='like'));assert(snapshot.body.events.some(event=>event.text==='QA blessing'));
 assert.equal((await request('/api/miniapp/blessing/1',{token:'invalid',text:'must reject'})).status,403);
 run("UPDATE giveaways SET status='drawn' WHERE id=1");
 assert.equal((await request('/api/miniapp/campaign/1')).status,200);
 assert.equal((await request('/api/miniapp/blessing/1',{token:'qa-signup-token',text:'closed'})).status,409);
 console.log('PASS: interaction GET, legacy trial token, legacy heart, message-to-screen, invalid tokens and closed activities.');
}finally{await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true});}
