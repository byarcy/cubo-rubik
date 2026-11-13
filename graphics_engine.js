/* graphics_engine.js · Custom 3D engine (WebGL) and scene.
   1) M3: math (vectors, quaternions, matrices), geometries, materials, cameras, raycast and drawing.
   2) GraphicsEngine: the scene of pieces with stickers, the view (turning the whole thing) and the rendering.
   It knows nothing about the cube's rules: it receives positions, colors and angles. */
/* M3 · minimal 3D engine on WebGL for Rubik's Cube (byarcy).
   Only what the app uses: math, scene, meshes, lights, raycast and render.
   No dependencies; the API follows the names of Three.js so the code feels familiar. */
(function(root){
'use strict';
const EPS=Number.EPSILON,DEG=Math.PI/180;
const NormalBlending=1,AdditiveBlending=2,FrontSide=0,DoubleSide=2;

// ---------- Math ----------
class Vector2{constructor(x=0,y=0){this.x=x;this.y=y;}set(x,y){this.x=x;this.y=y;return this;}}
class Vector3{
  constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
  setScalar(s){this.x=this.y=this.z=s;return this;}
  setComponent(i,v){if(i===0)this.x=v;else if(i===1)this.y=v;else this.z=v;return this;}
  getComponent(i){return i===0?this.x:i===1?this.y:this.z;}
  clone(){return new Vector3(this.x,this.y,this.z);}
  copy(v){this.x=v.x;this.y=v.y;this.z=v.z;return this;}
  add(v){this.x+=v.x;this.y+=v.y;this.z+=v.z;return this;}
  addVectors(a,b){this.x=a.x+b.x;this.y=a.y+b.y;this.z=a.z+b.z;return this;}
  addScaledVector(v,s){this.x+=v.x*s;this.y+=v.y*s;this.z+=v.z*s;return this;}
  sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this;}
  subVectors(a,b){this.x=a.x-b.x;this.y=a.y-b.y;this.z=a.z-b.z;return this;}
  multiplyScalar(s){this.x*=s;this.y*=s;this.z*=s;return this;}
  divideScalar(s){return this.multiplyScalar(1/s);}
  negate(){this.x=-this.x;this.y=-this.y;this.z=-this.z;return this;}
  round(){this.x=Math.round(this.x);this.y=Math.round(this.y);this.z=Math.round(this.z);return this;}
  dot(v){return this.x*v.x+this.y*v.y+this.z*v.z;}
  lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z;}
  length(){return Math.sqrt(this.lengthSq());}
  normalize(){return this.divideScalar(this.length()||1);}
  setLength(l){return this.normalize().multiplyScalar(l);}
  distanceToSquared(v){const dx=this.x-v.x,dy=this.y-v.y,dz=this.z-v.z;return dx*dx+dy*dy+dz*dz;}
  distanceTo(v){return Math.sqrt(this.distanceToSquared(v));}
  cross(v){return this.crossVectors(this,v);}
  crossVectors(a,b){const ax=a.x,ay=a.y,az=a.z,bx=b.x,by=b.y,bz=b.z;this.x=ay*bz-az*by;this.y=az*bx-ax*bz;this.z=ax*by-ay*bx;return this;}
  lerp(v,t){this.x+=(v.x-this.x)*t;this.y+=(v.y-this.y)*t;this.z+=(v.z-this.z)*t;return this;}
  lerpVectors(a,b,t){this.x=a.x+(b.x-a.x)*t;this.y=a.y+(b.y-a.y)*t;this.z=a.z+(b.z-a.z)*t;return this;}
  equals(v){return v.x===this.x&&v.y===this.y&&v.z===this.z;}
  applyQuaternion(q){
    const x=this.x,y=this.y,z=this.z,qx=q.x,qy=q.y,qz=q.z,qw=q.w;
    const ix=qw*x+qy*z-qz*y,iy=qw*y+qz*x-qx*z,iz=qw*z+qx*y-qy*x,iw=-qx*x-qy*y-qz*z;
    this.x=ix*qw+iw*-qx+iy*-qz-iz*-qy;this.y=iy*qw+iw*-qy+iz*-qx-ix*-qz;this.z=iz*qw+iw*-qz+ix*-qy-iy*-qx;return this;
  }
  applyAxisAngle(axis,a){return this.applyQuaternion(_qa.setFromAxisAngle(axis,a));}
  applyMatrix4(m){
    const x=this.x,y=this.y,z=this.z,e=m.elements,w=1/(e[3]*x+e[7]*y+e[11]*z+e[15]);
    this.x=(e[0]*x+e[4]*y+e[8]*z+e[12])*w;this.y=(e[1]*x+e[5]*y+e[9]*z+e[13])*w;this.z=(e[2]*x+e[6]*y+e[10]*z+e[14])*w;return this;
  }
  transformDirection(m){const x=this.x,y=this.y,z=this.z,e=m.elements;this.x=e[0]*x+e[4]*y+e[8]*z;this.y=e[1]*x+e[5]*y+e[9]*z;this.z=e[2]*x+e[6]*y+e[10]*z;return this.normalize();}
  project(cam){return this.applyMatrix4(cam.matrixWorldInverse).applyMatrix4(cam.projectionMatrix);}
  unproject(cam){return this.applyMatrix4(cam.projectionMatrixInverse).applyMatrix4(cam.matrixWorld);}
  setFromMatrixPosition(m){const e=m.elements;this.x=e[12];this.y=e[13];this.z=e[14];return this;}
  fromBufferAttribute(a,i){this.x=a.getX(i);this.y=a.getY(i);this.z=a.getZ(i);return this;}
  fromArray(a,o=0){this.x=a[o];this.y=a[o+1];this.z=a[o+2];return this;}
  toArray(a=[],o=0){a[o]=this.x;a[o+1]=this.y;a[o+2]=this.z;return a;}
}
class Quaternion{
  constructor(x=0,y=0,z=0,w=1){this.x=x;this.y=y;this.z=z;this.w=w;}
  set(x,y,z,w){this.x=x;this.y=y;this.z=z;this.w=w;return this;}
  clone(){return new Quaternion(this.x,this.y,this.z,this.w);}
  copy(q){this.x=q.x;this.y=q.y;this.z=q.z;this.w=q.w;return this;}
  identity(){return this.set(0,0,0,1);}
  setFromAxisAngle(a,ang){const h=ang/2,s=Math.sin(h);this.x=a.x*s;this.y=a.y*s;this.z=a.z*s;this.w=Math.cos(h);return this;}
  setFromRotationMatrix(m){
    const t=m.elements,m11=t[0],m12=t[4],m13=t[8],m21=t[1],m22=t[5],m23=t[9],m31=t[2],m32=t[6],m33=t[10],tr=m11+m22+m33;
    if(tr>0){const s=0.5/Math.sqrt(tr+1);this.w=0.25/s;this.x=(m32-m23)*s;this.y=(m13-m31)*s;this.z=(m21-m12)*s;}
    else if(m11>m22&&m11>m33){const s=2*Math.sqrt(1+m11-m22-m33);this.w=(m32-m23)/s;this.x=0.25*s;this.y=(m12+m21)/s;this.z=(m13+m31)/s;}
    else if(m22>m33){const s=2*Math.sqrt(1+m22-m11-m33);this.w=(m13-m31)/s;this.x=(m12+m21)/s;this.y=0.25*s;this.z=(m23+m32)/s;}
    else{const s=2*Math.sqrt(1+m33-m11-m22);this.w=(m21-m12)/s;this.x=(m13+m31)/s;this.y=(m23+m32)/s;this.z=0.25*s;}
    return this;
  }
  setFromUnitVectors(a,b){
    let r=a.dot(b)+1;
    if(r<EPS){r=0;if(Math.abs(a.x)>Math.abs(a.z))this.set(-a.y,a.x,0,r);else this.set(0,-a.z,a.y,r);}
    else this.set(a.y*b.z-a.z*b.y,a.z*b.x-a.x*b.z,a.x*b.y-a.y*b.x,r);
    return this.normalize();
  }
  invert(){return this.conjugate();}
  conjugate(){this.x=-this.x;this.y=-this.y;this.z=-this.z;return this;}
  dot(q){return this.x*q.x+this.y*q.y+this.z*q.z+this.w*q.w;}
  lengthSq(){return this.dot(this);}
  length(){return Math.sqrt(this.lengthSq());}
  normalize(){let l=this.length();if(l===0)return this.identity();l=1/l;this.x*=l;this.y*=l;this.z*=l;this.w*=l;return this;}
  multiply(q){return this.multiplyQuaternions(this,q);}
  premultiply(q){return this.multiplyQuaternions(q,this);}
  multiplyQuaternions(a,b){
    const ax=a.x,ay=a.y,az=a.z,aw=a.w,bx=b.x,by=b.y,bz=b.z,bw=b.w;
    this.x=ax*bw+aw*bx+ay*bz-az*by;this.y=ay*bw+aw*by+az*bx-ax*bz;this.z=az*bw+aw*bz+ax*by-ay*bx;this.w=aw*bw-ax*bx-ay*by-az*bz;return this;
  }
  slerp(qb,t){
    if(t===0)return this;if(t===1)return this.copy(qb);
    const x=this.x,y=this.y,z=this.z,w=this.w;
    let c=w*qb.w+x*qb.x+y*qb.y+z*qb.z;
    if(c<0){this.set(-qb.x,-qb.y,-qb.z,-qb.w);c=-c;}else this.copy(qb);
    if(c>=1)return this.set(x,y,z,w);
    const s2=1-c*c;
    if(s2<=EPS){const s=1-t;return this.set(s*x+t*this.x,s*y+t*this.y,s*z+t*this.z,s*w+t*this.w).normalize();}
    const sh=Math.sqrt(s2),h=Math.atan2(sh,c),ra=Math.sin((1-t)*h)/sh,rb=Math.sin(t*h)/sh;
    return this.set(x*ra+this.x*rb,y*ra+this.y*rb,z*ra+this.z*rb,w*ra+this.w*rb);
  }
  fromArray(a,o=0){return this.set(a[o],a[o+1],a[o+2],a[o+3]);}
  toArray(a=[],o=0){a[o]=this.x;a[o+1]=this.y;a[o+2]=this.z;a[o+3]=this.w;return a;}
}
class Matrix4{
  constructor(){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];}
  set(n11,n12,n13,n14,n21,n22,n23,n24,n31,n32,n33,n34,n41,n42,n43,n44){
    const t=this.elements;t[0]=n11;t[4]=n12;t[8]=n13;t[12]=n14;t[1]=n21;t[5]=n22;t[9]=n23;t[13]=n24;t[2]=n31;t[6]=n32;t[10]=n33;t[14]=n34;t[3]=n41;t[7]=n42;t[11]=n43;t[15]=n44;return this;
  }
  identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1);}
  clone(){return new Matrix4().copy(this);}
  copy(m){const a=this.elements,b=m.elements;for(let i=0;i<16;i++)a[i]=b[i];return this;}
  makeBasis(x,y,z){return this.set(x.x,y.x,z.x,0,x.y,y.y,z.y,0,x.z,y.z,z.z,0,0,0,0,1);}
  makeScale(x,y,z){return this.set(x,0,0,0,0,y,0,0,0,0,z,0,0,0,0,1);}
  makeTranslation(x,y,z){return this.set(1,0,0,x,0,1,0,y,0,0,1,z,0,0,0,1);}
  makeRotationFromQuaternion(q){return this.compose(_zero,q,_one);}
  multiply(m){return this.multiplyMatrices(this,m);}
  premultiply(m){return this.multiplyMatrices(m,this);}
  multiplyMatrices(a,b){
    const ae=a.elements,be=b.elements,t=this.elements;
    const a11=ae[0],a12=ae[4],a13=ae[8],a14=ae[12],a21=ae[1],a22=ae[5],a23=ae[9],a24=ae[13],a31=ae[2],a32=ae[6],a33=ae[10],a34=ae[14],a41=ae[3],a42=ae[7],a43=ae[11],a44=ae[15];
    const b11=be[0],b12=be[4],b13=be[8],b14=be[12],b21=be[1],b22=be[5],b23=be[9],b24=be[13],b31=be[2],b32=be[6],b33=be[10],b34=be[14],b41=be[3],b42=be[7],b43=be[11],b44=be[15];
    t[0]=a11*b11+a12*b21+a13*b31+a14*b41;t[4]=a11*b12+a12*b22+a13*b32+a14*b42;t[8]=a11*b13+a12*b23+a13*b33+a14*b43;t[12]=a11*b14+a12*b24+a13*b34+a14*b44;
    t[1]=a21*b11+a22*b21+a23*b31+a24*b41;t[5]=a21*b12+a22*b22+a23*b32+a24*b42;t[9]=a21*b13+a22*b23+a23*b33+a24*b43;t[13]=a21*b14+a22*b24+a23*b34+a24*b44;
    t[2]=a31*b11+a32*b21+a33*b31+a34*b41;t[6]=a31*b12+a32*b22+a33*b32+a34*b42;t[10]=a31*b13+a32*b23+a33*b33+a34*b43;t[14]=a31*b14+a32*b24+a33*b34+a34*b44;
    t[3]=a41*b11+a42*b21+a43*b31+a44*b41;t[7]=a41*b12+a42*b22+a43*b32+a44*b42;t[11]=a41*b13+a42*b23+a43*b33+a44*b43;t[15]=a41*b14+a42*b24+a43*b34+a44*b44;
    return this;
  }
  transpose(){const t=this.elements;let k;k=t[1];t[1]=t[4];t[4]=k;k=t[2];t[2]=t[8];t[8]=k;k=t[6];t[6]=t[9];t[9]=k;k=t[3];t[3]=t[12];t[12]=k;k=t[7];t[7]=t[13];t[13]=k;k=t[11];t[11]=t[14];t[14]=k;return this;}
  determinant(){
    const t=this.elements,n11=t[0],n12=t[4],n13=t[8],n14=t[12],n21=t[1],n22=t[5],n23=t[9],n24=t[13],n31=t[2],n32=t[6],n33=t[10],n34=t[14],n41=t[3],n42=t[7],n43=t[11],n44=t[15];
    return n41*(+n14*n23*n32-n13*n24*n32-n14*n22*n33+n12*n24*n33+n13*n22*n34-n12*n23*n34)+n42*(+n11*n23*n34-n11*n24*n33+n14*n21*n33-n13*n21*n34+n13*n24*n31-n14*n23*n31)+n43*(+n11*n24*n32-n11*n22*n34-n14*n21*n32+n12*n21*n34+n14*n22*n31-n12*n24*n31)+n44*(-n13*n22*n31-n11*n23*n32+n11*n22*n33+n13*n21*n32-n12*n21*n33+n12*n23*n31);
  }
  invert(){
    const t=this.elements,n11=t[0],n21=t[1],n31=t[2],n41=t[3],n12=t[4],n22=t[5],n32=t[6],n42=t[7],n13=t[8],n23=t[9],n33=t[10],n43=t[11],n14=t[12],n24=t[13],n34=t[14],n44=t[15];
    const t11=n23*n34*n42-n24*n33*n42+n24*n32*n43-n22*n34*n43-n23*n32*n44+n22*n33*n44,t12=n14*n33*n42-n13*n34*n42-n14*n32*n43+n12*n34*n43+n13*n32*n44-n12*n33*n44,
      t13=n13*n24*n42-n14*n23*n42+n14*n22*n43-n12*n24*n43-n13*n22*n44+n12*n23*n44,t14=n14*n23*n32-n13*n24*n32-n14*n22*n33+n12*n24*n33+n13*n22*n34-n12*n23*n34;
    const det=n11*t11+n21*t12+n31*t13+n41*t14;
    if(det===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);
    const d=1/det;
    t[0]=t11*d;t[1]=(n24*n33*n41-n23*n34*n41-n24*n31*n43+n21*n34*n43+n23*n31*n44-n21*n33*n44)*d;t[2]=(n22*n34*n41-n24*n32*n41+n24*n31*n42-n21*n34*n42-n22*n31*n44+n21*n32*n44)*d;t[3]=(n23*n32*n41-n22*n33*n41-n23*n31*n42+n21*n33*n42+n22*n31*n43-n21*n32*n43)*d;
    t[4]=t12*d;t[5]=(n13*n34*n41-n14*n33*n41+n14*n31*n43-n11*n34*n43-n13*n31*n44+n11*n33*n44)*d;t[6]=(n14*n32*n41-n12*n34*n41-n14*n31*n42+n11*n34*n42+n12*n31*n44-n11*n32*n44)*d;t[7]=(n12*n33*n41-n13*n32*n41+n13*n31*n42-n11*n33*n42-n12*n31*n43+n11*n32*n43)*d;
    t[8]=t13*d;t[9]=(n14*n23*n41-n13*n24*n41-n14*n21*n43+n11*n24*n43+n13*n21*n44-n11*n23*n44)*d;t[10]=(n12*n24*n41-n14*n22*n41+n14*n21*n42-n11*n24*n42-n12*n21*n44+n11*n22*n44)*d;t[11]=(n13*n22*n41-n12*n23*n41-n13*n21*n42+n11*n23*n42+n12*n21*n43-n11*n22*n43)*d;
    t[12]=t14*d;t[13]=(n13*n24*n31-n14*n23*n31+n14*n21*n33-n11*n24*n33-n13*n21*n34+n11*n23*n34)*d;t[14]=(n14*n22*n31-n12*n24*n31-n14*n21*n32+n11*n24*n32+n12*n21*n34-n11*n22*n34)*d;t[15]=(n12*n23*n31-n13*n22*n31+n13*n21*n32-n11*n23*n32-n12*n21*n33+n11*n22*n33)*d;
    return this;
  }
  compose(p,q,s){
    const t=this.elements,x=q.x,y=q.y,z=q.z,w=q.w,x2=x+x,y2=y+y,z2=z+z,xx=x*x2,xy=x*y2,xz=x*z2,yy=y*y2,yz=y*z2,zz=z*z2,wx=w*x2,wy=w*y2,wz=w*z2,sx=s.x,sy=s.y,sz=s.z;
    t[0]=(1-(yy+zz))*sx;t[1]=(xy+wz)*sx;t[2]=(xz-wy)*sx;t[3]=0;t[4]=(xy-wz)*sy;t[5]=(1-(xx+zz))*sy;t[6]=(yz+wx)*sy;t[7]=0;
    t[8]=(xz+wy)*sz;t[9]=(yz-wx)*sz;t[10]=(1-(xx+yy))*sz;t[11]=0;t[12]=p.x;t[13]=p.y;t[14]=p.z;t[15]=1;return this;
  }
  decompose(p,q,s){
    const t=this.elements;let sx=_v1.set(t[0],t[1],t[2]).length();const sy=_v1.set(t[4],t[5],t[6]).length(),sz=_v1.set(t[8],t[9],t[10]).length();
    if(this.determinant()<0)sx=-sx;
    p.x=t[12];p.y=t[13];p.z=t[14];
    _m0.copy(this);const e=_m0.elements,ix=1/sx,iy=1/sy,iz=1/sz;
    e[0]*=ix;e[1]*=ix;e[2]*=ix;e[4]*=iy;e[5]*=iy;e[6]*=iy;e[8]*=iz;e[9]*=iz;e[10]*=iz;
    q.setFromRotationMatrix(_m0);s.x=sx;s.y=sy;s.z=sz;return this;
  }
  getMaxScaleOnAxis(){const t=this.elements;return Math.sqrt(Math.max(t[0]*t[0]+t[1]*t[1]+t[2]*t[2],t[4]*t[4]+t[5]*t[5]+t[6]*t[6],t[8]*t[8]+t[9]*t[9]+t[10]*t[10]));}
  lookAt(eye,target,up){
    const t=this.elements;_vz.subVectors(eye,target);if(_vz.lengthSq()===0)_vz.z=1;_vz.normalize();_vx.crossVectors(up,_vz);
    if(_vx.lengthSq()===0){if(Math.abs(up.z)===1)_vz.x+=1e-4;else _vz.z+=1e-4;_vz.normalize();_vx.crossVectors(up,_vz);}
    _vx.normalize();_vy.crossVectors(_vz,_vx);
    t[0]=_vx.x;t[4]=_vy.x;t[8]=_vz.x;t[1]=_vx.y;t[5]=_vy.y;t[9]=_vz.y;t[2]=_vx.z;t[6]=_vy.z;t[10]=_vz.z;return this;
  }
  makePerspective(l,r,top,b,n,f){
    const t=this.elements;
    t[0]=2*n/(r-l);t[4]=0;t[8]=(r+l)/(r-l);t[12]=0;t[1]=0;t[5]=2*n/(top-b);t[9]=(top+b)/(top-b);t[13]=0;
    t[2]=0;t[6]=0;t[10]=-(f+n)/(f-n);t[14]=-2*f*n/(f-n);t[3]=0;t[7]=0;t[11]=-1;t[15]=0;return this;
  }
  toArray(a=[],o=0){const t=this.elements;for(let i=0;i<16;i++)a[o+i]=t[i];return a;}
}
class Color{
  constructor(r,g,b){this.r=1;this.g=1;this.b=1;this.isColor=true;if(g===undefined&&b===undefined){if(r!==undefined)this.set(r);}else this.setRGB(r,g,b);}
  set(v){if(v&&v.isColor)return this.copy(v);if(typeof v==='number')return this.setHex(v);if(typeof v==='string'&&v[0]==='#')return this.setHex(parseInt(v.slice(1),16));return this;}
  setHex(h){h=Math.floor(h);this.r=(h>>16&255)/255;this.g=(h>>8&255)/255;this.b=(h&255)/255;return this;}
  getHex(){const c=v=>Math.max(0,Math.min(255,Math.round(v*255)));return c(this.r)<<16^c(this.g)<<8^c(this.b);}
  setRGB(r,g,b){this.r=r;this.g=g;this.b=b;return this;}
  copy(c){this.r=c.r;this.g=c.g;this.b=c.b;return this;}
  clone(){return new Color(this.r,this.g,this.b);}
}
const _v1=new Vector3(),_vx=new Vector3(),_vy=new Vector3(),_vz=new Vector3(),_zero=new Vector3(),_one=new Vector3(1,1,1),_qa=new Quaternion(),_m0=new Matrix4();

