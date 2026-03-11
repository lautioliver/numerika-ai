/**
 * NumérikaAI — Motor de Métodos Numéricos
 * Todos los métodos retornan: { iterations, root, converged, error, steps }
 */

const MAX_ITER = 100;

// ─── Evaluador seguro de funciones ───────────────────────────────────────────
import { useState, useMemo } from "react";

// ─── Motor de cálculo ─────────────────────────────────────────────────────────
function parseFunction(expr) {
  const s = expr
    .replace(/\^/g, "**").replace(/(\d)(x)/g, "$1*$2")
    .replace(/sen/gi,"Math.sin").replace(/sin/gi,"Math.sin")
    .replace(/cos/gi,"Math.cos").replace(/tan/gi,"Math.tan")
    .replace(/ln/gi,"Math.log").replace(/log/gi,"Math.log10")
    .replace(/sqrt/gi,"Math.sqrt").replace(/exp/gi,"Math.exp")
    .replace(/pi/gi,"Math.PI").replace(/e(?![a-z])/g,"Math.E");
  try {
    const fn = new Function("x", `"use strict"; return (${s});`);
    fn(1); return { fn, error: null };
  } catch { return { fn: null, error: "Función inválida." }; }
}
const deriv = (f,x,h=1e-7) => (f(x+h)-f(x-h))/(2*h);

function biseccion(expr,a,b,tol=1e-4){
  const {fn:f,error}=parseFunction(expr); if(error) return {error};
  a=parseFloat(a);b=parseFloat(b);
  if(isNaN(a)||isNaN(b)) return {error:"Valores inválidos para a y b."};
  if(f(a)*f(b)>=0) return {error:"f(a)·f(b) debe ser < 0. El intervalo no contiene una raíz."};
  const its=[];let prev=null;
  for(let i=1;i<=60;i++){
    const c=(a+b)/2,fc=f(c),fa=f(a);
    const err=prev!==null?Math.abs((c-prev)/c)*100:null;
    its.push({n:i,a:+a.toFixed(6),b:+b.toFixed(6),c:+c.toFixed(6),fc:+fc.toFixed(6),err:err!==null?+err.toFixed(4):null,converged:err!==null&&err<tol*100});
    if(Math.abs(fc)<1e-12||(err!==null&&err<tol*100)) return {iterations:its,root:+c.toFixed(8),converged:true,totalIter:i};
    if(fa*fc<0) b=c; else a=c; prev=c;
  }
  return {iterations:its,root:+((a+b)/2).toFixed(8),converged:false,totalIter:60};
}
function reglaFalsa(expr,a,b,tol=1e-4){
  const {fn:f,error}=parseFunction(expr); if(error) return {error};
  a=parseFloat(a);b=parseFloat(b);
  if(isNaN(a)||isNaN(b)) return {error:"Valores inválidos."};
  if(f(a)*f(b)>=0) return {error:"f(a)·f(b) debe ser < 0."};
  const its=[];let prev=null;
  for(let i=1;i<=60;i++){
    const fa=f(a),fb=f(b),c=b-(fb*(b-a))/(fb-fa),fc=f(c);
    const err=prev!==null?Math.abs((c-prev)/c)*100:null;
    its.push({n:i,a:+a.toFixed(6),b:+b.toFixed(6),c:+c.toFixed(6),fc:+fc.toFixed(6),err:err!==null?+err.toFixed(4):null,converged:err!==null&&err<tol*100});
    if(Math.abs(fc)<1e-12||(err!==null&&err<tol*100)) return {iterations:its,root:+c.toFixed(8),converged:true,totalIter:i};
    if(fa*fc<0) b=c; else a=c; prev=c;
  }
  return {iterations:its,root:null,converged:false,totalIter:60};
}
function newtonRaphson(expr,x0,tol=1e-4){
  const {fn:f,error}=parseFunction(expr); if(error) return {error};
  x0=parseFloat(x0); if(isNaN(x0)) return {error:"x₀ inválido."};
  const its=[];let x=x0;
  for(let i=1;i<=60;i++){
    const fx=f(x),fpx=deriv(f,x);
    if(Math.abs(fpx)<1e-12) return {error:"Derivada ≈ 0 en x="+x.toFixed(4)};
    const x1=x-fx/fpx,err=Math.abs((x1-x)/x1)*100;
    its.push({n:i,x:+x.toFixed(6),fx:+fx.toFixed(6),fpx:+fpx.toFixed(6),x1:+x1.toFixed(6),err:+err.toFixed(4),converged:err<tol*100});
    if(err<tol*100) return {iterations:its,root:+x1.toFixed(8),converged:true,totalIter:i};
    x=x1;
  }
  return {iterations:its,root:+x.toFixed(8),converged:false,totalIter:60};
}
function secante(expr,x0,x1,tol=1e-4){
  const {fn:f,error}=parseFunction(expr); if(error) return {error};
  x0=parseFloat(x0);x1=parseFloat(x1);
  if(isNaN(x0)||isNaN(x1)) return {error:"Valores inválidos."};
  const its=[];let xp=x0,xc=x1;
  for(let i=1;i<=60;i++){
    const f0=f(xp),f1=f(xc);
    if(Math.abs(f1-f0)<1e-12) return {error:"División por cero."};
    const x2=xc-f1*(xc-xp)/(f1-f0),err=Math.abs((x2-xc)/x2)*100;
    its.push({n:i,x0:+xp.toFixed(6),x1:+xc.toFixed(6),x2:+x2.toFixed(6),fx2:+f(x2).toFixed(6),err:+err.toFixed(4),converged:err<tol*100});
    if(err<tol*100) return {iterations:its,root:+x2.toFixed(8),converged:true,totalIter:i};
    xp=xc;xc=x2;
  }
  return {iterations:its,root:+xc.toFixed(8),converged:false,totalIter:60};
}
function puntoFijo(exprG,x0,tol=1e-4){
  const {fn:g,error}=parseFunction(exprG); if(error) return {error};
  x0=parseFloat(x0); if(isNaN(x0)) return {error:"x₀ inválido."};
  const its=[];let x=x0;
  for(let i=1;i<=60;i++){
    let gx;try{gx=g(x);}catch{return {error:"Error evaluando g(x)"};}
    if(!isFinite(gx)) return {error:"g(x) diverge en iteración "+i};
    const err=Math.abs((gx-x)/gx)*100;
    its.push({n:i,x:+x.toFixed(6),gx:+gx.toFixed(6),err:+err.toFixed(4),converged:err<tol*100});
    if(err<tol*100) return {iterations:its,root:+gx.toFixed(8),converged:true,totalIter:i};
    if(Math.abs(gx)>1e8) return {error:"El método diverge."};
    x=gx;
  }
  return {iterations:its,root:+x.toFixed(8),converged:false,totalIter:60};
}
function getPoints(expr,xMin,xMax,n=200){
  const {fn:f,error}=parseFunction(expr); if(error) return [];
  const pts=[];
  for(let i=0;i<=n;i++){
    const x=xMin+i*(xMax-xMin)/n;
    try{const y=f(x);pts.push({x:+x.toFixed(3),y:isFinite(y)&&Math.abs(y)<1e5?+y.toFixed(5):null});}
    catch{pts.push({x:+x.toFixed(3),y:null});}
  }
  return pts;
}

