export const METHODS = [
  { id: "biseccion", name: "Bisección", type: "cerrado" },
  { id: "reglafalsa", name: "Regla Falsa", type: "cerrado" },
  { id: "newton", name: "Newton-Raphson", type: "abierto" },
  { id: "secante", name: "Secante", type: "abierto" },
  { id: "puntofijo", name: "Punto Fijo", type: "abierto" },
];

export const MOCK_ROWS = [
  { n: 1, a: "1.0000", b: "3.0000", c: "2.0000", fc: "-1.0000", err: "—" },
  { n: 2, a: "2.0000", b: "3.0000", c: "2.5000", fc: "0.7500", err: "20.00%" },
  { n: 3, a: "2.0000", b: "2.5000", c: "2.2500", fc: "-0.1875", err: "11.11%" },
  {
    n: 4,
    a: "2.2500",
    b: "2.5000",
    c: "2.3750",
    fc: "0.2656",
    err: "5.26%",
    converged: true,
  },
];

export const METHODS_DETAILS = [
  {
    id: "biseccion",
    name: "Bisección",
    type: "cerrado",
    desc: "Divide el intervalo [a,b] a la mitad en cada iteración. Convergencia garantizada si f(a)·f(b) < 0.",
  },
  {
    id: "reglafalsa",
    name: "Regla Falsa",
    type: "cerrado",
    desc: "Similar a bisección pero usa interpolación lineal para estimar la raíz. Converge más rápido en funciones suaves.",
  },
  {
    id: "newton",
    name: "Newton-Raphson",
    type: "abierto",
    desc: "Usa la derivada f'(x) para encontrar la raíz. Convergencia cuadrática — muy rápido cerca de la raíz.",
  },
  {
    id: "secante",
    name: "Secante",
    type: "abierto",
    desc: "Aproxima la derivada usando dos puntos. No requiere calcular f'(x) analíticamente.",
  },
  {
    id: "puntofijo",
    name: "Punto Fijo",
    type: "abierto",
    desc: "Reescribe f(x)=0 como x=g(x) e itera. Converge si |g'(x)| < 1 en el entorno de la raíz.",
  },
];

export const HOME_CARDS = [
  {
    id: "vision",
    tag: "Visión",
    title: "Referente latinoamericano",
    body: "Ser la plataforma de referencia en Latinoamérica para el aprendizaje de métodos numéricos — en español, gratuita y desde cualquier dispositivo.",
    type: "vision",
  },
  {
    id: "mision",
    tag: "Misión",
    title: "Entender, no solo calcular",
    body: "Ayudar a estudiantes de ingeniería a comprender los métodos numéricos a través de resolución paso a paso e inteligencia artificial.",
    type: "mision",
  },
  {
    id: "valor",
    tag: "Propuesta de Valor",
    title: "Un tutor, no una calculadora",
    body: "Mientras MATLAB requiere licencia y GeoGebra no es iterativo, NumérikaAI explica por qué cada método converge — con IA en español.",
    type: "valor",
  },
  {
    id: "usuario",
    tag: "Usuario Objetivo",
    title: "Estudiantes de ingeniería",
    body: "Alumnos de 2do–4to año de Ingeniería en universidades latinoamericanas. También docentes que buscan herramientas didácticas sin costo.",
    type: "usuario",
  },
];

export const NAV_ITEMS = [
  ["home", "Inicio"],
  ["solver", "Solver"],
  ["metodos", "Métodos"],
  ["docs", "Docs"],
];

export const DOCS_CARDS = [
  {
    id: "docs",
    body: "¡Estamos trabajando en la documentación! Mientras tanto, puedes explorar los métodos disponibles en la sección 'Métodos'.",
    type: "docs",
    title: "Documentación próximamente",
    tag: "Docs"
  }
]