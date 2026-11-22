import {avatarSprite} from './avatar-cache.js?v=20261122-fix9';
export function drawTinyAvatarParticle(stage,person,x,y,r){stage.ctx.drawImage(avatarSprite(stage,person,r>9?96:24),x-r,y-r,r*2,r*2)}
export function prepareTinyAvatarParticles(stage,people){for(const person of people.slice(0,96))avatarSprite(stage,person,24)}