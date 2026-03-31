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

// HOLA QUE HACE 

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

export const APPLICATION_METHODS = [
  {
    id: "amn",
    name: "Aplicaciones de Métodos Numéricos",
    type: "amn",
    desc: "Aplicaciones prácticas de métodos numéricos en ingeniería."
  }
];

export const METHOD_GUIDE = {
  biseccion: {
    procedimiento: [
      "Verificar que f(a) · f(b) < 0 (signos opuestos garantizan una raíz en [a, b]).",
      "Calcular el punto medio: c = (a + b) / 2.",
      "Evaluar f(c). Si |f(c)| < ε o el error relativo es menor a la tolerancia, c es la raíz.",
      "Si f(a) · f(c) < 0, la raíz está en [a, c] → actualizar b = c.",
      "Si no, la raíz está en [c, b] → actualizar a = c.",
      "Repetir desde el paso 2 hasta alcanzar la tolerancia.",
    ],
    formula: "c = (a + b) / 2",
    ejemplo: {
      enunciado: "f(x) = x² - x - 2,  [a, b] = [1, 3],  tolerancia = 0.001",
      pasos: [
        { n: 1, a: "1.000000", b: "3.000000", c: "2.000000", fc: "0.000000", err: "—", nota: "f(c) ≈ 0 → convergencia inmediata" },
      ],
      conclusion: "La raíz es x ≈ 2. Se verifica: f(2) = 4 - 2 - 2 = 0 ✓",
    },
  },
  reglafalsa: {
    procedimiento: [
      "Verificar que f(a) · f(b) < 0.",
      "Calcular c mediante interpolación lineal: c = b - f(b)·(b - a) / (f(b) - f(a)).",
      "Evaluar f(c). Si el error relativo es menor a la tolerancia, c es la raíz.",
      "Si f(a) · f(c) < 0 → actualizar b = c. Si no → actualizar a = c.",
      "Repetir. Converge más rápido que bisección en funciones suaves.",
    ],
    formula: "c = b − f(b) · (b − a) / (f(b) − f(a))",
    ejemplo: {
      enunciado: "f(x) = x² - x - 2,  [a, b] = [1, 3]",
      pasos: [
        { n: 1, a: "1.000000", b: "3.000000", c: "1.750000", fc: "-1.1875", err: "—", nota: "f(a)·f(c) > 0 → a = c" },
        { n: 2, a: "1.750000", b: "3.000000", c: "1.928571", fc: "-0.2063", err: "9.26%", nota: "Convergiendo hacia x = 2" },
      ],
      conclusion: "Converge a x ≈ 2 en menos iteraciones que Bisección para esta función.",
    },
  },
  newton: {
    procedimiento: [
      "Elegir un punto inicial x₀ cercano a la raíz.",
      "Calcular f(xₙ) y su derivada f′(xₙ) (numérica o analítica).",
      "Obtener la siguiente aproximación: xₙ₊₁ = xₙ − f(xₙ) / f′(xₙ).",
      "Calcular el error relativo: |xₙ₊₁ − xₙ| / |xₙ₊₁| × 100.",
      "Si el error < tolerancia, xₙ₊₁ es la raíz. Si no, repetir con xₙ = xₙ₊₁.",
      "Advertencia: falla si f′(xₙ) ≈ 0. Tiene convergencia cuadrática.",
    ],
    formula: "xₙ₊₁ = xₙ − f(xₙ) / f′(xₙ)",
    ejemplo: {
      enunciado: "f(x) = x² - x - 2,  x₀ = 1.5",
      pasos: [
        { n: 1, x: "1.500000", fx: "-1.25", fpx: "2.0", x1: "2.125000", err: "29.41%", nota: "f′(x) = 2x - 1 = 2.0" },
        { n: 2, x: "2.125000", fx: "0.390625", fpx: "3.25", x1: "2.005747", err: "5.95%", nota: "Convergencia rápida" },
        { n: 3, x: "2.005747", fx: "0.017366", fpx: "3.011494", x1: "2.000002", err: "0.29%", nota: "Casi exacto" },
      ],
      conclusion: "Convergió en 3 iteraciones. La convergencia cuadrática es evidente.",
    },
  },
  secante: {
    procedimiento: [
      "Elegir dos puntos iniciales x₀ y x₁ (no requieren encerrar la raíz).",
      "Calcular x₂ usando la fórmula de la secante.",
      "Calcular el error relativo: |x₂ − x₁| / |x₂| × 100.",
      "Si el error < tolerancia, x₂ es la raíz.",
      "Actualizar: x₀ = x₁, x₁ = x₂. Repetir.",
      "No requiere calcular f′(x) analíticamente — lo aproxima con dos puntos.",
    ],
    formula: "x₂ = x₁ − f(x₁) · (x₁ − x₀) / (f(x₁) − f(x₀))",
    ejemplo: {
      enunciado: "f(x) = x² - x - 2,  x₀ = 1.5,  x₁ = 2.5",
      pasos: [
        { n: 1, x0: "1.500000", x1: "2.500000", x2: "2.062500", fx2: "0.191406", err: "21.21%", nota: "Primera secante trazada" },
        { n: 2, x0: "2.500000", x1: "2.062500", x2: "1.993976", fx2: "-0.024154", err: "3.41%", nota: "Cruzó la raíz" },
        { n: 3, x0: "2.062500", x1: "1.993976", x2: "2.000091", fx2: "0.000183", err: "0.30%", nota: "Muy cerca" },
      ],
      conclusion: "Convergió sin necesitar la derivada. Útil cuando f′(x) es difícil de obtener.",
    },
  },
  puntofijo: {
    procedimiento: [
      "Reescribir f(x) = 0 como x = g(x) (despejar x de alguna forma).",
      "Elegir x₀ como punto inicial.",
      "Calcular xₙ₊₁ = g(xₙ).",
      "Calcular el error relativo: |xₙ₊₁ − xₙ| / |xₙ₊₁| × 100.",
      "Si el error < tolerancia, xₙ₊₁ es la raíz.",
      "Condición de convergencia: |g′(x)| < 1 en el entorno de la raíz.",
    ],
    formula: "xₙ₊₁ = g(xₙ)",
    ejemplo: {
      enunciado: "f(x) = x² - x - 2 → g(x) = √(x + 2),  x₀ = 1.5",
      pasos: [
        { n: 1, x: "1.500000", gx: "1.870829", err: "19.82%", nota: "g(1.5) = √3.5 ≈ 1.87" },
        { n: 2, x: "1.870829", gx: "1.956559", err: "4.38%", nota: "Convergiendo" },
        { n: 3, x: "1.956559", gx: "1.989056", err: "1.63%", nota: "|g′(x)| = 1/(2√(x+2)) < 1 ✓" },
      ],
      conclusion: "Converge a x ≈ 2. g′(x) = 1/(2√(x+2)) → en x=2, g′ = 0.25 < 1 ✓",
    },
  },
};

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
  ["comparar", "Comparar"],
  ["metodos", "Métodos"],
  ["amn", "Aplicaciones"],
  // ["docs", "Docs"],
];