// ---------- Geometry ----------
class BufferAttribute{
  constructor(array,itemSize){this.array=array;this.itemSize=itemSize;this.count=array.length/itemSize;this.version=0;}
  set needsUpdate(v){if(v)this.version++;}
  getX(i){return this.array[i*this.itemSize];}getY(i){return this.array[i*this.itemSize+1];}getZ(i){return this.array[i*this.itemSize+2];}
  setXYZ(i,x,y,z){i*=this.itemSize;this.array[i]=x;this.array[i+1]=y;this.array[i+2]=z;return this;}
}
const _renderers=[];
class BufferGeometry{
  constructor(){this.attributes={};this.index=null;this.boundingSphere=null;}
  setAttribute(n,a){this.attributes[n]=a;this.boundingSphere=null;return this;}
  getAttribute(n){return this.attributes[n];}
  setIndex(i){if(Array.isArray(i))i=new BufferAttribute(new Uint16Array(i),1);this.index=i;return this;}
  computeBoundingSphere(){
    const p=this.attributes.position,c=new Vector3();let r=0;
    if(p&&p.count){
      const mn=new Vector3(Infinity,Infinity,Infinity),mx=new Vector3(-Infinity,-Infinity,-Infinity);
      for(let i=0;i<p.count;i++){_v1.fromBufferAttribute(p,i);mn.set(Math.min(mn.x,_v1.x),Math.min(mn.y,_v1.y),Math.min(mn.z,_v1.z));mx.set(Math.max(mx.x,_v1.x),Math.max(mx.y,_v1.y),Math.max(mx.z,_v1.z));}
      c.addVectors(mn,mx).multiplyScalar(0.5);
      for(let i=0;i<p.count;i++)r=Math.max(r,c.distanceToSquared(_v1.fromBufferAttribute(p,i)));
    }
    this.boundingSphere={center:c,radius:Math.sqrt(r)};
  }
  dispose(){for(const r of _renderers)r._freeGeometry(this);}
}
const F32=a=>new BufferAttribute(new Float32Array(a),3);
// Box with subdivisions (same face order as Three.js)
function BoxGeometry(w=1,h=1,d=1,ws=1,hs=1,ds=1){
  const g=new BufferGeometry(),idx=[],pos=[],nor=[];let nv=0;
  const plane=(u,v,wq,ud,vd,W,H,D,gx,gy)=>{
    const sw=W/gx,sh=H/gy,vec=[0,0,0];
    for(let iy=0;iy<=gy;iy++)for(let ix=0;ix<=gx;ix++){
      vec[u]=(ix*sw-W/2)*ud;vec[v]=(iy*sh-H/2)*vd;vec[wq]=D/2;pos.push(vec[0],vec[1],vec[2]);
      vec[u]=0;vec[v]=0;vec[wq]=D>0?1:-1;nor.push(vec[0],vec[1],vec[2]);
    }
    for(let iy=0;iy<gy;iy++)for(let ix=0;ix<gx;ix++){
      const a=nv+ix+(gx+1)*iy,b=nv+ix+(gx+1)*(iy+1),c=nv+ix+1+(gx+1)*(iy+1),e=nv+ix+1+(gx+1)*iy;idx.push(a,b,e,b,c,e);
    }
    nv+=(gx+1)*(gy+1);
  };
  plane(2,1,0,-1,-1,d,h,w,ds,hs);plane(2,1,0,1,-1,d,h,-w,ds,hs);plane(0,2,1,1,1,w,d,h,ws,ds);
  plane(0,2,1,1,-1,w,d,-h,ws,ds);plane(0,1,2,1,-1,w,h,d,ws,hs);plane(0,1,2,-1,-1,w,h,-d,ws,hs);
  g.setIndex(idx);g.setAttribute('position',F32(pos));g.setAttribute('normal',F32(nor));return g;
}
function PlaneGeometry(w=1,h=1){
  const g=new BufferGeometry(),x=w/2,y=h/2;
  g.setAttribute('position',F32([-x,y,0,x,y,0,-x,-y,0,x,-y,0]));g.setAttribute('normal',F32([0,0,1,0,0,1,0,0,1,0,0,1]));
  g.setAttribute('uv',new BufferAttribute(new Float32Array([0,1,1,1,0,0,1,0]),2));g.setIndex([0,2,1,2,3,1]);return g;
}
// Rounded-corner slab with a soft bevel (sticker); flat faces like Three.js's extrusion
function TileGeometry(w,r,depth,bevel,curveSeg=6,bevelSeg=2){
  const h=w/2,pts=[];
  const corner=(cx,cy,a0)=>{for(let i=0;i<=curveSeg;i++){const a=a0+i/curveSeg*Math.PI/2;pts.push([cx+Math.cos(a)*r,cy+Math.sin(a)*r]);}};
  corner(h-r,-h+r,-Math.PI/2);corner(h-r,h-r,0);corner(-h+r,h-r,Math.PI/2);corner(-h+r,-h+r,Math.PI);
  const n=pts.length,nrm=pts.map(([x,y])=>{const cx=Math.max(-h+r,Math.min(h-r,x)),cy=Math.max(-h+r,Math.min(h-r,y)),dx=x-cx,dy=y-cy,l=Math.hypot(dx,dy)||1;return [dx/l,dy/l];});
  const rings=[];
  for(let b=0;b<bevelSeg;b++){const t=b/bevelSeg;rings.push([-bevel*Math.cos(t*Math.PI/2),bevel*Math.sin(t*Math.PI/2)]);}
  rings.push([0,bevel],[depth,bevel]);
  for(let b=bevelSeg-1;b>=0;b--){const t=b/bevelSeg;rings.push([depth+bevel*Math.cos(t*Math.PI/2),bevel*Math.sin(t*Math.PI/2)]);}
  const P=(ri,i)=>{const [z,o]=rings[ri],k=i%n;return [pts[k][0]+nrm[k][0]*o,pts[k][1]+nrm[k][1]*o,z];};
  const pos=[],nor=[];
  const tri=(a,b,c)=>{
    const ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
    let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;const l=Math.hypot(nx,ny,nz)||1;nx/=l;ny/=l;nz/=l;
    pos.push(...a,...b,...c);nor.push(nx,ny,nz,nx,ny,nz,nx,ny,nz);
  };
  const last=rings.length-1;
  for(let i=1;i<n-1;i++){tri(P(last,0),P(last,i),P(last,i+1));tri(P(0,0),P(0,i+1),P(0,i));}
  for(let ri=0;ri<last;ri++)for(let i=0;i<n;i++){const a=P(ri,i),b=P(ri,i+1),c=P(ri+1,i+1),d=P(ri+1,i);tri(a,b,c);tri(a,c,d);}
  const g=new BufferGeometry();g.setAttribute('position',F32(pos));g.setAttribute('normal',F32(nor));return g;
}
// Edges where the faces form an angle (or open borders)
function EdgesGeometry(geo,thresholdDeg=1){
  const p=geo.attributes.position,ix=geo.index,cnt=ix?ix.count:p.count,th=Math.cos(thresholdDeg*DEG),map=new Map(),out=[];
  const vi=i=>ix?ix.array[i]:i,kv=v=>Math.round(v.x*1e4)+','+Math.round(v.y*1e4)+','+Math.round(v.z*1e4);
  const a=new Vector3(),b=new Vector3(),c=new Vector3(),n=new Vector3(),t=new Vector3();
  for(let i=0;i<cnt;i+=3){
    const vs=[a.fromBufferAttribute(p,vi(i)).clone(),b.fromBufferAttribute(p,vi(i+1)).clone(),c.fromBufferAttribute(p,vi(i+2)).clone()];
    n.subVectors(vs[2],vs[1]).cross(t.subVectors(vs[0],vs[1])).normalize();
    for(let j=0;j<3;j++){
      const v0=vs[j],v1=vs[(j+1)%3],k0=kv(v0),k1=kv(v1);if(k0===k1)continue;
      const key=k0<k1?k0+'|'+k1:k1+'|'+k0,e=map.get(key);
      if(!e)map.set(key,{v0,v1,n:n.clone()});
      else{if(e.n.dot(n)<=th)out.push(v0.x,v0.y,v0.z,v1.x,v1.y,v1.z);map.delete(key);}
    }
  }
  for(const e of map.values())out.push(e.v0.x,e.v0.y,e.v0.z,e.v1.x,e.v1.y,e.v1.z);
  const g=new BufferGeometry();g.setAttribute('position',F32(out));return g;
}