// ─── Paleta ───────────────────────────────────────────────────────────────────
const C={cream:"#E3DFBA",sage:"#C8D6BF",tealLt:"#93CCC6",teal:"#6CBDB5",dark:"#1A1F1E",bg:"#f5f3e8",surface:"#faf9f2",border:"#dddbc8",muted:"#7a8a82",text:"#1A1F1E"};

// ─── Guías por método ─────────────────────────────────────────────────────────
const GUIDES = {
  biseccion: {
    title: "¿Cómo funciona la Bisección?",
    steps: [
      { label: "Elegí el intervalo", text: "Necesitás a y b tal que f(a) y f(b) tengan signos opuestos. Eso garantiza que hay al menos una raíz en [a, b] (Teorema de Bolzano)." },
      { label: "Calculá el punto medio", text: "c = (a + b) / 2. Éste es tu candidato a raíz en cada iteración." },
      { label: "Reducí el intervalo", text: "Si f(a)·f(c) < 0, la raíz está en [a, c]. Si no, está en [c, b]. Reemplazás el extremo que tiene el mismo signo que f(c)." },
      { label: "Repetí hasta converger", text: "El error se calcula como |( cₙ − cₙ₋₁) / cₙ| × 100. Cuando ese porcentaje sea menor que tu tolerancia, el método convergió." },
    ],
    example: "f(x) = x² − x − 2,  [a=1, b=3]\nc₁ = (1+3)/2 = 2 → f(2) = −0.0 < 0 → nuevo intervalo [2, 3]\nc₂ = (2+3)/2 = 2.5 → f(2.5) = 0.75 > 0 → nuevo intervalo [2, 2.5]\n⋯ converge a x ≈ 2.0000 (raíz exacta: x = 2)",
  },
  reglafalsa: {
    title: "¿Cómo funciona la Regla Falsa?",
    steps: [
      { label: "Misma condición inicial", text: "Al igual que bisección, necesitás f(a)·f(b) < 0 para garantizar la existencia de la raíz en [a, b]." },
      { label: "Interpolación lineal", text: "En vez de tomar el punto medio, trazás una recta entre (a, f(a)) y (b, f(b)) y calculás donde cruza el eje x: c = b − f(b)·(b−a) / (f(b)−f(a))" },
      { label: "Reducí el intervalo", text: "Igual que bisección: reemplazás el extremo del mismo signo que f(c). La ventaja es que c se acerca más rápido a la raíz en funciones suaves." },
      { label: "Cuidado con la convergencia lenta", text: "Si la función es muy curva, uno de los extremos puede quedar fijo por muchas iteraciones (convergencia unilateral). Es una limitación conocida del método." },
    ],
    example: "f(x) = x² − x − 2,  [a=1, b=3]\nc₁ = 3 − f(3)·(3−1)/(f(3)−f(1)) = 3 − 4·2/(4−(−2)) = 3 − 8/6 ≈ 1.667\nf(1.667) < 0 → nuevo intervalo [1.667, 3]\n⋯ converge más rápido que bisección hacia x = 2",
  },
  newton: {
    title: "¿Cómo funciona Newton-Raphson?",
    steps: [
      { label: "Elegí un punto inicial x₀", text: "Tiene que estar cerca de la raíz. Si elegís un punto donde f′(x) ≈ 0, el método puede fallar o divergir." },
      { label: "Trazá la tangente", text: "La idea geométrica es trazar la recta tangente a f en x₀ y ver dónde cruza el eje x. Eso da: x₁ = x₀ − f(x₀) / f′(x₀)" },
      { label: "Iterá desde el nuevo punto", text: "Usás x₁ como nuevo punto de partida y repetís el proceso. La convergencia es cuadrática: los decimales correctos se duplican en cada iteración." },
      { label: "Derivada numérica", text: "NumérikaAI calcula f′(x) automáticamente con diferencias centrales: f′(x) ≈ [f(x+h) − f(x−h)] / 2h, con h = 10⁻⁷" },
    ],
    example: "f(x) = x² − x − 2,  x₀ = 3\nf(3) = 4,  f′(3) ≈ 5\nx₁ = 3 − 4/5 = 2.2\nf(2.2) = 0.24,  f′(2.2) ≈ 3.4\nx₂ = 2.2 − 0.24/3.4 ≈ 2.029\n⋯ converge muy rápido a x = 2",
  },
  secante: {
    title: "¿Cómo funciona el Método de la Secante?",
    steps: [
      { label: "Dos puntos iniciales", text: "Necesitás x₀ y x₁. No necesitan tener signos opuestos como en bisección. Cuanto más cerca de la raíz, mejor." },
      { label: "Aproximá la derivada", text: "En vez de calcular f′(x), usás la pendiente de la recta secante entre los dos puntos: f′ ≈ (f(x₁)−f(x₀)) / (x₁−x₀)" },
      { label: "Fórmula de actualización", text: "x₂ = x₁ − f(x₁) · (x₁−x₀) / (f(x₁)−f(x₀)). Luego x₀ ← x₁, x₁ ← x₂ y repetís." },
      { label: "Ventaja vs Newton", text: "No necesitás calcular f′(x) analíticamente. La convergencia es superlineal (orden ≈ 1.618, el número áureo), más lenta que Newton pero más flexible." },
    ],
    example: "f(x) = x² − x − 2,  x₀=0, x₁=3\nf(0)=−2,  f(3)=4\nx₂ = 3 − 4·(3−0)/(4−(−2)) = 3 − 12/6 = 1.0\nf(1)=−2,  f(3)=4\nx₃ = 3 − 4·(3−1)/(4−(−2)) ≈ 1.667\n⋯ converge a x = 2",
  },
  puntofijo: {
    title: "¿Cómo funciona Punto Fijo?",
    steps: [
      { label: "Reformulá la ecuación", text: "Partís de f(x) = 0 y la reescribís como x = g(x). Hay muchas formas de despejar, y la elección de g(x) importa mucho." },
      { label: "Iterá directamente", text: "xₙ₊₁ = g(xₙ). Arrancás desde x₀ y aplicás g repetidamente." },
      { label: "Condición de convergencia", text: "El método converge si |g′(x)| < 1 en el entorno de la raíz. Si |g′(x)| ≥ 1, diverge. Por eso la elección de g(x) es crítica." },
      { label: "Ejemplo de despeje", text: "Si f(x) = x²−x−2 = 0, podés despejar x = √(x+2), es decir g(x) = sqrt(x+2). Verificá que |g′(x)| < 1 cerca de la raíz." },
    ],
    example: "f(x) = x² − x − 2 = 0\ng(x) = sqrt(x + 2),  x₀ = 1.5\nx₁ = sqrt(1.5 + 2) = sqrt(3.5) ≈ 1.871\nx₂ = sqrt(1.871 + 2) ≈ 1.967\nx₃ = sqrt(1.967 + 2) ≈ 1.992\n⋯ converge lentamente a x = 2",
  },
};

