/* diagrams.js · Small flat drawings for the practice panel, as SVG markup.
   turn(letter,n): the front face as a 3×3 grid with an arrow for the turn, the way beginner guides draw them. You look
     at the front face: U moves the top row to the left, D the bottom row to the right, R the right column up, L the left
     column down, F turns the face clockwise; B (the face behind) is drawn dashed, as seen through the cube. The middle
     layers move the middle row or column (M like L, E like D; S like F, a small circle), two layers (r or Rw…) have
     two arrows, and the whole cube (x like R, y like U, z like F) has an arrow on every row or column or a big circle.
   top(g): the face on top seen from above, with the stickers of the four sides around it. g = {top:[9], back:[3],
     front:[3], left:[3], right:[3]}, colors as CSS text; top goes row by row from the back, the strips from left to right
     (back and front) or from the back to the front (left and right).
   It knows nothing about the cube or the interface. Exposes a single global object: DIAGRAMS. */
const DIAGRAMS=(function(){
const S=40,A=6,C=28/3;              // size, grid margin, cell
const at=i=>A+C*(i+0.5);            // center of row or column i
const grid=()=>{
  let d='M'+A+' '+A+'h28v28h-28z';
  for(const i of [1,2])d+='M'+(A+C*i)+' '+A+'v28M'+A+' '+(A+C*i)+'h28';
  return '<path class="grid" d="'+d+'"/>';
};
// Arrowhead with its tip at (x,y), pointing along (dx,dy)
const HL=6.5,HW=4.3;
// (k: size, smaller for the small circle of S)
const head=(x,y,dx,dy,k=1)=>{
  const l=Math.hypot(dx,dy),ux=dx/l,uy=dy/l,hl=HL*k,hw=HW*k;
  const p=[[x,y],[x-ux*hl+uy*hw,y-uy*hl-ux*hw],[x-ux*hl-uy*hw,y-uy*hl+ux*hw]];
  return '<path class="head" d="M'+p.map(q=>q.map(v=>v.toFixed(2)).join(' ')).join('L')+'z"/>';
};
// Straight arrow from (x1,y1) to (x2,y2); twice: a second head behind the first one (half turn)
function straight(x1,y1,x2,y2,twice){
  const dx=x2-x1,dy=y2-y1,l=Math.hypot(dx,dy),ux=dx/l,uy=dy/l;
  let s='<path class="arrow" d="M'+x1.toFixed(2)+' '+y1.toFixed(2)+'L'+(x2-ux*5).toFixed(2)+' '+(y2-uy*5).toFixed(2)+'"/>'+head(x2,y2,dx,dy);
  if(twice)s+=head(x2-ux*5.5,y2-uy*5.5,dx,dy);
  return s;
}
// Round arrow around the center, as in the guides: it starts on top and goes clockwise around to the left side,
// where its head points up (mirrored: counter-clockwise, ending on the right side); dashed for the face behind
// (r: radius; tip: false draws only the arc, for the inner ring of two layers)
function round(mirrored,twice,dashed,r=9.5,tip=true){
  const deg=Math.PI/180,pt=a=>[20+r*Math.cos(a*deg),20+r*Math.sin(a*deg)];
  // angles on the screen (y goes down): 0 right, 90 bottom, 180 left, 270 top; clockwise = growing angle
  const a0=-95,a1=165,end=a1-22;
  const [x0,y0]=pt(a0),[x1,y1]=pt(end);
  const k=r<8?0.8:1,headAt=(a,back)=>{const [x,y]=pt(a),t=(a-back)*deg;return head(x,y,-Math.sin(t),Math.cos(t),k);};
  let s='<path class="arrow'+(dashed?' dashed':'')+'" d="M'+x0.toFixed(2)+' '+y0.toFixed(2)+'A'+r+' '+r+' 0 1 1 '+x1.toFixed(2)+' '+y1.toFixed(2)+'"/>';
  if(tip){s+=headAt(a1,18);if(twice)s+=headAt(a1-30,18);}
  return mirrored?'<g transform="matrix(-1 0 0 1 '+S+' 0)">'+s+'</g>':s;
}
const LO=A+3,HI=S-A-3;
// An arrow along column i (up or down) or along row i (to the left or to the right)
const col=(i,up,two)=>up?straight(at(i),HI,at(i),LO,two):straight(at(i),LO,at(i),HI,two);
const row=(i,left,two)=>left?straight(HI,at(i),LO,at(i),two):straight(LO,at(i),HI,at(i),two);
const many=(fn,list,dir,two)=>list.map(i=>fn(i,dir,two)).join('');
// letter: a turn as you look at the cube (R, M, r or Rw, x…); n: 1 clockwise, -1 counter-clockwise, 2 half turn
function turn(letter,n){
  const back=n===-1,two=n===2;
  // Rw is the same as r
  if(letter.length===2&&letter[1]==='w')letter=letter[0].toLowerCase();
  let s;
  switch(letter){
    case 'U':s=row(0,!back,two);break;
    case 'D':s=row(2,back,two);break;
    case 'R':s=col(2,!back,two);break;
    case 'L':s=col(0,back,two);break;
    case 'F':s=round(back,two,false);break;
    // seen from the front, B turns the other way
    case 'B':s=round(!back,two,true);break;
    // middle layers: M like L, E like D, S like F (the slice behind the front face: a small circle)
    case 'M':s=col(1,back,two);break;
    case 'E':s=row(1,back,two);break;
    case 'S':s=round(back,two,false,6.5);break;
    // two layers: the face and the middle one
    case 'u':s=many(row,[0,1],!back,two);break;
    case 'd':s=many(row,[1,2],back,two);break;
    case 'r':s=many(col,[1,2],!back,two);break;
    case 'l':s=many(col,[0,1],back,two);break;
    case 'f':s=round(back,two,false)+round(back,false,false,5,false);break;
    case 'b':s=round(!back,two,true)+round(!back,false,true,5,false);break;
    // the whole cube
    case 'x':s=many(col,[0,1,2],!back,two);break;
    case 'y':s=many(row,[0,1,2],!back,two);break;
    case 'z':s=round(back,two,false,15);break;
    default:s='';
  }
  return '<svg class="turn-pic" viewBox="0 0 '+S+' '+S+'" aria-hidden="true">'+grid()+s+'</svg>';
}
// The face on top from above, with the side stickers around it
function top(g){
  const Q=12,O=12,T=4.5,G=1.5;
  const cell=(x,y,w,h,c)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="1.6" fill="'+c+'"/>';
  let s='';
  for(let r=0;r<3;r++)for(let c=0;c<3;c++)s+=cell(O+c*Q+0.6,O+r*Q+0.6,Q-1.2,Q-1.2,g.top[r*3+c]);
  for(let i=0;i<3;i++){
    s+=cell(O+i*Q+0.6,O-G-T,Q-1.2,T,g.back[i]);
    s+=cell(O+i*Q+0.6,O+3*Q+G,Q-1.2,T,g.front[i]);
    s+=cell(O-G-T,O+i*Q+0.6,T,Q-1.2,g.left[i]);
    s+=cell(O+3*Q+G,O+i*Q+0.6,T,Q-1.2,g.right[i]);
  }
  return '<svg class="top-pic" viewBox="0 0 60 60" aria-hidden="true">'+s+'</svg>';
}
return {turn,top};
})();