// ---------- Materials and textures ----------
class Texture{constructor(image){this.image=image;this.version=0;this.isTexture=true;}set needsUpdate(v){if(v)this.version++;}dispose(){for(const r of _renderers)r._freeTexture(this);}}
class CanvasTexture extends Texture{constructor(c){super(c);this.needsUpdate=true;}}
class Material{
  constructor(kind,p){
    this.kind=kind;this.color=new Color(0xffffff);this.opacity=1;this.transparent=false;this.depthWrite=true;this.depthTest=true;
    this.blending=NormalBlending;this.side=FrontSide;this.visible=true;this.vertexColors=false;this.map=null;this.userData={};
    if(kind==='lambert'||kind==='phong'){this.emissive=new Color(0);this.emissiveIntensity=1;}
    if(kind==='phong'){this.specular=new Color(0x111111);this.shininess=30;}
    if(kind==='points'){this.size=1;}
    this.setValues(p);
  }
  setValues(p){if(!p)return;for(const k in p){const v=p[k],c=this[k];if(c&&c.isColor)c.set(v);else this[k]=v;}}
  dispose(){}
}
const mat=kind=>class extends Material{constructor(p){super(kind,p);}};
const MeshBasicMaterial=mat('basic'),MeshLambertMaterial=mat('lambert'),MeshPhongMaterial=mat('phong'),PointsMaterial=mat('points'),LineBasicMaterial=mat('line');