const METHODS=[
  {id:"biseccion",name:"Bisección",type:"cerrado",desc:"Divide [a,b] a la mitad. Convergencia garantizada si f(a)·f(b) < 0.",inputs:["fx","ab","tol"],cols:["n","a","b","c","fc","err"],labels:{n:"n",a:"a",b:"b",c:"c",fc:"f(c)",err:"Error %"},run:(v)=>biseccion(v.fx,v.a,v.b,parseFloat(v.tol)||1e-4)},
  {id:"reglafalsa",name:"Regla Falsa",type:"cerrado",desc:"Interpolación lineal entre a y b. Más veloz en funciones suaves.",inputs:["fx","ab","tol"],cols:["n","a","b","c","fc","err"],labels:{n:"n",a:"a",b:"b",c:"c",fc:"f(c)",err:"Error %"},run:(v)=>reglaFalsa(v.fx,v.a,v.b,parseFloat(v.tol)||1e-4)},
  {id:"newton",name:"Newton-Raphson",type:"abierto",desc:"Usa f′(x) numérica. Convergencia cuadrática — muy rápido cerca de la raíz.",inputs:["fx","x0","tol"],cols:["n","x","fx","fpx","x1","err"],labels:{n:"n",x:"xₙ",fx:"f(xₙ)",fpx:"f′(xₙ)",x1:"xₙ₊₁",err:"Error %"},run:(v)=>newtonRaphson(v.fx,v.x0,parseFloat(v.tol)||1e-4)},
  {id:"secante",name:"Secante",type:"abierto",desc:"Aproxima f′(x) con dos puntos. No requiere derivada analítica.",inputs:["fx","x0","x1sec","tol"],cols:["n","x0","x1","x2","fx2","err"],labels:{n:"n",x0:"x₀",x1:"x₁",x2:"x₂",fx2:"f(x₂)",err:"Error %"},run:(v)=>secante(v.fx,v.x0,v.x1sec,parseFloat(v.tol)||1e-4)},
  {id:"puntofijo",name:"Punto Fijo",type:"abierto",desc:"Itera x = g(x). Converge si |g′(x)| < 1 en el entorno de la raíz.",inputs:["gx","x0","tol"],cols:["n","x","gx","err"],labels:{n:"n",x:"xₙ",gx:"g(xₙ)",err:"Error %"},run:(v)=>puntoFijo(v.gx,v.x0,parseFloat(v.tol)||1e-4)},
];

