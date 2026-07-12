/* particle fog / embers */
const cv=document.getElementById('fog'),ctx=cv.getContext('2d');
let W,H,parts=[];
function size(){const s=document.getElementById('stage').getBoundingClientRect();
  cv.width=W=s.width;cv.height=H=s.height;}
size();addEventListener('resize',size);
function seed(){parts=[];for(let i=0;i<70;i++)parts.push({
  x:Math.random()*W,y:Math.random()*H,r:.6+Math.random()*2.2,
  vy:-.15-Math.random()*.5,vx:(Math.random()-.5)*.25,
  a:.1+Math.random()*.5,c:Math.random()<.3?'255,70,85':'47,232,200'});}
seed();
function loop(){ctx.clearRect(0,0,W,H);
  for(const p of parts){p.x+=p.vx;p.y+=p.vy;if(p.y<-6){p.y=H+6;p.x=Math.random()*W;}
    ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,7);ctx.fillStyle='rgba('+p.c+','+p.a+')';
    ctx.shadowBlur=10;ctx.shadowColor='rgba('+p.c+',.8)';ctx.fill();}
  requestAnimationFrame(loop);}
loop();

/* light the ladder rungs in sequence, mark RADIANT red */
const rungs=[...document.querySelectorAll('#ladder .rung')];
function runLadder(){
  rungs.forEach((r,i)=>{r.classList.remove('lit','top');
    setTimeout(()=>{r.classList.add('lit');
      if(i===rungs.length-1){r.classList.remove('lit');r.classList.add('top');}
    }, 4200 + i*260);});
}
function restart(){
  const s=document.getElementById('stage');
  s.querySelectorAll('.grid,.scan,.hud,.ladder,.name,.role,.ascend,.tag,.mark,.u')
    .forEach(el=>{el.style.animation='none';el.offsetHeight;el.style.animation='';});
  runLadder();
}
const rb=document.querySelector('.replay'); if(rb) rb.addEventListener('click',restart);
runLadder();
setInterval(runLadder, 9000); /* keep in sync with --dur */
