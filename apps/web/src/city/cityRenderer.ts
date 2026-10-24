import type {Building,CityLayout} from '../data/types';
export const project=(x:number,y:number,h=0):[number,number]=>[490+(x-y)*27,180+(x+y)*13.5-h];
export const shade=(hex:string,n:number)=>{const v=parseInt(hex.slice(1),16);return `rgb(${(v>>16)*n},${((v>>8)&255)*n},${(v&255)*n})`;};
export function polygon(c:CanvasRenderingContext2D,pts:number[][],fill:string,stroke?:string){c.beginPath();pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.stroke();}}
export function prism(c:CanvasRenderingContext2D,b:Building){const {x,y,w,d,h,color}=b;const p=project(x,y),a=project(x+w,y),z=project(x+w,y+d),v=project(x,y+d);c.save();c.shadowColor='rgba(20,30,35,.14)';c.shadowBlur=9;c.shadowOffsetX=9;c.shadowOffsetY=7;polygon(c,[p,a,z,v],'#61736e');c.restore();polygon(c,[v,z,[z[0],z[1]-h],[v[0],v[1]-h]],shade(color,.82));polygon(c,[a,z,[z[0],z[1]-h],[a[0],a[1]-h]],shade(color,.65));polygon(c,[[p[0],p[1]-h],[a[0],a[1]-h],[z[0],z[1]-h],[v[0],v[1]-h]],color,'rgba(255,255,255,.15)');
 if(b.kind==='pyramid'){const peak=project(x+w/2,y+d/2,h+65);polygon(c,[[v[0],v[1]-h],[z[0],z[1]-h],peak],'#f4eee0');polygon(c,[[a[0],a[1]-h],[z[0],z[1]-h],peak],'#c5c4ba');}
 if(b.kind==='salesforce'){c.fillStyle='#d2e0de';c.beginPath();c.ellipse((p[0]+z[0])/2,(p[1]+z[1])/2-h,16,8,0,Math.PI,Math.PI*2);c.fill();for(let i=10;i<h-10;i+=9){c.strokeStyle='rgba(62,105,126,.18)';c.beginPath();c.moveTo(a[0]+2,a[1]-i);c.lineTo(z[0]-2,z[1]-i);c.stroke();}}
 if(b.kind==='coit'||b.kind==='ferry'){prism(c,{...b,x:x+.12,y:y+.12,w:w-.24,d:d-.24,h:h+14,kind:'normal',color:'#eee4c8'});}
 if(b.kind==='house'){const ridge=project(x+w/2,y+d/2,h+7);polygon(c,[[p[0],p[1]-h],[a[0],a[1]-h],ridge],shade(color,1.06));polygon(c,[[a[0],a[1]-h],[z[0],z[1]-h],ridge],shade(color,.94));}
}
export function renderStatic(c:CanvasRenderingContext2D,layout:CityLayout){
 c.clearRect(0,0,1080,800);c.save();c.shadowColor='rgba(80,144,162,.23)';c.shadowBlur=60;c.fillStyle='#414e50';c.beginPath();c.ellipse(505,468,475,248,0,0,Math.PI*2);c.fill();c.restore();
 c.fillStyle='#667a7a';c.beginPath();c.ellipse(505,451,475,246,0,0,Math.PI*2);c.fill();
 c.save();c.beginPath();c.ellipse(505,431,475,246,0,0,Math.PI*2);c.clip();const water=c.createLinearGradient(120,180,700,650);water.addColorStop(0,'#719eb5');water.addColorStop(1,'#4e819c');c.fillStyle=water;c.fillRect(0,0,1080,800);
 for(let i=0;i<70;i++){c.strokeStyle='rgba(222,242,244,.05)';c.beginPath();c.moveTo(50,205+i*7);c.lineTo(950,205+i*7);c.stroke();}
 const coast=[[0,9],[3,9],[4,7],[6,8],[8,6],[8,3],[10,2],[11,-3],[22,-2],[22,18],[-4,19],[-4,12]].map(([x,y])=>project(x,y));polygon(c,coast,'#acb49a');
 // Cream shoreline and toy-model street grid.
 c.strokeStyle='#e7e4d7';c.lineWidth=10;c.lineJoin='round';c.beginPath();coast.slice(0,8).forEach((p,i)=>i?c.lineTo(...p as [number,number]):c.moveTo(...p as [number,number]));c.stroke();
 c.save();c.beginPath();coast.forEach((p,i)=>i?c.lineTo(...p as [number,number]):c.moveTo(...p as [number,number]));c.closePath();c.clip();
 for(const n of [0,4,8,12,16,20]){for(const axis of [0,1]){const a=axis?project(-4,n):project(n,-5),b=axis?project(23,n):project(n,21);c.strokeStyle='#d4d4c8';c.lineWidth=16;c.beginPath();c.moveTo(...a);c.lineTo(...b);c.stroke();c.strokeStyle='#737e79';c.lineWidth=8;c.stroke();c.strokeStyle='rgba(239,235,213,.6)';c.lineWidth=.6;c.setLineDash([4,6]);c.stroke();c.setLineDash([]);}}
 for(const park of layout.parks){polygon(c,[project(park.x,park.y),project(park.x+2,park.y),project(park.x+2,park.y+2),project(park.x,park.y+2)],'#7f9a77');for(let i=0;i<8;i++){const [x,y]=project(park.x+(i%3)*.6,park.y+Math.floor(i/3)*.6);c.fillStyle='#546d4f';c.beginPath();c.ellipse(x,y-5,5,7,0,0,7);c.fill();}}
 c.restore();
 // Marin headlands: soft rounded hills above the bridge.
 c.fillStyle='#adb59a';c.beginPath();c.ellipse(238,262,146,58,-.22,0,7);c.fill();c.fillStyle='#bac1a6';c.beginPath();c.ellipse(310,237,85,44,.2,0,7);c.fill();
 // Alcatraz miniature island.
 c.fillStyle='#c6c6ab';c.beginPath();c.ellipse(481,307,28,12,-.25,0,7);c.fill();prism(c,{id:'alcatraz',x:4.5,y:4.8,w:.7,d:.3,h:9,color:'#c5bfae',district:'Marina',kind:'normal',name:'Alcatraz'});
 c.restore();
 // Golden Gate: international-orange deck, towers, main suspension cable and hangers.
 const a=[134,370],b=[440,244];c.save();c.shadowColor='rgba(28,48,61,.2)';c.shadowBlur=8;c.shadowOffsetY=20;c.strokeStyle='#cc7958';c.lineWidth=13;c.beginPath();c.moveTo(...a as [number,number]);c.lineTo(...b as [number,number]);c.stroke();c.restore();
 const at=(t:number)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];for(const t of [.23,.77]){const p=at(t);c.fillStyle='#e6a17c';c.fillRect(p[0]-6,p[1]-78,10,89);c.fillStyle='#b66e51';c.fillRect(p[0]+4,p[1]-76,4,87);for(let k=0;k<4;k++){c.fillStyle='#ad7154';c.fillRect(p[0]-3,p[1]-68+k*16,4,9);}}
 c.strokeStyle='#efbc92';c.lineWidth=1.6;c.beginPath();c.moveTo(...a as [number,number]);const t1=at(.23),t2=at(.77);c.quadraticCurveTo(t1[0]-30,t1[1]-10,t1[0],t1[1]-78);c.quadraticCurveTo((t1[0]+t2[0])/2,(t1[1]+t2[1])/2+12,t2[0],t2[1]-78);c.quadraticCurveTo(t2[0]+30,t2[1]-10,b[0],b[1]);c.stroke();for(let i=1;i<24;i++){let t=i/24,p=at(t);let h=t<.23?78*t/.23:t>.77?78*(1-t)/.23:20+58*Math.pow((t-.5)/.27,2);c.strokeStyle='rgba(239,188,146,.7)';c.lineWidth=.7;c.beginPath();c.moveTo(p[0],p[1]);c.lineTo(p[0],p[1]-h);c.stroke();}
 for(const building of layout.buildings)prism(c,building);
}