// ---------- Scene ----------
class Object3D{
  constructor(){
    this.parent=null;this.children=[];this.up=new Vector3(0,1,0);this.position=new Vector3();this.quaternion=new Quaternion();this.scale=new Vector3(1,1,1);
    this.matrix=new Matrix4();this.matrixWorld=new Matrix4();this.visible=true;this.renderOrder=0;this.frustumCulled=true;this.userData={};
  }
  add(o){if(o===this)return this;if(o.parent)o.parent.remove(o);o.parent=this;this.children.push(o);return this;}
  remove(o){const i=this.children.indexOf(o);if(i>=0){o.parent=null;this.children.splice(i,1);}return this;}
  attach(o){
    this.updateWorldMatrix(true,false);_m1.copy(this.matrixWorld).invert();
    if(o.parent){o.parent.updateWorldMatrix(true,false);_m1.multiply(o.parent.matrixWorld);}
    o.updateMatrix();o.matrix.premultiply(_m1);o.matrix.decompose(o.position,o.quaternion,o.scale);
    this.add(o);o.updateWorldMatrix(false,true);return this;
  }
  updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);}
  updateMatrixWorld(){this.updateWorldMatrix(false,true);}
  updateWorldMatrix(parents,children){
    if(parents&&this.parent)this.parent.updateWorldMatrix(true,false);
    this.updateMatrix();
    if(this.parent)this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix);else this.matrixWorld.copy(this.matrix);
    if(children)for(const c of this.children)c.updateWorldMatrix(false,true);
  }
  localToWorld(v){return v.applyMatrix4(this.matrixWorld);}
  worldToLocal(v){return v.applyMatrix4(_m1.copy(this.matrixWorld).invert());}
  getWorldQuaternion(q){this.updateWorldMatrix(true,false);this.matrixWorld.decompose(_p1,q,_s1);return q;}
  getWorldPosition(v){this.updateWorldMatrix(true,false);return v.setFromMatrixPosition(this.matrixWorld);}
  lookAt(x,y,z){
    if(typeof x==='object')_t1.copy(x);else _t1.set(x,y,z);
    this.updateWorldMatrix(true,false);_p1.setFromMatrixPosition(this.matrixWorld);
    if(this.isCamera)_m1.lookAt(_p1,_t1,this.up);else _m1.lookAt(_t1,_p1,this.up);
    this.quaternion.setFromRotationMatrix(_m1);
    if(this.parent){this.parent.getWorldQuaternion(_qb);this.quaternion.premultiply(_qb.invert());}
    this.updateWorldMatrix(false,false);
  }
  traverse(cb){cb(this);for(const c of this.children.slice())c.traverse(cb);}
  clone(){return new this.constructor().copy(this);}
  copy(s){
    this.position.copy(s.position);this.quaternion.copy(s.quaternion);this.scale.copy(s.scale);this.up.copy(s.up);
    this.visible=s.visible;this.renderOrder=s.renderOrder;this.frustumCulled=s.frustumCulled;
    try{this.userData=JSON.parse(JSON.stringify(s.userData));}catch(e){this.userData={};}
    for(const c of s.children)this.add(c.clone());return this;
  }
}
const _m1=new Matrix4(),_p1=new Vector3(),_s1=new Vector3(),_t1=new Vector3(),_qb=new Quaternion();
class Group extends Object3D{constructor(){super();this.isGroup=true;}}
class Scene extends Object3D{constructor(){super();this.isScene=true;}}
class Mesh extends Object3D{
  constructor(geometry=null,material=null){super();this.isMesh=true;this.geometry=geometry;this.material=material;}
  copy(s){super.copy(s);this.geometry=s.geometry;this.material=s.material;return this;}
  raycast(rc,out){
    const g=this.geometry,m=this.material;if(!g||!m||!g.attributes.position)return;
    if(!g.boundingSphere)g.computeBoundingSphere();
    _sc.copy(g.boundingSphere.center).applyMatrix4(this.matrixWorld);
    const rad=g.boundingSphere.radius*this.matrixWorld.getMaxScaleOnAxis();
    if(rc.ray.distanceSqToPoint(_sc)>rad*rad)return;
    _mi.copy(this.matrixWorld).invert();_ray.copy(rc.ray).applyMatrix4(_mi);
    const p=g.attributes.position,ix=g.index,cnt=ix?ix.count:p.count,cull=m.side!==DoubleSide;
    for(let i=0;i<cnt;i+=3){
      const a=ix?ix.array[i]:i,b=ix?ix.array[i+1]:i+1,c=ix?ix.array[i+2]:i+2;
      _ta.fromBufferAttribute(p,a);_tb.fromBufferAttribute(p,b);_tc.fromBufferAttribute(p,c);
      if(!_ray.intersectTriangle(_ta,_tb,_tc,cull,_hit))continue;
      const pw=_hit.clone().applyMatrix4(this.matrixWorld),d=rc.ray.origin.distanceTo(pw);
      if(d<rc.near||d>rc.far)continue;
      const normal=new Vector3().subVectors(_tc,_tb).cross(_v2.subVectors(_ta,_tb)).normalize();
      out.push({distance:d,point:pw,face:{a,b,c,normal},object:this});
    }
  }
}
class InstancedMesh extends Mesh{
  constructor(g,m,count){
    super(g,m);this.isInstancedMesh=true;this.count=count;this.instanceColor=null;
    const a=new Float32Array(count*16);for(let i=0;i<count;i++)a[i*16]=a[i*16+5]=a[i*16+10]=a[i*16+15]=1;
    this.instanceMatrix=new BufferAttribute(a,16);
  }
  setMatrixAt(i,m){m.toArray(this.instanceMatrix.array,i*16);}
  setColorAt(i,c){if(!this.instanceColor)this.instanceColor=new BufferAttribute(new Float32Array(this.count*3).fill(1),3);this.instanceColor.setXYZ(i,c.r,c.g,c.b);this.instanceColor.needsUpdate=true;}
  raycast(){}
}
class Points extends Object3D{constructor(g,m){super();this.isPoints=true;this.geometry=g;this.material=m;}}
class LineSegments extends Object3D{constructor(g,m){super();this.isLineSegments=true;this.geometry=g;this.material=m;}copy(s){super.copy(s);this.geometry=s.geometry;this.material=s.material;return this;}}
class Light extends Object3D{constructor(color,intensity=1){super();this.isLight=true;this.color=new Color(color);this.intensity=intensity;}}
class AmbientLight extends Light{constructor(c,i){super(c,i);this.isAmbientLight=true;}}
class HemisphereLight extends Light{constructor(sky,ground,i){super(sky,i);this.isHemisphereLight=true;this.groundColor=new Color(ground);this.position.set(0,1,0);}}
class DirectionalLight extends Light{constructor(c,i){super(c,i);this.isDirectionalLight=true;this.position.set(0,1,0);}}
class PointLight extends Light{constructor(c,i,distance=0,decay=1){super(c,i);this.isPointLight=true;this.distance=distance;this.decay=decay;}}
class Camera extends Object3D{
  constructor(){super();this.isCamera=true;this.matrixWorldInverse=new Matrix4();this.projectionMatrix=new Matrix4();this.projectionMatrixInverse=new Matrix4();}
  updateWorldMatrix(p,c){super.updateWorldMatrix(p,c);this.matrixWorldInverse.copy(this.matrixWorld).invert();}
}
class PerspectiveCamera extends Camera{
  constructor(fov=50,aspect=1,near=0.1,far=2000){super();this.fov=fov;this.aspect=aspect;this.near=near;this.far=far;this.updateProjectionMatrix();}
  updateProjectionMatrix(){
    const top=this.near*Math.tan(DEG*0.5*this.fov),hgt=2*top,wid=this.aspect*hgt,left=-0.5*wid;
    this.projectionMatrix.makePerspective(left,left+wid,top,top-hgt,this.near,this.far);this.projectionMatrixInverse.copy(this.projectionMatrix).invert();
  }
}