export const DOCS_CARDS = [
  {
    id: "docs",
    body: "¡Estamos trabajando en la documentación y la implementación IA! Mientras tanto, puedes explorar los métodos disponibles en la sección 'Métodos'.",
    type: "docs",
    title: "Documentación próximamente",
    tag: "Docs"
  }
]

export const AMN_CARDS = [
  {
    id: "semaforo",
    title: "Riesgo Urbano",
    body: "Calcula la densidad óptima de infraestructura de control vial usando Newton-Raphson. Modela el equilibrio entre costo operativo y multa objetivo.",
    tag: "Ingeniería Civil",
    type: "Newton-Raphson",
  },
  {
    id: "estructura",
    title: "Análisis de Viga",
    body: "Determina la posición exacta donde la deflexión de una viga simplemente apoyada alcanza un valor objetivo, usando el método de la Secante sobre la ecuación de la elástica.",
    tag: "Ingeniería Estructural",
    type: "Secante",
  },
  // Futuras aplicaciones:
  // { id: "termodinamica", title: "Transferencia de Calor", tag: "Termodinámica", type: "Bisección / Regla Falsa", body: "..." },
  // { id: "poblacion",     title: "Crecimiento Poblacional", tag: "Demografía",   type: "Punto Fijo",           body: "..." },
];