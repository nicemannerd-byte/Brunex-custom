'use strict';

const TAU=Math.PI*2;

function finite(v,fallback=0){const n=Number(v);return Number.isFinite(n)?n:fallback;}
function dist2(ax,ay,bx,by){const dx=ax-bx,dy=ay-by;return dx*dx+dy*dy;}
function normalizeAngle(a){a%=TAU;return a<0?a+TAU:a;}
function angleDiff(a,b){let d=normalizeAngle(a)-normalizeAngle(b);if(d>Math.PI)d-=TAU;if(d<-Math.PI)d+=TAU;return d;}
function pointSegmentDistance2(px,py,ax,ay,bx,by){
 const abx=bx-ax,aby=by-ay,apx=px-ax,apy=py-ay;
 const den=abx*abx+aby*aby;
 const t=den>0?Math.max(0,Math.min(1,(apx*abx+apy*aby)/den)):0;
 const x=ax+abx*t,y=ay+aby*t;
 return dist2(px,py,x,y);
}

class HeadHunter{
 constructor(){
  this.world={snakes:[],foods:[],selfId:null,timestamp:0};
  this.lastTargets=new Map();
  this.roamTargets=new Map();
 }
 updateWorld(snapshot){
  if(!snapshot||typeof snapshot!=='object')return;
  this.world={
   snakes:Array.isArray(snapshot.snakes)?snapshot.snakes:[],
   foods:Array.isArray(snapshot.foods)?snapshot.foods:[],
   selfId:snapshot.selfId==null?null:snapshot.selfId,
   timestamp:Date.now()
  };
 }
 targetFor(bot){
  const x=finite(bot.snakeX),y=finite(bot.snakeY);
  const candidates=[];
  for(const snake of this.world.snakes){
   if(!snake||snake.id==null||this.world.selfId!=null&&String(snake.id)===String(this.world.selfId))continue;
   const hx=finite(snake.x),hy=finite(snake.y);
   if(!Number.isFinite(hx)||!Number.isFinite(hy))continue;
   const pts=Array.isArray(snake.points)?snake.points:[];

   // A head is considered exposed when there is enough clearance from its
   // own body. This deliberately rejects brief/noisy one-frame openings.
   let nearestBody2=Infinity;
   for(let i=1;i<pts.length;i++){
    const p=pts[i];if(!p)continue;
    const px=finite(p.x),py=finite(p.y);
    nearestBody2=Math.min(nearestBody2,dist2(hx,hy,px,py));
   }
   const exposed=pts.length<2||nearestBody2>=180*180;
   if(!exposed)continue;

   const vx=finite(snake.vx),vy=finite(snake.vy);
   const speed=Math.hypot(vx,vy);
   const heading=Number.isFinite(Number(snake.angle))?Number(snake.angle):Math.atan2(vy,vx);
   const lead=Math.max(90,Math.min(300,140+speed*5));
   const px=hx+vx*lead;
   const py=hy+vy*lead;

   // Reject an interception line that passes too close to the target's body.
   let bodyRisk=Infinity;
   for(let i=1;i<pts.length;i++){
    const a=pts[i-1],b=pts[i];if(!a||!b)continue;
    bodyRisk=Math.min(bodyRisk,pointSegmentDistance2(px,py,finite(a.x),finite(a.y),finite(b.x),finite(b.y)));
   }
   if(bodyRisk<125*125)continue;

   const d=Math.sqrt(dist2(x,y,px,py));
   if(d>2600)continue;
   const approach=Math.abs(angleDiff(Math.atan2(py-y,px-x),heading));
   const score=(exposed?900:0)+(Math.max(0,2600-d)*0.7)+(Math.max(0,Math.PI-approach)*120)+(bodyRisk===Infinity?100:Math.min(500,Math.sqrt(bodyRisk)));
   candidates.push({score,x:px,y:py,rawX:hx,rawY:hy,distance:d,boost:d>650&&d<1900});
  }

  candidates.sort((a,b)=>b.score-a.score);
  if(candidates.length){
   const chosen=candidates[0];
   this.lastTargets.set(bot.id,chosen);
   return chosen;
  }

  // No safe head: collect nearby food, otherwise roam to a changing waypoint.
  let bestFood=null,bestFoodD=Infinity;
  for(const f of this.world.foods){
   if(!f)continue;
   const fx=finite(f.x),fy=finite(f.y),d2=dist2(x,y,fx,fy);
   if(d2<bestFoodD&&d2<1200*1200){bestFoodD=d2;bestFood={x:fx,y:fy,boost:false,food:true};}
  }
  if(bestFood){this.lastTargets.set(bot.id,bestFood);return bestFood;}

  const old=this.roamTargets.get(bot.id);
  if(old&&dist2(x,y,old.x,old.y)>300*300)return old;
  const r=700+((bot.id*193)%700);
  const a=((Date.now()/5000+bot.id*0.73)%1)*TAU;
  const roam={x:x+Math.cos(a)*r,y:y+Math.sin(a)*r,boost:false,roam:true};
  this.roamTargets.set(bot.id,roam);
  return roam;
 }
}

module.exports=HeadHunter;