// ---------- Rays ----------
class Ray{
  constructor(){this.origin=new Vector3();this.direction=new Vector3(0,0,-1);}
  copy(r){this.origin.copy(r.origin);this.direction.copy(r.direction);return this;}
  at(t,out){return out.copy(this.direction).multiplyScalar(t).add(this.origin);}
  applyMatrix4(m){this.origin.applyMatrix4(m);this.direction.transformDirection(m);return this;}
  distanceSqToPoint(p){const d=_v3.subVectors(p,this.origin).dot(this.direction);if(d<0)return this.origin.distanceToSquared(p);return _v3.copy(this.direction).multiplyScalar(d).add(this.origin).distanceToSquared(p);}
  intersectPlane(pl,out){
    const den=pl.normal.dot(this.direction);
    if(den===0)return pl.distanceToPoint(this.origin)===0?out.copy(this.origin):null;
    const t=-(this.origin.dot(pl.normal)+pl.constant)/den;return t>=0?this.at(t,out):null;
  }
  intersectTriangle(a,b,c,cull,out){
    _e1.subVectors(b,a);_e2.subVectors(c,a);_n1.crossVectors(_e1,_e2);
    let DdN=this.direction.dot(_n1),sg;
    if(DdN>0){if(cull)return null;sg=1;}else if(DdN<0){sg=-1;DdN=-DdN;}else return null;
    _df.subVectors(this.origin,a);
    const q=sg*this.direction.dot(_e2.crossVectors(_df,_e2));if(q<0)return null;
    const e=sg*this.direction.dot(_e1.cross(_df));if(e<0||q+e>DdN)return null;
    const QdN=-sg*_df.dot(_n1);if(QdN<0)return null;
    return this.at(QdN/DdN,out);
  }
}
class Plane{
  constructor(){this.normal=new Vector3(1,0,0);this.constant=0;}
  setFromNormalAndCoplanarPoint(n,p){this.normal.copy(n);this.constant=-p.dot(this.normal);return this;}
  distanceToPoint(p){return this.normal.dot(p)+this.constant;}
}
class Raycaster{
  constructor(){this.ray=new Ray();this.near=0;this.far=Infinity;}
  setFromCamera(c,cam){this.ray.origin.setFromMatrixPosition(cam.matrixWorld);this.ray.direction.set(c.x,c.y,0.5).unproject(cam).sub(this.ray.origin).normalize();}
  intersectObjects(list,rec=false,out=[]){const go=o=>{if(!o.visible)return;if(o.raycast)o.raycast(this,out);if(rec)o.children.forEach(go);};list.forEach(go);return out.sort((a,b)=>a.distance-b.distance);}
}
const _sc=new Vector3(),_mi=new Matrix4(),_ray=new Ray(),_ta=new Vector3(),_tb=new Vector3(),_tc=new Vector3(),_hit=new Vector3(),_v2=new Vector3(),_v3=new Vector3(),
  _e1=new Vector3(),_e2=new Vector3(),_n1=new Vector3(),_df=new Vector3();