// ─── Tooltip interactivo ──────────────────────────────────────────────────────
function InteractiveChart({ points, root, fnLabel }) {
  const [hovered, setHovered] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const valid = points.filter(p => p.y !== null);
  if (valid.length < 2) return (
    <div style={{height:220,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:C.muted}}>Sin datos para graficar</div>
  );

  const W = 580, H = 200;
  const pad = { t: 16, r: 16, b: 28, l: 44 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;

  const xs = valid.map(p => p.x), ys = valid.map(p => p.y);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = Math.min(...ys), yMax = Math.max(...ys);
  const yRange = yMax - yMin || 1;
  const xRange = xMax - xMin || 1;

  const cx = x => pad.l + ((x - xMin) / xRange) * innerW;
  const cy = y => pad.t + innerH - ((y - yMin) / yRange) * innerH;

  const d = valid.map((p,i) => `${i===0?"M":"L"}${cx(p.x).toFixed(1)},${cy(p.y).toFixed(1)}`).join(" ");
  const zero = cy(0);
  const rootX = root !== null ? cx(root) : null;

  // Y-axis ticks
  const yTicks = 4;
  const yTickVals = Array.from({length:yTicks+1},(_,i)=>yMin+i*(yRange/yTicks));
  const xTicks = 5;
  const xTickVals = Array.from({length:xTicks+1},(_,i)=>xMin+i*(xRange/xTicks));

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = (e.clientX - rect.left) * (W / rect.width);
    const svgY = (e.clientY - rect.top) * (H / rect.height);
    if (svgX < pad.l || svgX > W - pad.r) { setHovered(null); return; }
    const xVal = xMin + ((svgX - pad.l) / innerW) * xRange;
    // find nearest point
    let nearest = valid[0], minDist = Infinity;
    for (const p of valid) {
      const dist = Math.abs(p.x - xVal);
      if (dist < minDist) { minDist = dist; nearest = p; }
    }
    setHovered(nearest);
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div style={{ position: "relative", userSelect: "none" }}>
      {/* Label */}
      <div style={{fontSize:9,letterSpacing:"1.5px",textTransform:"uppercase",color:C.muted,marginBottom:8,display:"flex",alignItems:"center",gap:8}}>
        <span style={{display:"inline-block",width:16,height:1.5,background:C.teal}}/>
        {fnLabel}
        {root !== null && (
          <span style={{marginLeft:"auto",color:C.teal,fontSize:9}}>raíz ≈ {root}</span>
        )}
      </div>

      <svg
        width="100%" viewBox={`0 0 ${W} ${H}`}
        style={{ display:"block", cursor:"crosshair" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHovered(null)}
      >
        {/* Grid lines */}
        {yTickVals.map((v,i) => (
          <g key={i}>
            <line x1={pad.l} y1={cy(v)} x2={W-pad.r} y2={cy(v)} stroke={C.border} strokeWidth={0.6} strokeDasharray="3,4"/>
            <text x={pad.l-5} y={cy(v)+3.5} fontSize={8} fill={C.muted} textAnchor="end" fontFamily="monospace">{v.toFixed(1)}</text>
          </g>
        ))}
        {xTickVals.map((v,i) => (
          <g key={i}>
            <line x1={cx(v)} y1={pad.t} x2={cx(v)} y2={H-pad.b} stroke={C.border} strokeWidth={0.6} strokeDasharray="3,4"/>
            <text x={cx(v)} y={H-pad.b+12} fontSize={8} fill={C.muted} textAnchor="middle" fontFamily="monospace">{v.toFixed(1)}</text>
          </g>
        ))}

        {/* Axes */}
        <line x1={pad.l} y1={pad.t} x2={pad.l} y2={H-pad.b} stroke={C.border} strokeWidth={1}/>
        <line x1={pad.l} y1={H-pad.b} x2={W-pad.r} y2={H-pad.b} stroke={C.border} strokeWidth={1}/>

        {/* Zero line */}
        {zero >= pad.t && zero <= H-pad.b && (
          <line x1={pad.l} y1={zero} x2={W-pad.r} y2={zero} stroke={C.muted} strokeWidth={1} strokeDasharray="5,3" opacity={0.6}/>
        )}

        {/* Root line */}
        {rootX && (
          <>
            <line x1={rootX} y1={pad.t} x2={rootX} y2={H-pad.b} stroke={C.teal} strokeWidth={1.5} strokeDasharray="5,3" opacity={0.8}/>
            <circle cx={rootX} cy={zero>=pad.t&&zero<=H-pad.b?zero:H-pad.b} r={4} fill={C.teal} opacity={0.9}/>
          </>
        )}

        {/* Curve */}
        <path d={d} fill="none" stroke={C.teal} strokeWidth={2} strokeLinejoin="round"/>

        {/* Hover indicator */}
        {hovered && (
          <>
            <line x1={cx(hovered.x)} y1={pad.t} x2={cx(hovered.x)} y2={H-pad.b} stroke={C.dark} strokeWidth={0.8} strokeDasharray="2,3" opacity={0.4}/>
            <circle cx={cx(hovered.x)} cy={cy(hovered.y)} r={4} fill={C.surface} stroke={C.teal} strokeWidth={2}/>
          </>
        )}
      </svg>

      {/* Floating tooltip */}
      {hovered && (
        <div style={{
          position:"absolute", top: Math.min(mousePos.y - 52, 140), left: Math.min(mousePos.x + 12, 420),
          background:C.dark, borderRadius:8, padding:"8px 14px",
          pointerEvents:"none", zIndex:10, whiteSpace:"nowrap", boxShadow:"0 4px 16px rgba(0,0,0,0.15)"
        }}>
          <div style={{fontSize:10,color:C.tealLt,fontFamily:"'DM Mono',monospace",letterSpacing:"0.5px"}}>
            x = <strong style={{color:C.cream}}>{hovered.x}</strong>
          </div>
          <div style={{fontSize:10,color:C.tealLt,fontFamily:"'DM Mono',monospace",marginTop:2,letterSpacing:"0.5px"}}>
            f(x) = <strong style={{color:C.cream}}>{hovered.y}</strong>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Acordeón de guía ─────────────────────────────────────────────────────────
function GuideAccordion({ methodId }) {
  const [open, setOpen] = useState(false);
  const guide = GUIDES[methodId];

  return (
    <div style={{border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden",marginTop:20}}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{width:"100%",background:open?C.bg:C.surface,border:"none",padding:"13px 18px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",fontFamily:"'DM Mono',monospace",transition:"background 0.2s"}}
      >
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.teal} strokeWidth="1.8">
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
          </svg>
          <span style={{fontSize:10,letterSpacing:"2px",textTransform:"uppercase",color:C.text}}>{guide.title}</span>
        </div>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2"
          style={{transform:open?"rotate(180deg)":"rotate(0deg)",transition:"transform 0.25s"}}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {open && (
        <div style={{padding:"20px 18px",borderTop:`1px solid ${C.border}`,background:C.bg}}>
          {/* Steps */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
            {guide.steps.map((step, i) => (
              <div key={i} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"12px 14px"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                  <div style={{width:18,height:18,borderRadius:"50%",background:C.teal,color:"white",fontSize:9,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontWeight:600}}>{i+1}</div>
                  <span style={{fontSize:10,letterSpacing:"1px",color:C.text,fontFamily:"'DM Mono',monospace"}}>{step.label}</span>
                </div>
                <p style={{fontSize:11,color:C.muted,lineHeight:1.75,margin:0}}>{step.text}</p>
              </div>
            ))}
          </div>

          {/* Example */}
          <div style={{background:"#1e2826",borderRadius:10,padding:"16px 18px"}}>
            <div style={{fontSize:9,letterSpacing:"2px",textTransform:"uppercase",color:C.tealLt,marginBottom:10,display:"flex",alignItems:"center",gap:7}}>
              <span style={{width:4,height:4,borderRadius:"50%",background:C.tealLt,display:"inline-block"}}/>
              Ejemplo paso a paso
            </div>
            <pre style={{margin:0,fontFamily:"'DM Mono',monospace",fontSize:11,color:C.sage,lineHeight:1.9,whiteSpace:"pre-wrap"}}>
              {guide.example}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────
function Field({label,value,onChange,placeholder,hint}){
  const [f,setF]=useState(false);
  return(
    <div style={{marginBottom:16}}>
      <label style={{display:"block",fontSize:9,letterSpacing:"2px",textTransform:"uppercase",color:C.muted,marginBottom:6}}>{label}</label>
      <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        onFocus={()=>setF(true)} onBlur={()=>setF(false)}
        style={{width:"100%",background:C.bg,border:`1px solid ${f?C.teal:C.border}`,borderRadius:8,padding:"9px 12px",fontFamily:"'DM Mono',monospace",fontSize:13,color:C.dark,outline:"none",boxSizing:"border-box",transition:"border-color 0.2s"}}/>
      {hint&&<div style={{fontSize:9,color:C.muted,marginTop:3}}>{hint}</div>}
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function SolverRefined(){
  const [mid,setMid]=useState("biseccion");
  const [vals,setVals]=useState({fx:"x^2 - x - 2",a:"1",b:"3",x0:"1.5",x1sec:"2.5",gx:"sqrt(x + 2)",tol:"0.0001"});
  const [result,setResult]=useState(null);
  const [calcErr,setCalcErr]=useState(null);

  const method=METHODS.find(m=>m.id===mid);
  const set=(k,v)=>setVals(p=>({...p,[k]:v}));

  const run=()=>{
    setCalcErr(null);setResult(null);
    const r=method.run(vals);
    if(r.error){setCalcErr(r.error);return;}
    setResult(r);
  };

  const graphExpr=mid==="puntofijo"?vals.gx:vals.fx;
  const points=useMemo(()=>{
    let xMin=-4,xMax=6;
    if(method.type==="cerrado"){const a=parseFloat(vals.a),b=parseFloat(vals.b);if(!isNaN(a)&&!isNaN(b)){xMin=a-Math.abs(b-a)*0.6;xMax=b+Math.abs(b-a)*0.6;}}
    else{const x0=parseFloat(vals.x0);if(!isNaN(x0)){xMin=x0-4;xMax=x0+5;}}
    return getPoints(graphExpr,xMin,xMax);
  },[graphExpr,vals.a,vals.b,vals.x0,mid]);

  return(
    <div style={{fontFamily:"'DM Mono',monospace",color:C.dark,background:C.bg,minHeight:"100vh",padding:"32px 24px"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@300;400;500&display=swap');`}</style>

      {/* Header */}
      <div style={{marginBottom:28}}>
        <div style={{fontSize:10,letterSpacing:"3px",textTransform:"uppercase",color:C.muted,marginBottom:8,display:"flex",alignItems:"center",gap:10}}>
          <span style={{display:"inline-block",width:18,height:1,background:C.teal}}/>Solver
        </div>
        <h2 style={{fontFamily:"'DM Serif Display',serif",fontSize:26,fontWeight:400,color:C.dark,margin:0}}>
          Calculá <em style={{color:C.teal,fontStyle:"italic"}}>paso a paso</em>
        </h2>
      </div>

      {/* Method tabs */}
      <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:18}}>
        {METHODS.map(m=>(
          <button key={m.id} onClick={()=>{setMid(m.id);setResult(null);setCalcErr(null);}}
            style={{padding:"8px 14px",borderRadius:8,cursor:"pointer",border:`1px solid ${mid===m.id?C.teal:C.border}`,background:mid===m.id?"rgba(108,189,181,0.1)":C.surface,color:mid===m.id?C.teal:C.muted,fontFamily:"'DM Mono',monospace",fontSize:11,lineHeight:1.4,textAlign:"left"}}>
            <div>{m.name}</div>
            <div style={{fontSize:9,letterSpacing:"1.5px",textTransform:"uppercase",opacity:0.7}}>{m.type}</div>
          </button>
        ))}
      </div>

      <div style={{fontSize:11,color:C.muted,lineHeight:1.7,padding:"10px 14px",background:C.surface,border:`1px solid ${C.border}`,borderLeft:`3px solid ${C.teal}`,borderRadius:8,marginBottom:22}}>
        {method.desc}
      </div>

      {/* Grid — config | results */}
      <div style={{display:"grid",gridTemplateColumns:"250px 1fr",gap:16,alignItems:"start"}}>

        {/* Config */}
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden"}}>
          <div style={{padding:"13px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:9,letterSpacing:"2.5px",textTransform:"uppercase",color:C.muted}}>Configuración</span>
            <span style={{fontSize:9,padding:"3px 9px",borderRadius:20,color:method.type==="cerrado"?C.teal:"#6a8a6a",background:method.type==="cerrado"?"rgba(108,189,181,0.1)":"rgba(200,214,191,0.15)",border:`1px solid ${method.type==="cerrado"?"rgba(108,189,181,0.3)":"rgba(200,214,191,0.4)"}`}}>{method.type}</span>
          </div>
          <div style={{padding:18}}>
            {method.inputs.includes("fx")&&<Field label="f(x)" value={vals.fx} onChange={v=>set("fx",v)} placeholder="x^2 - x - 2" hint="^ potencia · * multiplicar"/>}
            {method.inputs.includes("gx")&&<Field label="g(x)" value={vals.gx} onChange={v=>set("gx",v)} placeholder="sqrt(x + 2)" hint="Despejá x = g(x)"/>}
            {method.inputs.includes("ab")&&(
              <div style={{marginBottom:16}}>
                <label style={{display:"block",fontSize:9,letterSpacing:"2px",textTransform:"uppercase",color:C.muted,marginBottom:6}}>Intervalo [a, b]</label>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <input value={vals.a} onChange={e=>set("a",e.target.value)} placeholder="a" style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 12px",fontFamily:"'DM Mono',monospace",fontSize:13,color:C.dark,outline:"none",width:"100%",boxSizing:"border-box"}}/>
                  <input value={vals.b} onChange={e=>set("b",e.target.value)} placeholder="b" style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 12px",fontFamily:"'DM Mono',monospace",fontSize:13,color:C.dark,outline:"none",width:"100%",boxSizing:"border-box"}}/>
                </div>
              </div>
            )}
            {method.inputs.includes("x0")&&<Field label="Punto inicial x₀" value={vals.x0} onChange={v=>set("x0",v)} placeholder="1.5"/>}
            {method.inputs.includes("x1sec")&&<Field label="Segundo punto x₁" value={vals.x1sec} onChange={v=>set("x1sec",v)} placeholder="2.5"/>}
            <Field label="Tolerancia" value={vals.tol} onChange={v=>set("tol",v)} placeholder="0.0001" hint="0.001 → error < 0.1%"/>

            {calcErr&&<div style={{padding:"10px 12px",background:"rgba(200,80,60,0.08)",border:"1px solid rgba(200,80,60,0.2)",borderRadius:8,marginBottom:14,fontSize:11,color:"#b05040",lineHeight:1.6}}>{calcErr}</div>}
            <div style={{borderTop:`1px solid ${C.border}`,margin:"16px 0"}}/>
            <button onClick={run} style={{width:"100%",background:C.dark,color:C.cream,border:"none",borderRadius:8,padding:12,fontFamily:"'DM Mono',monospace",fontSize:10,letterSpacing:"2px",textTransform:"uppercase",cursor:"pointer"}}>
              Calcular
            </button>
          </div>
        </div>

        {/* Results */}
        <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden"}}>
          <div style={{padding:"13px 18px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:9,letterSpacing:"2.5px",textTransform:"uppercase",color:C.muted}}>Resultado</span>
            {result&&<span style={{fontSize:9,color:C.muted,letterSpacing:"1px"}}>{result.totalIter} iteraciones</span>}
          </div>
          <div style={{padding:18}}>
            {!result&&!calcErr&&(
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:260,color:C.muted,gap:10}}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                <p style={{fontSize:10,letterSpacing:"2px",textTransform:"uppercase",margin:0}}>Configurá y calculá</p>
              </div>
            )}

            {result&&(
              <>
                {/* Status */}
                <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:8,marginBottom:18,background:result.converged?"rgba(108,189,181,0.1)":"rgba(212,168,75,0.1)",border:`1px solid ${result.converged?"rgba(108,189,181,0.3)":"rgba(212,168,75,0.3)"}`}}>
                  <div style={{width:6,height:6,borderRadius:"50%",background:result.converged?C.teal:"#d4a84b"}}/>
                  <span style={{fontSize:10,letterSpacing:"1.5px",textTransform:"uppercase",color:result.converged?C.teal:"#d4a84b"}}>
                    {result.converged?`Convergencia · raíz ≈ ${result.root}`:`Sin convergencia tras ${result.totalIter} iter.`}
                  </span>
                </div>

                {/* Interactive chart */}
                <div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:12,padding:"16px 14px 10px",marginBottom:18}}>
                  <InteractiveChart
                    points={points}
                    root={result.root}
                    fnLabel={mid==="puntofijo"?`g(x) = ${vals.gx}`:`f(x) = ${vals.fx}`}
                  />
                </div>

                {/* Table */}
                <div style={{overflowX:"auto",borderRadius:8,border:`1px solid ${C.border}`}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                    <thead>
                      <tr style={{background:C.bg}}>
                        {method.cols.map(col=>(
                          <th key={col} style={{fontSize:9,letterSpacing:"1.5px",textTransform:"uppercase",color:C.muted,textAlign:"left",padding:"8px 10px",borderBottom:`1px solid ${C.border}`,whiteSpace:"nowrap"}}>
                            {method.labels[col]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.iterations.map((row,i)=>(
                        <tr key={i} style={{background:row.converged?"rgba(108,189,181,0.07)":"transparent"}}>
                          {method.cols.map(col=>(
                            <td key={col} style={{padding:"7px 10px",borderBottom:`1px solid ${C.border}`,color:row.converged&&col==="err"?C.teal:C.dark,fontFamily:"'DM Mono',monospace"}}>
                              {row[col]===null||row[col]===undefined?"—":col==="err"&&row[col]!==null?`${row[col]}%`:row[col]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* AI placeholder */}
                <div style={{padding:"12px 14px",background:"rgba(200,214,191,0.15)",border:"1px solid rgba(200,214,191,0.4)",borderRadius:8,marginTop:16}}>
                  <div style={{fontSize:9,letterSpacing:"2px",textTransform:"uppercase",color:"#6a8a6a",marginBottom:5,display:"flex",alignItems:"center",gap:6}}>
                    <span style={{width:4,height:4,borderRadius:"50%",background:C.sage,display:"inline-block"}}/>
                    Explicación IA · próximamente
                  </div>
                  <p style={{fontSize:11,color:C.muted,lineHeight:1.8,fontStyle:"italic",margin:0}}>
                    Aquí aparecerá la explicación generada por IA sobre la convergencia del método y el comportamiento de cada iteración.
                  </p>
                </div>
              </>
            )}

            {/* Guide accordion — siempre visible abajo */}
            <GuideAccordion methodId={mid}/>
          </div>
        </div>
      </div>
    </div>
  );
}