// ---------- WebGL render ----------
const MAX_DIR=4,MAX_PT=2;
// Lights are declared only in the shader that uses them (WebGL 1 doesn't allow the same uniform with different precision)
const LIGHTS=`uniform vec3 uAmb,uSky,uGround,uHemiDir,uDirDir[${MAX_DIR}],uDirCol[${MAX_DIR}],uPtPos[${MAX_PT}],uPtCol[${MAX_PT}];uniform vec2 uPtAtt[${MAX_PT}];
float att(vec2 a,float d){return a.x>0.?pow(clamp(1.-d/a.x,0.,1.),a.y):1.;}
vec3 hemi(vec3 n){return uAmb+mix(uGround,uSky,0.5*dot(n,uHemiDir)+0.5);}
`;
const VS=`precision highp float;
attribute vec3 position;attribute vec3 normal;attribute vec2 uv;attribute vec3 color;
uniform mat4 uModel,uView,uProj;
#ifdef POINTS
uniform float uSize,uScale;
#endif
#ifdef LAMBERT
${LIGHTS}
#endif
varying vec3 vN,vW,vC,vL;varying vec2 vUv;
void main(){
  vec4 w=uModel*vec4(position,1.);vW=w.xyz;vUv=uv;vC=color;vN=vec3(0.,0.,1.);vL=vec3(1.);
  vec4 mv=uView*w;gl_Position=uProj*mv;
#ifdef POINTS
  gl_PointSize=uSize*(uScale/-mv.z);
#endif
#ifdef LIT
  vN=normalize(mat3(uModel)*normal);
#endif
#ifdef LAMBERT
  vec3 L=hemi(vN);
  for(int i=0;i<${MAX_DIR};i++)L+=max(dot(vN,uDirDir[i]),0.)*uDirCol[i];
  for(int i=0;i<${MAX_PT};i++){vec3 d=uPtPos[i]-w.xyz;float l=length(d);L+=max(dot(vN,d/max(l,1e-4)),0.)*uPtCol[i]*att(uPtAtt[i],l);}
  vL=L;
#endif
}`;
const FS=`#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec3 uColor;uniform float uOpacity;
#ifdef LAMBERT
uniform vec3 uEmissive;
#endif
#ifdef PHONG
uniform vec3 uEmissive,uSpec,uCam;uniform float uShin;
${LIGHTS}
vec3 spec(vec3 L,vec3 V,vec3 n){vec3 H=normalize(L+V);float nh=max(dot(n,H),0.),lh=max(dot(L,H),0.);vec3 F=uSpec+(1.-uSpec)*exp2((-5.55473*lh-6.98316)*lh);return F*0.25*(uShin*0.5+1.)*pow(nh,uShin);}
#endif
#ifdef MAP
uniform sampler2D uMap;
#endif
varying vec3 vN,vW,vC,vL;varying vec2 vUv;
void main(){
  vec4 c=vec4(uColor,uOpacity);
#ifdef VCOLOR
  c.rgb*=vC;
#endif
#ifdef MAP
  c*=texture2D(uMap,vUv);
#endif
#ifdef LAMBERT
  c.rgb=c.rgb*vL+uEmissive;
#endif
#ifdef PHONG
  vec3 n=normalize(vN),V=normalize(uCam-vW),D=hemi(n),S=vec3(0.);
  for(int i=0;i<${MAX_DIR};i++){vec3 irr=max(dot(n,uDirDir[i]),0.)*uDirCol[i];D+=irr;S+=irr*spec(uDirDir[i],V,n);}
  for(int i=0;i<${MAX_PT};i++){vec3 d=uPtPos[i]-vW;float l=length(d);vec3 L=d/max(l,1e-4);vec3 irr=max(dot(n,L),0.)*uPtCol[i]*att(uPtAtt[i],l);D+=irr;S+=irr*spec(L,V,n);}
  c.rgb=c.rgb*D+S+uEmissive;
#endif
  gl_FragColor=c;
}`;
const ATTR=['position','normal','uv','color'];
class WebGLRenderer{
  constructor(o={}){
    const cv=document.createElement('canvas');this.domElement=cv;this.autoClear=true;this._pr=1;this._w=cv.width;this._h=cv.height;
    // stencil:true: on many phones this is what gives a 24-bit depth buffer (without it it may be 16)
    this._opts={alpha:!!o.alpha,antialias:!!o.antialias,depth:true,stencil:true,premultipliedAlpha:true,preserveDrawingBuffer:false};
    const gl=cv.getContext('webgl',this._opts)||cv.getContext('experimental-webgl',this._opts);
    if(!gl)throw new Error('Este navegador no tiene WebGL');
    this.gl=gl;this._clear=[0,0,0,0];this._lost=false;
    cv.addEventListener('webglcontextlost',e=>{e.preventDefault();this._lost=true;},false);
    cv.addEventListener('webglcontextrestored',()=>{this._lost=false;this._init();},false);
    this._init();_renderers.push(this);
  }
  _init(){
    const gl=this.gl;this._progs={};this._bufs=new WeakMap();this._texs=new WeakMap();this._inst=new WeakMap();this._on=new Set();this._cur=null;this._u32=null;this._fill=null;
    gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.frontFace(gl.CCW);gl.cullFace(gl.BACK);
    if(this._vp)gl.viewport(...this._vp);if(this._sc)gl.scissor(...this._sc);if(this._scOn)gl.enable(gl.SCISSOR_TEST);
  }
  setPixelRatio(r){this._pr=r;this.setSize(this._w,this._h,false);}
  getPixelRatio(){return this._pr;}
  setSize(w,h,style=true){
    this._w=w;this._h=h;const cv=this.domElement;cv.width=Math.floor(w*this._pr);cv.height=Math.floor(h*this._pr);
    if(style!==false){cv.style.width=w+'px';cv.style.height=h+'px';}this.setViewport(0,0,w,h);
  }
  _px(x,y,w,h){const r=this._pr;return [Math.floor(x*r),Math.floor(y*r),Math.floor(w*r),Math.floor(h*r)];}
  setViewport(x,y,w,h){this._vp=this._px(x,y,w,h);if(!this._lost)this.gl.viewport(...this._vp);}
  setScissor(x,y,w,h){this._sc=this._px(x,y,w,h);if(!this._lost)this.gl.scissor(...this._sc);}
  setScissorTest(on){this._scOn=on;if(!this._lost)this.gl[on?'enable':'disable'](this.gl.SCISSOR_TEST);}
  setClearColor(hex,a=1){const c=_cc.setHex(hex);this._clear=[c.r*a,c.g*a,c.b*a,a];}
  // Clears the whole canvas. Always without scissor: on some phones (e.g. Mali GPU) clearing with
  // scissor leaves uncleared blocks and the image shows "through" the cube
  clear(){
    if(this._lost)return;const gl=this.gl;
    gl.disable(gl.SCISSOR_TEST);gl.clearColor(...this._clear);gl.clearDepth(1);gl.clearStencil(0);
    gl.depthMask(true);gl.colorMask(true,true,true,true);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT|gl.STENCIL_BUFFER_BIT);
    if(this._scOn)gl.enable(gl.SCISSOR_TEST);
  }
  // Clears only the area of the current view by drawing a rectangle (no glClear): background color and depth at the back
  fillViewport(hex,a=1){
    if(this._lost)return;const gl=this.gl,c=_cc.setHex(hex);
    let f=this._fill;
    if(!f){
      const sh=(t,src)=>{const s=gl.createShader(t);gl.shaderSource(s,src);gl.compileShader(s);return s;};
      const pr=gl.createProgram();
      gl.attachShader(pr,sh(gl.VERTEX_SHADER,'attribute vec2 position;void main(){gl_Position=vec4(position,1.,1.);}'));
      gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,'precision mediump float;uniform vec4 uC;void main(){gl_FragColor=uC;}'));
      gl.bindAttribLocation(pr,0,'position');gl.linkProgram(pr);
      const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
      f=this._fill={pr,b,u:gl.getUniformLocation(pr,'uC')};
    }
    gl.useProgram(f.pr);this._cur=f.pr;
    gl.uniform4f(f.u,c.r*a,c.g*a,c.b*a,a);
    gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.ALWAYS);gl.depthMask(true);gl.colorMask(true,true,true,true);
    for(const i of this._on)if(i!==0)gl.disableVertexAttribArray(i);this._on=new Set([0]);gl.enableVertexAttribArray(0);
    gl.bindBuffer(gl.ARRAY_BUFFER,f.b);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);gl.drawArrays(gl.TRIANGLES,0,3);
    gl.depthFunc(gl.LEQUAL);
  }
  _prog(key,defs){
    let p=this._progs[key];if(p)return p;
    const gl=this.gl,head=defs.map(d=>'#define '+d+'\n').join('');
    const sh=(t,src)=>{const s=gl.createShader(t);gl.shaderSource(s,head+src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error('Shader: '+gl.getShaderInfoLog(s));return s;};
    const pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,VS));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,FS));
    ATTR.forEach((a,i)=>gl.bindAttribLocation(pr,i,a));gl.linkProgram(pr);
    if(!gl.getProgramParameter(pr,gl.LINK_STATUS))throw new Error('Programa: '+gl.getProgramInfoLog(pr));
    const u={},n=gl.getProgramParameter(pr,gl.ACTIVE_UNIFORMS);
    for(let i=0;i<n;i++){const inf=gl.getActiveUniform(pr,i),nm=inf.name.replace(/\[0\]$/,'');u[nm]=gl.getUniformLocation(pr,inf.name);}
    const at=ATTR.map(a=>gl.getAttribLocation(pr,a)>=0);
    return this._progs[key]={pr,u,at,frame:-1};
  }
  _buf(attr,target,dynamic){
    const gl=this.gl;let b=this._bufs.get(attr);
    if(!b){b={id:gl.createBuffer(),v:-1};this._bufs.set(attr,b);}
    if(b.v!==attr.version){gl.bindBuffer(target,b.id);gl.bufferData(target,attr.array,dynamic||attr.version>0?gl.DYNAMIC_DRAW:gl.STATIC_DRAW);b.v=attr.version;}
    return b.id;
  }
  _freeGeometry(g){if(this._lost)return;for(const a of [...Object.values(g.attributes),g.index]){if(!a)continue;const b=this._bufs.get(a);if(b){this.gl.deleteBuffer(b.id);this._bufs.delete(a);}}}
  _freeTexture(t){const x=this._texs.get(t);if(x&&!this._lost){this.gl.deleteTexture(x.id);this._texs.delete(t);}}
  _tex(t){
    const gl=this.gl;let x=this._texs.get(t);
    if(!x){x={id:gl.createTexture(),v:-1};this._texs.set(t,x);}
    gl.bindTexture(gl.TEXTURE_2D,x.id);
    if(x.v!==t.version){
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,t.image);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
      const pot=n=>(n&(n-1))===0;
      if(pot(t.image.width)&&pot(t.image.height)){gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);}
      else gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      x.v=t.version;
    }
  }
  // Instances (neon rods) are flattened into a single buffer on the CPU: few and simple
  _instGeo(o){
    let c=this._inst.get(o);const g=o.geometry,p=g.attributes.position,ix=g.index;
    if(!c){c={geo:new BufferGeometry(),v:-1,cv:-1};this._inst.set(o,c);const n=p.count*o.count;
      c.geo.setAttribute('position',F32(new Array(n*3).fill(0)));c.geo.setAttribute('color',F32(new Array(n*3).fill(1)));
      const id=[];for(let k=0;k<o.count;k++)for(let i=0;i<ix.count;i++)id.push(ix.array[i]+k*p.count);
      c.geo.index=new BufferAttribute(o.count*p.count>65535?new Uint32Array(id):new Uint16Array(id),1);}
    const im=o.instanceMatrix,ic=o.instanceColor;
    if(c.v!==im.version){const out=c.geo.attributes.position.array,m=_im.elements;
      for(let k=0;k<o.count;k++){for(let j=0;j<16;j++)m[j]=im.array[k*16+j];for(let i=0;i<p.count;i++){_v1.fromBufferAttribute(p,i).applyMatrix4(_im).toArray(out,(k*p.count+i)*3);}}
      c.geo.attributes.position.needsUpdate=true;c.v=im.version;}
    if(ic&&c.cv!==ic.version){const out=c.geo.attributes.color.array;for(let k=0;k<o.count;k++)for(let i=0;i<p.count;i++)out.set(ic.array.subarray(k*3,k*3+3),(k*p.count+i)*3);c.geo.attributes.color.needsUpdate=true;c.cv=ic.version;}
    return c.geo;
  }
  // keepMatrices: the scene was already drawn in this frame (e.g. a second view), its matrices aren't recomputed
  render(scene,cam,keepMatrices){
    if(this._lost)return;
    if(this.autoClear)this.clear();
    if(!keepMatrices)scene.updateMatrixWorld();if(!cam.parent)cam.updateWorldMatrix(false,false);
    // Lights and object list: reused between frames so no garbage is created
    const L=this._L||(this._L={amb:[0,0,0],sky:[0,0,0],ground:[0,0,0],hemi:[0,1,0],dir:new Float32Array(MAX_DIR*3),dcol:new Float32Array(MAX_DIR*3),pp:new Float32Array(MAX_PT*3),pcol:new Float32Array(MAX_PT*3),patt:new Float32Array(MAX_PT*2)});
    L.amb.fill(0);L.sky.fill(0);L.ground.fill(0);L.dir.fill(0);L.dcol.fill(0);L.pp.fill(0);L.pcol.fill(0);L.patt.fill(0);
    let nd=0,np=0,ni=0;const pool=this._pool||(this._pool=[]),op=this._op||(this._op=[]),tr=this._tr||(this._tr=[]);op.length=0;tr.length=0;
    const walk=o=>{
      if(!o.visible)return;
      if(o.isLight){
        const k=o.intensity,c=o.color;
        if(o.isAmbientLight){L.amb[0]+=c.r*k;L.amb[1]+=c.g*k;L.amb[2]+=c.b*k;}
        else if(o.isHemisphereLight){L.sky[0]=c.r*k;L.sky[1]=c.g*k;L.sky[2]=c.b*k;const g=o.groundColor;L.ground[0]=g.r*k;L.ground[1]=g.g*k;L.ground[2]=g.b*k;_v1.setFromMatrixPosition(o.matrixWorld).normalize().toArray(L.hemi);}
        else if(o.isDirectionalLight&&nd<MAX_DIR){_v1.setFromMatrixPosition(o.matrixWorld).normalize().toArray(L.dir,nd*3);L.dcol.set([c.r*k,c.g*k,c.b*k],nd*3);nd++;}
        else if(o.isPointLight&&np<MAX_PT){_v1.setFromMatrixPosition(o.matrixWorld).toArray(L.pp,np*3);L.pcol.set([c.r*k,c.g*k,c.b*k],np*3);L.patt.set([o.distance,o.decay],np*2);np++;}
      }else if((o.isMesh||o.isPoints||o.isLineSegments)&&o.material&&o.material.visible&&!(o.material.transparent&&o.material.opacity<=0.001)){
        _v1.setFromMatrixPosition(o.matrixWorld).project(cam);const it=pool[ni]||(pool[ni]={o:null,z:0});ni++;it.o=o;it.z=_v1.z;(o.material.transparent?tr:op).push(it);
      }
      for(const c of o.children)walk(c);
    };
    walk(scene);
    op.sort((a,b)=>a.o.renderOrder-b.o.renderOrder||a.z-b.z);
    tr.sort((a,b)=>a.o.renderOrder-b.o.renderOrder||b.z-a.z);
    this._frame=(this._frame||0)+1;
    _pv.copy(cam.matrixWorldInverse);_cp.setFromMatrixPosition(cam.matrixWorld);
    for(const it of op)this._draw(it.o,cam,L);
    for(const it of tr)this._draw(it.o,cam,L);
  }
  _draw(o,cam,L){
    const gl=this.gl,m=o.material,kind=m.kind;
    const geo=o.isInstancedMesh?this._instGeo(o):o.geometry;if(!geo||!geo.attributes.position)return;
    const defs=[];
    if(kind==='lambert')defs.push('LIT','LAMBERT');else if(kind==='phong')defs.push('LIT','PHONG');else if(kind==='points')defs.push('POINTS');
    if(m.vertexColors||o.isInstancedMesh)defs.push('VCOLOR');if(m.map)defs.push('MAP');
    const P=this._prog(defs.join(','),defs),u=P.u;
    if(this._cur!==P.pr){gl.useProgram(P.pr);this._cur=P.pr;}
    if(P.frame!==this._frame){
      P.frame=this._frame;
      gl.uniformMatrix4fv(u.uView,false,_pv.elements);gl.uniformMatrix4fv(u.uProj,false,cam.projectionMatrix.elements);
      if(u.uCam)gl.uniform3f(u.uCam,_cp.x,_cp.y,_cp.z);
      if(u.uScale)gl.uniform1f(u.uScale,this._h*0.5);
      if(u.uAmb){gl.uniform3fv(u.uAmb,L.amb);gl.uniform3fv(u.uSky,L.sky);gl.uniform3fv(u.uGround,L.ground);gl.uniform3fv(u.uHemiDir,L.hemi);
        gl.uniform3fv(u.uDirDir,L.dir);gl.uniform3fv(u.uDirCol,L.dcol);gl.uniform3fv(u.uPtPos,L.pp);gl.uniform3fv(u.uPtCol,L.pcol);gl.uniform2fv(u.uPtAtt,L.patt);}
    }
    gl.uniformMatrix4fv(u.uModel,false,(o.isInstancedMesh?_idm:o.matrixWorld).elements);
    gl.uniform3f(u.uColor,m.color.r,m.color.g,m.color.b);gl.uniform1f(u.uOpacity,m.opacity);
    if(u.uEmissive){const k=m.emissiveIntensity;gl.uniform3f(u.uEmissive,m.emissive.r*k,m.emissive.g*k,m.emissive.b*k);}
    if(u.uSpec){gl.uniform3f(u.uSpec,m.specular.r,m.specular.g,m.specular.b);gl.uniform1f(u.uShin,Math.max(m.shininess,1e-4));}
    if(u.uSize)gl.uniform1f(u.uSize,m.size*this._pr);
    if(m.map&&u.uMap){gl.activeTexture(gl.TEXTURE0);this._tex(m.map);gl.uniform1i(u.uMap,0);}
    // State
    if(m.blending===AdditiveBlending){gl.enable(gl.BLEND);gl.blendEquation(gl.FUNC_ADD);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);}
    else if(m.transparent){gl.enable(gl.BLEND);gl.blendEquation(gl.FUNC_ADD);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);}
    else gl.disable(gl.BLEND);
    gl[m.depthTest?'enable':'disable'](gl.DEPTH_TEST);gl.depthMask(!!m.depthWrite);
    gl[(o.isMesh&&m.side!==DoubleSide)?'enable':'disable'](gl.CULL_FACE);
    // Attributes
    ATTR.forEach((name,i)=>{
      const a=geo.attributes[name],want=P.at[i]&&a;
      if(want){gl.bindBuffer(gl.ARRAY_BUFFER,this._buf(a,gl.ARRAY_BUFFER));gl.vertexAttribPointer(i,a.itemSize,gl.FLOAT,false,0,0);if(!this._on.has(i)){gl.enableVertexAttribArray(i);this._on.add(i);}}
      else{if(this._on.has(i)){gl.disableVertexAttribArray(i);this._on.delete(i);}if(P.at[i]){if(name==='color')gl.vertexAttrib3f(i,1,1,1);else gl.vertexAttrib4f(i,0,0,0,1);}}
    });
    const mode=o.isPoints?gl.POINTS:o.isLineSegments?gl.LINES:gl.TRIANGLES;
    if(geo.index){
      const big=geo.index.array instanceof Uint32Array;if(big&&!this._u32)this._u32=gl.getExtension('OES_element_index_uint');
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this._buf(geo.index,gl.ELEMENT_ARRAY_BUFFER));gl.drawElements(mode,geo.index.count,big?gl.UNSIGNED_INT:gl.UNSIGNED_SHORT,0);
    }else gl.drawArrays(mode,0,geo.attributes.position.count);
  }
}
const _cc=new Color(),_pv=new Matrix4(),_cp=new Vector3(),_im=new Matrix4(),_idm=new Matrix4();

root.M3={Vector2,Vector3,Quaternion,Matrix4,Color,BufferAttribute,BufferGeometry,BoxGeometry,PlaneGeometry,TileGeometry,EdgesGeometry,
  CanvasTexture,MeshBasicMaterial,MeshLambertMaterial,MeshPhongMaterial,PointsMaterial,LineBasicMaterial,
  Object3D,Group,Scene,Mesh,InstancedMesh,Points,LineSegments,AmbientLight,HemisphereLight,DirectionalLight,PointLight,PerspectiveCamera,
  Raycaster,Plane,WebGLRenderer,NormalBlending,AdditiveBlending,FrontSide,DoubleSide};
})(typeof window!=='undefined'?window:globalThis);

const GraphicsEngine=(function(){
// ================= Look: colors, lights and shapes in one place =================
// (the interface colors are in styles.css, in :root)
const LOOK={
  faces:{U:0xf4f2ff,D:0xffd500,F:0x00b85f,B:0x1f6bff,R:0xe8173f,L:0xff6a00}, // white, yellow, green, blue, red, orange
  plastic:{color:0x0b0a0d,specular:0x2a2a2e,shininess:18},   // body of the pieces
  piece:{size:0.97,round:0.11,seg:5},                         // size and rounding of each piece
  sticker:{size:0.82,round:0.12,glow:0.17},                   // stickers: size, corners and own glow
  lights:{                                                    // synthwave: magenta sky, cyan floor, neon edges
    ambient:[0xffffff,0.34],hemi:[0xff7ad9,0x2de2ff,0.42],
    dir:[[0xfff4fb,0.42,[2,9,4]],[0xb9a8ff,0.22,[-4,-6,-6]],[0xff2e97,0.38,[-7,2,-4]],[0x00e5ff,0.34,[7,1,-5]]],
    floor:[0xff2e97,0.9,9,[0,-3.6,1.5]]},
  miniBg:0x0d0221,
  neon:[0xff2e97,0x00e5ff,0x8b5cf6],
  camera:{pos:[6,5.4,8.6],fov:32,near:1,far:60},   // high near = more depth precision on phones
  floorY:-2.6
};
const AXES=[new M3.Vector3(1,0,0),new M3.Vector3(0,1,0),new M3.Vector3(0,0,1)];

// Creates the scene inside "stage" (the canvas is inserted as its first child)
function createScene(stage){
// ================= 3D scene =================
const renderer=new M3.WebGLRenderer({antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
renderer.autoClear=false;
stage.insertBefore(renderer.domElement,stage.firstChild);
const canvas=renderer.domElement;
const scene=new M3.Scene();
const CAM=new M3.Vector3(...LOOK.camera.pos);
const camera=new M3.PerspectiveCamera(LOOK.camera.fov,1,LOOK.camera.near,LOOK.camera.far);
camera.position.copy(CAM);camera.lookAt(0,0,0);
// Corner box: the same scene seen from behind
const miniCam=new M3.PerspectiveCamera(LOOK.camera.fov,1,LOOK.camera.near,LOOK.camera.far);
miniCam.position.copy(CAM).multiplyScalar(-1);miniCam.lookAt(0,0,0);
{const L=LOOK.lights;
  scene.add(new M3.AmbientLight(...L.ambient));scene.add(new M3.HemisphereLight(...L.hemi));
  for(const [c,i,p] of L.dir){const d=new M3.DirectionalLight(c,i);d.position.set(...p);scene.add(d);}
  const [c,i,dist,p]=L.floor,f=new M3.PointLight(c,i,dist);f.position.set(...p);scene.add(f);}
const container=new M3.Group();scene.add(container);

const camDir=CAM.clone().normalize();
const upW=new M3.Vector3(0,1,0);
const rightW=new M3.Vector3().crossVectors(upW,camDir).normalize();
const upT=new M3.Vector3().crossVectors(camDir,rightW).normalize();

// ================= Pieces =================
const roundRect=(w,r)=>M3.TileGeometry(w,r,0.02,0.012,6,2);
// Piece with rounded edges (a subdivided box whose edges are curved)
function roundedBox(size,r,seg){
  const g=new M3.BoxGeometry(size,size,size,seg,seg,seg),p=g.attributes.position,nr=g.attributes.normal;
  const h=size/2-r,v=new M3.Vector3(),c=new M3.Vector3(),d=new M3.Vector3();
  for(let i=0;i<p.count;i++){
    v.fromBufferAttribute(p,i);
    c.set(Math.max(-h,Math.min(h,v.x)),Math.max(-h,Math.min(h,v.y)),Math.max(-h,Math.min(h,v.z)));
    d.subVectors(v,c);
    if(d.lengthSq()>1e-10){d.normalize();p.setXYZ(i,c.x+d.x*r,c.y+d.y*r,c.z+d.z*r);nr.setXYZ(i,d.x,d.y,d.z);}
  }
  p.needsUpdate=true;nr.needsUpdate=true;return g;
}
const bodyGeo=roundedBox(LOOK.piece.size,LOOK.piece.round,LOOK.piece.seg);
const STICKER_GLOW=LOOK.sticker.glow;
const bodyMat=new M3.MeshPhongMaterial(LOOK.plastic);
const stGeo=roundRect(LOOK.sticker.size,LOOK.sticker.round);
const decalGeo=new M3.PlaneGeometry(0.55,0.55);
// cubies: one group per piece; stickerMats: material of each sticker; decalMats: materials of the marks
const cubies=[],stickerMats=[],decalMats=[];
// SC: scale of each piece; OFF: spacing between piece centers
let SC=1,OFF=1;
function stickerDirs(p){const out=[];for(let a=0;a<3;a++)if(p[a]){const d=[0,0,0];d[a]=p[a];out.push(d);}return out;}
const ZV=new M3.Vector3(0,0,1);
// One piece: black body and its stickers (matOf gives the material of each one)
function makePiece(p,matOf,off){
  const g=new M3.Group();g.add(new M3.Mesh(bodyGeo,bodyMat));const st=[];
  for(const d of stickerDirs(p)){
    const m=new M3.Mesh(stGeo,matOf(d)),dv=new M3.Vector3(...d);
    m.position.copy(dv).multiplyScalar(off);m.quaternion.setFromUnitVectors(ZV,dv);m.userData.st=true;
    g.add(m);st.push({d,m});
  }
  g.position.set(p[0]*OFF,p[1]*OFF,p[2]*OFF);g.scale.setScalar(SC);return {g,st};
}
// Builds the pieces. pieces: [{p,id}] (p = position on the grid -1..1); colorOf(d): color of the sticker
// that faces d; decalOf(p): texture of a faint mark on the top face of that piece, or null
function buildCube({pieces,scale,offset,colorOf,decalOf}){
  cubies.forEach(g=>{container.remove(g);scene.remove(g);});
  cubies.length=0;stickerMats.length=0;decalMats.length=0;
  SC=scale;OFF=offset;
  for(const {p,id} of pieces){
    const {g}=makePiece(p,d=>{
      const col=colorOf(d),mat=new M3.MeshLambertMaterial({color:col,emissive:col,emissiveIntensity:STICKER_GLOW});
      stickerMats.push(mat);return mat;
    },0.475);
    g.userData.id=id;
    const tex=decalOf(p);
    if(tex){
      const dv=new M3.Vector3(0,1,0);
      const pm=new M3.Mesh(decalGeo,new M3.MeshBasicMaterial({map:tex,transparent:true,opacity:0,depthWrite:false}));
      pm.position.copy(dv).multiplyScalar(0.522);pm.quaternion.setFromUnitVectors(ZV,dv);
      pm.userData.decal=true;g.add(pm);decalMats.push(pm.material);
    }
    container.add(g);cubies.push(g);
  }
  markDirty();
}
// sts: stickers of the piece, each with hn (where it faces when solved), n (where it faces now) and p (position)
const V=a=>new M3.Vector3(a[0],a[1],a[2]);
function orientFrom(sts){
  if(sts.length===1)return new M3.Quaternion().setFromUnitVectors(V(sts[0].hn),V(sts[0].n));
  const h1=V(sts[0].hn),h2=V(sts[1].hn),h3=new M3.Vector3().crossVectors(h1,h2);
  const n1=V(sts[0].n),n2=V(sts[1].n),n3=new M3.Vector3().crossVectors(n1,n2);
  const H=new M3.Matrix4().makeBasis(h1,h2,h3);
  const N=new M3.Matrix4().makeBasis(n1,n2,n3);
  return new M3.Quaternion().setFromRotationMatrix(N.multiply(H.transpose()));
}
function syncGroup(g,sts){
  g.position.set(sts[0].p[0]*OFF,sts[0].p[1]*OFF,sts[0].p[2]*OFF);
  g.quaternion.copy(orientFrom(sts));g.scale.setScalar(SC);
}
// Efficient drawing: it is only redrawn if something changed (see "Render")
let dirty=true;const markDirty=()=>{dirty=true;};

// ================= Animated turn of a layer =================
// Turns the pieces of layer l by "total" radians around the axis; when done, sync(g) puts each piece in its exact place
function animateLayer(a,l,total,dur,sync,done){
  const mem=cubies.filter(g=>Math.round(g.position.getComponent(a))===l);
  const pivot=new M3.Group();container.add(pivot);
  mem.forEach(g=>pivot.attach(g));
  const finish=()=>{
    pivot.quaternion.setFromAxisAngle(AXES[a],total);
    pivot.updateMatrixWorld(true);
    mem.forEach(g=>container.attach(g));
    container.remove(pivot);
    mem.forEach(sync);
    done();
  };
  if(dur<=0){finish();return;}
  const t0=performance.now();
  const stepA=now=>{
    const t=Math.min(1,(now-t0)/dur);
    const e=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
    pivot.quaternion.setFromAxisAngle(AXES[a],total*e);
    if(t<1)requestAnimationFrame(stepA);else finish();
  };
  requestAnimationFrame(stepA);
}

// ================= View =================
let viewAnim=null,inertia=null;
function stopViewMotion(){viewAnim=null;inertia=null;}
// ---- Turning the whole thing: smooth, without twisting sideways ----
// The orientation is always: base · horizontal turn (around its vertical axis) · tilt (toward you / away)
// roll: turn in the screen plane (two fingers rotating), like a knob; it is applied last, over everything else
let yaw=0,pitch=0,roll=0;const base=new M3.Quaternion();
const normAng=a=>{const t=2*Math.PI;return ((a+Math.PI)%t+t)%t-Math.PI;};
const _qy=new M3.Quaternion(),_qp=new M3.Quaternion(),_qr=new M3.Quaternion();
function compose(){
  markDirty();
  if(!isFinite(yaw)||!isFinite(pitch)||!isFinite(roll)){yaw=0;pitch=0;roll=0;}
  _qy.setFromAxisAngle(upW,yaw);_qp.setFromAxisAngle(rightW,pitch);_qr.setFromAxisAngle(camDir,roll);
  container.quaternion.copy(_qr).multiply(_qp).multiply(_qy).multiply(base);
}
// Smooth animation of the view toward a turn, a tilt, a base and (by default, without twisting) a screen roll
function animView(y1,p1,b1,dur,r1=0){
  stopViewMotion();
  viewAnim={y0:yaw,y1:yaw+normAng(y1-yaw),p0:pitch,p1:pitch+normAng(p1-pitch),r0:roll,r1:roll+normAng(r1-roll),b0:base.clone(),b1:b1.clone(),t0:performance.now(),dur};
}
function viewStart(){stopViewMotion();return {vy:0,vp:0,t:performance.now(),moved:false};}
function viewDrag(V,dx,dy){
  if(!dx&&!dy)return;
  const size=Math.max(200,Math.min(stage.clientWidth,stage.clientHeight));
  const k=3.4/size;
  // upside down, the horizontal drag is inverted so it feels the same
  const flip=Math.abs(pitch)>Math.PI/2?-1:1;
  // with the cube twisted on the screen, the drag is straightened first so it follows the finger
  const cr=Math.cos(roll),sr=Math.sin(roll);
  const dyw=(dx*cr-dy*sr)*k*flip,dp=(dx*sr+dy*cr)*k;
  yaw=normAng(yaw+dyw);pitch=normAng(pitch+dp);compose();
  const now=performance.now(),dt=Math.max(8,now-V.t);
  V.vy=0.6*V.vy+0.4*(dyw/dt);V.vp=0.6*V.vp+0.4*(dp/dt);V.t=now;V.moved=true;
}
// Two fingers rotating: the cube turns in the screen plane, just like the fingers, from any position
function viewTwist(V,da){
  if(!da)return;
  roll=normAng(roll-da);compose();V.moved=true;V.t=performance.now();
}
// Adds a horizontal turn and a tilt to the view
function turnView(dy,dp){yaw=normAng(yaw+dy);pitch=normAng(pitch+dp);compose();}
// On release: it stays where you left it; if you flicked it, it keeps turning and slows down smoothly (returns true)
function viewEnd(V){
  if(performance.now()-V.t<80&&Math.hypot(V.vy,V.vp)>0.0007){inertia={vy:V.vy,vp:V.vp,t:performance.now()};return true;}
  return false;
}
// Advances the inertia and the view animations; returns true when one of them ends
function stepView(now){
  let ended=false;
  // If the view became invalid, it is reset
  {const q=container.quaternion;if(!isFinite(q.x+q.y+q.z+q.w)||q.lengthSq()<0.5)q.identity();}
  if(inertia){
    const dt=Math.min(40,now-inertia.t);inertia.t=now;
    yaw=normAng(yaw+inertia.vy*dt);pitch=normAng(pitch+inertia.vp*dt);compose();
    const f=Math.pow(0.92,dt/16);inertia.vy*=f;inertia.vp*=f;
    if(Math.hypot(inertia.vy,inertia.vp)<0.00015){inertia=null;ended=true;}
  }
  if(viewAnim){
    const t=Math.min(1,(now-viewAnim.t0)/viewAnim.dur);
    const e=1-Math.pow(1-t,3);
    yaw=viewAnim.y0+(viewAnim.y1-viewAnim.y0)*e;pitch=viewAnim.p0+(viewAnim.p1-viewAnim.p0)*e;roll=viewAnim.r0+(viewAnim.r1-viewAnim.r0)*e;
    base.copy(viewAnim.b0).slerp(viewAnim.b1,e);compose();
    if(t>=1){yaw=normAng(viewAnim.y1);pitch=normAng(viewAnim.p1);roll=normAng(viewAnim.r1);base.copy(viewAnim.b1);compose();viewAnim=null;ended=true;}
  }
  return ended;
}
const getView=()=>({yaw,pitch,roll,base:base.toArray()});
function setView(y,p,b,r=0){base.fromArray(b).normalize();yaw=y;pitch=p;roll=r;compose();}
// Gentle sway: while "idle" is true, the whole thing rocks a little without changing its position
let swayAmp=0;const _qs=new M3.Quaternion();
function idleSway(now,dt,idle){
  const target=idle?1:0;
  swayAmp+=(target-swayAmp)*Math.min(1,dt/(idle?1600:200));
  if(swayAmp<0.002){if(swayAmp>0){swayAmp=0;compose();}return;}
  compose();
  const sy=0.11*swayAmp*Math.sin(now*2*Math.PI/7000),sp=0.06*swayAmp*Math.sin(now*2*Math.PI/5300+1.3);
  container.quaternion.premultiply(_qs.setFromAxisAngle(rightW,sp)).premultiply(_qs.setFromAxisAngle(upW,sy));
}
function stopSway(){if(swayAmp>0){swayAmp=0;compose();}}

// ================= Render =================
const MINI=96;
function resize(){
  markDirty();
  const w=stage.clientWidth,h=stage.clientHeight;
  renderer.setSize(w,h,false);
  camera.aspect=w/h;
  const k=Math.max(camera.aspect<1.3?1.07:1,0.95/camera.aspect);
  camera.position.copy(CAM).multiplyScalar(k);camera.lookAt(0,0,0);
  camera.updateProjectionMatrix();
}
function render(){
  dirty=false;
  const w=stage.clientWidth,h=stage.clientHeight;
  // Main view: the whole canvas is cleared (no scissor) and drawn
  renderer.setScissorTest(false);
  renderer.setViewport(0,0,w,h);
  renderer.setClearColor(0x000000,0);renderer.clear();
  renderer.render(scene,camera);
  const x=w-MINI-10,y=h-MINI-10;
  // Corner box: limited with scissor and its background painted with a rectangle (no clearing with scissor)
  renderer.setViewport(x,y,MINI,MINI);renderer.setScissor(x,y,MINI,MINI);renderer.setScissorTest(true);
  renderer.fillViewport(LOOK.miniBg,1);
  renderer.render(scene,miniCam,true);
  renderer.setScissorTest(false);
}

return {canvas,scene,camera,container,camDir,rightW,upT,MINI,STICKER_GLOW,cubies,stickerMats,decalMats,
  buildCube,syncGroup,orientFrom,animateLayer,markDirty,isDirty:()=>dirty,
  normAng,animView,viewStart,viewDrag,viewTwist,viewEnd,turnView,stepView,getView,setView,idleSway,stopSway,
  resize,render,base,
  get yaw(){return yaw;},get pitch(){return pitch;},get roll(){return roll;},get viewAnim(){return viewAnim;},get inertia(){return inertia;},get swayAmp(){return swayAmp;}};
}

return {LOOK,createScene};
})();
