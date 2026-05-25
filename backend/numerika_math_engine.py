"""
NumérikaAI — Motor Matemático Headless
FastAPI + SymPy backend para cálculo simbólico.

Endpoints:
  GET  /health              → Health check
  POST /api/math/derive     → Derivada
  POST /api/math/integrate  → Integral (definida / indefinida)
  POST /api/math/simplify   → Simplificación
  POST /api/math/factorize  → Factorización
  POST /api/math/solve      → Resolver ecuación
  POST /api/math/validate   → Validar sintaxis
  POST /api/math/ode/solve  → EDO orden superior ({ plain, latex }, steps con LaTeX)
  POST /api/math/ode/system → Sistema de EDOs ({ plain, latex } por variable)
"""

import re
import os
import json
import sqlite3
import hashlib
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional

import sympy
from sympy import (
    symbols, sympify, diff, integrate as sym_integrate,
    simplify as sym_simplify, factor, solve, latex, pi, E,
    sqrt, sin, cos, tan, log, exp, oo,
    Function, Eq, Derivative, dsolve, classify_ode,
)
from sympy.parsing.sympy_parser import (
    parse_expr,
    standard_transformations,
    implicit_multiplication_application,
    convert_xor,
)

# ─── Logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("numerika-math")


# ═══════════════════════════════════════════════════════════════════════════════
#  SYNTAX NORMALIZER
# ═══════════════════════════════════════════════════════════════════════════════

class SyntaxNormalizer:
    """
    Normaliza la entrada del usuario a sintaxis compatible con SymPy
    y valida contra inyecciones de código malicioso.
    """

    # Patrones peligrosos que NUNCA deben pasar
    _BLACKLIST = [
        "__import__", "import ", "exec(", "eval(", "compile(",
        "os.", "sys.", "subprocess", "open(", "file(",
        "globals", "locals", "getattr", "setattr", "delattr",
        "__builtins__", "__class__", "__subclasses__",
        "breakpoint", "input(",
    ]

    # Caracteres válidos en una expresión matemática
    _VALID_CHARS = re.compile(
        r'^[a-zA-Z0-9\s\+\-\*/\^().,=_|!\[\]{}]+$'
    )

    _VALID_CHARS_ODE = re.compile(
        r"^[a-zA-Z0-9\s\+\-\*/\^().,=_|!\[\]{}']+$"
    )

    @staticmethod
    def normalize(expression: str) -> str:
        """Convierte notación amigable a sintaxis SymPy."""
        expr = expression.strip()

        # Reemplazos de notación
        expr = expr.replace("^", "**")          # potencia
        expr = expr.replace("ln(", "log(")      # ln → log natural
        expr = expr.replace("sen(", "sin(")     # español → inglés
        expr = expr.replace("tg(", "tan(")      # español → inglés
        expr = expr.replace("raiz(", "sqrt(")   # español → inglés
        expr = expr.replace("π", "pi")          # símbolo → nombre

        # Eliminar espacios superfluos
        expr = " ".join(expr.split())

        return expr

    @classmethod
    def validate(cls, expression: str) -> tuple[bool, Optional[str]]:
        """Valida una expresión contra inyecciones y sintaxis inválida."""
        if not expression or not expression.strip():
            return False, "La expresión está vacía."

        lowered = expression.lower()

        # Verificar blacklist
        for pattern in cls._BLACKLIST:
            if pattern.lower() in lowered:
                return False, f"Expresión rechazada por seguridad."

        # Verificar caracteres válidos
        if not cls._VALID_CHARS.match(expression):
            # Permitir algunos caracteres Unicode comunes
            cleaned = expression.replace("π", "pi").replace("√", "sqrt")
            if not cls._VALID_CHARS.match(cleaned):
                return False, "La expresión contiene caracteres no permitidos."

        return True, None

    @classmethod
    def validate_ode(cls, expression: str) -> tuple[bool, Optional[str]]:
        """Validación relajada para ecuaciones diferenciales (permite ')."""
        if not expression or not expression.strip():
            return False, "La expresión está vacía."

        lowered = expression.lower()
        for pattern in cls._BLACKLIST:
            if pattern.lower() in lowered:
                return False, "Expresión rechazada por seguridad."

        cleaned = (
            expression.replace("π", "pi")
            .replace("√", "sqrt")
            .replace("′", "'")
            .replace("″", "''")
            .replace("‴", "'''")
        )
        if not cls._VALID_CHARS_ODE.match(cleaned):
            return False, "La expresión contiene caracteres no permitidos."
        return True, None


# ═══════════════════════════════════════════════════════════════════════════════
#  ODE PARSING
# ═══════════════════════════════════════════════════════════════════════════════

def _prime_count(primes: str) -> int:
    return primes.count("'")


def _parse_ode_expr(expr_str: str, dep: str = "y", indep: str = "x") -> sympy.Basic:
    """Convierte expresión con y', y''… a forma SymPy."""
    s = expr_str.strip().replace("′", "'").replace("″", "''").replace("‴", "'''")
    s = SyntaxNormalizer.normalize(s)

    x = symbols(indep)
    f = Function(dep)

    for order, marker in ((3, "'''"), (2, "''"), (1, "'")):
        s = re.sub(
            rf"(?<![a-zA-Z]){re.escape(dep)}{re.escape(marker)}",
            f" __D{order}__ ",
            s,
        )
    s = re.sub(rf"(?<![a-zA-Z]){re.escape(dep)}(?![a-zA-Z'])", " __Y__ ", s)

    local = {
        **LOCAL_DICT,
        indep: x,
        "__Y__": f(x),
        "__D1__": Derivative(f(x), x),
        "__D2__": Derivative(f(x), (x, 2)),
        "__D3__": Derivative(f(x), (x, 3)),
    }
    try:
        return parse_expr(s, local_dict=local, transformations=TRANSFORMATIONS)
    except Exception as e:
        raise ValueError(f"No se pudo interpretar la expresión: {e}") from e


def _build_ode_equation(equation: str, dep: str = "y", indep: str = "x") -> Eq:
    if "=" not in equation:
        raise ValueError("La ecuación debe incluir el signo '='.")
    lhs_s, rhs_s = equation.split("=", 1)
    lhs = _parse_ode_expr(lhs_s.strip(), dep, indep)
    rhs = _parse_ode_expr(rhs_s.strip(), dep, indep)
    return Eq(lhs, rhs)


def _build_ode_ics(
    ics_list: list[dict[str, str]],
    dep: str = "y",
    indep: str = "x",
) -> dict:
    x = symbols(indep)
    f = Function(dep)
    ics: dict = {}
    for ic in ics_list:
        order = int(ic.get("d", 0))
        at = sympify(ic.get("at", "0"))
        val = sympify(ic.get("v", "0"))
        if order == 0:
            ics[f(at)] = val
        else:
            ics[Derivative(f(x), x, order).subs(x, at)] = val
    return ics


def _parse_system_line(line: str, func_names: list[str], indep: str = "t") -> Eq:
    s = line.strip().replace("′", "'")
    m = re.match(r"^([a-zA-Z]+)('+)\s*=\s*(.+)$", s)
    if not m:
        raise ValueError(f"Formato inválido: '{line}'. Usá var' = expresión.")
    var_name, rhs_s = m.group(1), m.group(3)
    t = symbols(indep)
    fn = Function(var_name)
    rhs = _parse_system_rhs(rhs_s, indep, func_names)
    return Eq(Derivative(fn(t), t), rhs)


def _parse_system_rhs(
    rhs_s: str,
    indep: str,
    func_names: list[str],
) -> sympy.Basic:
    s = SyntaxNormalizer.normalize(rhs_s.strip())
    t = symbols(indep)
    local = {**LOCAL_DICT, indep: t}
    for name in func_names:
        local[name] = Function(name)(t)
    return parse_expr(s, local_dict=local, transformations=TRANSFORMATIONS)


def _sympy_to_latex(expr) -> Optional[str]:
    try:
        return latex(expr)
    except Exception:
        return None


def _solution_payload(expr) -> dict:
    """Convierte una solución SymPy a { plain, latex }."""
    return {
        "plain": str(expr),
        "latex": _sympy_to_latex(expr),
    }


def _friendly_ode_class(cls_tuple) -> str:
    if not cls_tuple:
        return ""
    key = str(cls_tuple[0]) if cls_tuple else ""
    return key.replace("_", " ").replace("-", " ").capitalize()


def _build_ode_solve_steps(
    equation: str,
    eq: Eq,
    cls_tuple,
    general,
    particular,
    applied_ics: bool,
) -> list[dict]:
    steps: list[dict] = [
        {
            "label": "Ecuación diferencial",
            "latex": _sympy_to_latex(eq),
            "text": equation,
        },
    ]
    if cls_tuple:
        steps.append({
            "label": "Clasificación",
            "text": _friendly_ode_class(cls_tuple),
        })
    steps.append({
        "label": "Solución general",
        "latex": _sympy_to_latex(general),
    })
    if applied_ics:
        steps.append({
            "label": "Condiciones iniciales",
            "text": "Se aplicaron las condiciones iniciales indicadas.",
        })
        steps.append({
            "label": "Solución particular",
            "latex": _sympy_to_latex(particular),
        })
    return steps


def _build_ode_system_steps(
    equations: list[str],
    eqs: list[Eq],
    sol_map: dict[str, dict],
) -> list[dict]:
    eq_latex = " \\\\ ".join(
        lt for lt in (_sympy_to_latex(e) for e in eqs) if lt
    )
    steps: list[dict] = [
        {
            "label": "Sistema de ecuaciones",
            "latex": eq_latex or None,
            "text": "\n".join(f"• {e}" for e in equations),
        },
        {"label": "Método", "text": "Resolución simbólica con dsolve (SymPy)."},
    ]
    for name, payload in sol_map.items():
        steps.append({
            "label": f"Solución para {name}(t)",
            "latex": payload.get("latex"),
        })
    return steps


# ═══════════════════════════════════════════════════════════════════════════════
#  MATH CACHE (SQLite)
# ═══════════════════════════════════════════════════════════════════════════════

class MathCache:
    """
    Cache SQLite persistente para resultados de cálculos.
    Evita recalcular operaciones ya resueltas.
    """

    def __init__(self, db_path: str = "math_cache.db"):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS cache (
                    key TEXT PRIMARY KEY,
                    result TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()

    @staticmethod
    def _make_key(operation: str, expression: str, **kwargs) -> str:
        """Genera una clave hash única para la operación."""
        raw = f"{operation}:{expression}:{json.dumps(kwargs, sort_keys=True)}"
        return hashlib.sha256(raw.encode()).hexdigest()

    def get(self, operation: str, expression: str, **kwargs) -> Optional[dict]:
        key = self._make_key(operation, expression, **kwargs)
        try:
            with sqlite3.connect(self.db_path) as conn:
                row = conn.execute(
                    "SELECT result FROM cache WHERE key = ?", (key,)
                ).fetchone()
                if row:
                    return json.loads(row[0])
        except Exception:
            pass
        return None

    def set(self, operation: str, expression: str, result: dict, **kwargs):
        key = self._make_key(operation, expression, **kwargs)
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute(
                    "INSERT OR REPLACE INTO cache (key, result) VALUES (?, ?)",
                    (key, json.dumps(result)),
                )
                conn.commit()
        except Exception as e:
            logger.warning(f"Cache write error: {e}")


# ═══════════════════════════════════════════════════════════════════════════════
#  MATH ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

# Transformaciones de parsing para SymPy
TRANSFORMATIONS = standard_transformations + (
    implicit_multiplication_application,
    convert_xor,
)

# Espacio local seguro para parsing
LOCAL_DICT = {
    "pi": pi, "e": E, "E": E,
    "sqrt": sqrt, "sin": sin, "cos": cos, "tan": tan,
    "log": log, "ln": log, "exp": exp,
    "oo": oo, "inf": oo,
}


def safe_parse(expression: str) -> sympy.Basic:
    """Parsea una expresión de forma segura usando SymPy."""
    normalized = SyntaxNormalizer.normalize(expression)
    try:
        return parse_expr(
            normalized,
            local_dict=LOCAL_DICT,
            transformations=TRANSFORMATIONS,
        )
    except Exception as e:
        raise ValueError(f"No se pudo interpretar la expresión: {str(e)}")


class MathEngine:
    """Motor de cálculo simbólico con SymPy."""

    @staticmethod
    def derive(expression: str, variable: str = "x") -> dict:
        expr = safe_parse(expression)
        var = symbols(variable)
        result = diff(expr, var)
        return {
            "latex": latex(result),
            "plain": str(result),
            "operation": "derive",
            "variable": variable,
            "input_latex": latex(expr),
        }

    @staticmethod
    def integrate_expr(
        expression: str,
        variable: str = "x",
        lower: Optional[str] = None,
        upper: Optional[str] = None,
    ) -> dict:
        expr = safe_parse(expression)
        var = symbols(variable)

        if lower is not None and upper is not None:
            # Integral definida
            lo = safe_parse(lower)
            hi = safe_parse(upper)
            result = sym_integrate(expr, (var, lo, hi))
            return {
                "latex": latex(result),
                "plain": str(result),
                "operation": "integrate",
                "definite": True,
                "variable": variable,
                "lower": str(lo),
                "upper": str(hi),
                "input_latex": latex(expr),
            }
        else:
            # Integral indefinida
            result = sym_integrate(expr, var)
            return {
                "latex": latex(result) + " + C",
                "plain": str(result) + " + C",
                "operation": "integrate",
                "definite": False,
                "variable": variable,
                "input_latex": latex(expr),
            }

    @staticmethod
    def simplify_expr(expression: str) -> dict:
        expr = safe_parse(expression)
        result = sym_simplify(expr)
        return {
            "latex": latex(result),
            "plain": str(result),
            "operation": "simplify",
            "input_latex": latex(expr),
        }

    @staticmethod
    def factorize_expr(expression: str) -> dict:
        expr = safe_parse(expression)
        result = factor(expr)
        return {
            "latex": latex(result),
            "plain": str(result),
            "operation": "factorize",
            "input_latex": latex(expr),
        }

    @staticmethod
    def solve_expr(equation: str, variable: str = "x") -> dict:
        var = symbols(variable)

        # Soportar "expr = 0" o solo "expr" (asumiendo = 0)
        if "=" in equation:
            sides = equation.split("=", 1)
            lhs = safe_parse(sides[0].strip())
            rhs = safe_parse(sides[1].strip())
            eq_expr = lhs - rhs
        else:
            eq_expr = safe_parse(equation)

        solutions = solve(eq_expr, var)

        return {
            "solutions": [
                {"latex": latex(s), "plain": str(s)}
                for s in solutions
            ],
            "count": len(solutions),
            "operation": "solve",
            "variable": variable,
            "input_latex": latex(eq_expr),
        }

    @staticmethod
    def ode_solve(equation: str, initial_conditions: list[dict[str, str]]) -> dict:
        indep = "x"
        dep = "y"
        eq = _build_ode_equation(equation, dep, indep)
        x = symbols(indep)
        y = Function(dep)
        func = y(x)

        cls_tuple = None
        classification = {}
        try:
            cls = classify_ode(eq, func)
            if cls:
                cls_tuple = cls
                classification = {"tipo": _friendly_ode_class(cls)}
        except Exception:
            pass

        ics = _build_ode_ics(initial_conditions, dep, indep) if initial_conditions else None
        applied_ics = bool(ics)

        try:
            general = dsolve(eq, func)
            sol = dsolve(eq, func, ics=ics) if ics else general
        except Exception as e:
            raise ValueError(f"No se pudo resolver la EDO: {e}") from e

        order = None
        try:
            derivs = eq.find(Derivative)
            if derivs:
                order = max(
                    d[1][1] if isinstance(d[1], tuple) else 1
                    for d in derivs
                )
        except Exception:
            order = None

        return {
            "general_solution": _solution_payload(general),
            "particular_solution": _solution_payload(sol),
            "input_latex": _sympy_to_latex(eq),
            "classification": classification,
            "steps": _build_ode_solve_steps(
                equation, eq, cls_tuple, general, sol, applied_ics
            ),
            "method": "dsolve (SymPy)",
            "order": order,
            "operation": "ode_solve",
        }

    @staticmethod
    def ode_system(equations: list[str], initial_conditions: dict[str, str]) -> dict:
        indep = "t"
        func_names: list[str] = []
        for line in equations:
            m = re.match(r"^([a-zA-Z]+)'", line.strip().replace("′", "'"))
            if m and m.group(1) not in func_names:
                func_names.append(m.group(1))

        if not func_names:
            raise ValueError("No se detectaron variables en el sistema.")

        eqs = [_parse_system_line(line, func_names, indep) for line in equations]
        t = symbols(indep)
        funcs = [Function(name)(t) for name in func_names]

        ics = {}
        for name, val in initial_conditions.items():
            if name in func_names:
                ics[Function(name)(0)] = sympify(val)

        try:
            if ics:
                sol = dsolve(eqs, funcs, ics=ics)
            else:
                sol = dsolve(eqs, funcs)
        except Exception as e:
            raise ValueError(f"No se pudo resolver el sistema: {e}") from e

        solutions: dict[str, dict] = {}
        if isinstance(sol, list):
            for s in sol:
                for f in funcs:
                    if s.has(f):
                        solutions[str(f.func)] = _solution_payload(s)
                        break
        else:
            for f in funcs:
                if sol.has(f):
                    solutions[str(f.func)] = _solution_payload(sol)

        if not solutions:
            raw = sol if isinstance(sol, list) else [sol]
            for i, f in enumerate(funcs):
                if i < len(raw):
                    solutions[str(f.func)] = _solution_payload(raw[i])

        return {
            "solutions": solutions,
            "general_solution": _solution_payload(sol) if not solutions else None,
            "eigenvalues": None,
            "steps": _build_ode_system_steps(equations, eqs, solutions),
            "method": "dsolve (SymPy)",
            "dimension": len(func_names),
            "operation": "ode_system",
        }


# ═══════════════════════════════════════════════════════════════════════════════
#  REQUEST / RESPONSE MODELS
# ═══════════════════════════════════════════════════════════════════════════════

class ExpressionRequest(BaseModel):
    expression: str = Field(..., min_length=1, max_length=500)
    variable: str = Field(default="x", max_length=5)

class IntegralRequest(BaseModel):
    expression: str = Field(..., min_length=1, max_length=500)
    variable: str = Field(default="x", max_length=5)
    lower: Optional[str] = None
    upper: Optional[str] = None

class EquationRequest(BaseModel):
    equation: str = Field(..., min_length=1, max_length=500)
    variable: str = Field(default="x", max_length=5)

class ValidateRequest(BaseModel):
    expression: str = Field(..., max_length=500)


class OdeSolveRequest(BaseModel):
    equation: str = Field(..., min_length=1, max_length=500)
    initial_conditions: list[dict[str, str]] = Field(default_factory=list)


class OdeSystemRequest(BaseModel):
    equations: list[str] = Field(..., min_length=1, max_length=10)
    initial_conditions: dict[str, str] = Field(default_factory=dict)


# ═══════════════════════════════════════════════════════════════════════════════
#  FASTAPI APP
# ═══════════════════════════════════════════════════════════════════════════════

# Inicializar cache al arrancar
cache = MathCache(
    db_path=os.environ.get("MATH_CACHE_PATH", "math_cache.db")
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🧮 NumérikaAI Math Engine starting...")
    yield
    logger.info("🧮 NumérikaAI Math Engine shutting down.")


app = FastAPI(
    title="NumérikaAI Math Engine",
    version="0.1.0",
    description="Motor de cálculo simbólico headless para NumérikaAI",
    lifespan=lifespan,
)

# ── CORS ────────────────────────────────────────────────────────────────────────
cors_origins_env = os.environ.get(
    "CORS_ORIGINS",
    "http://localhost:5173,http://localhost:3000"
)
cors_origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── HEALTH CHECK ────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "NumérikaAI Math Engine",
        "version": "0.1.0",
    }


# ── DERIVE ──────────────────────────────────────────────────────────────────────

@app.post("/api/math/derive")
async def api_derive(req: ExpressionRequest):
    is_valid, error = SyntaxNormalizer.validate(req.expression)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)

    # Check cache
    cached = cache.get("derive", req.expression, variable=req.variable)
    if cached:
        cached["cached"] = True
        return cached

    try:
        result = MathEngine.derive(req.expression, req.variable)
        result["cached"] = False
        cache.set("derive", req.expression, result, variable=req.variable)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error en derive: {e}")
        raise HTTPException(status_code=500, detail="Error interno de cálculo.")


# ── INTEGRATE ───────────────────────────────────────────────────────────────────

@app.post("/api/math/integrate")
async def api_integrate(req: IntegralRequest):
    is_valid, error = SyntaxNormalizer.validate(req.expression)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)

    cached = cache.get(
        "integrate", req.expression,
        variable=req.variable, lower=req.lower, upper=req.upper,
    )
    if cached:
        cached["cached"] = True
        return cached

    try:
        result = MathEngine.integrate_expr(
            req.expression, req.variable, req.lower, req.upper
        )
        result["cached"] = False
        cache.set(
            "integrate", req.expression, result,
            variable=req.variable, lower=req.lower, upper=req.upper,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error en integrate: {e}")
        raise HTTPException(status_code=500, detail="Error interno de cálculo.")


# ── SIMPLIFY ────────────────────────────────────────────────────────────────────

@app.post("/api/math/simplify")
async def api_simplify(req: ExpressionRequest):
    is_valid, error = SyntaxNormalizer.validate(req.expression)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)

    cached = cache.get("simplify", req.expression)
    if cached:
        cached["cached"] = True
        return cached

    try:
        result = MathEngine.simplify_expr(req.expression)
        result["cached"] = False
        cache.set("simplify", req.expression, result)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error en simplify: {e}")
        raise HTTPException(status_code=500, detail="Error interno de cálculo.")


# ── FACTORIZE ───────────────────────────────────────────────────────────────────

@app.post("/api/math/factorize")
async def api_factorize(req: ExpressionRequest):
    is_valid, error = SyntaxNormalizer.validate(req.expression)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)

    cached = cache.get("factorize", req.expression)
    if cached:
        cached["cached"] = True
        return cached

    try:
        result = MathEngine.factorize_expr(req.expression)
        result["cached"] = False
        cache.set("factorize", req.expression, result)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error en factorize: {e}")
        raise HTTPException(status_code=500, detail="Error interno de cálculo.")


# ── SOLVE ───────────────────────────────────────────────────────────────────────

@app.post("/api/math/solve")
async def api_solve(req: EquationRequest):
    is_valid, error = SyntaxNormalizer.validate(req.equation)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)

    cached = cache.get("solve", req.equation, variable=req.variable)
    if cached:
        cached["cached"] = True
        return cached

    try:
        result = MathEngine.solve_expr(req.equation, req.variable)
        result["cached"] = False
        cache.set("solve", req.equation, result, variable=req.variable)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error en solve: {e}")
        raise HTTPException(status_code=500, detail="Error interno de cálculo.")


# ── VALIDATE ────────────────────────────────────────────────────────────────────

@app.post("/api/math/validate")
async def api_validate(req: ValidateRequest):
    is_valid, error = SyntaxNormalizer.validate(req.expression)
    result = {"valid": is_valid}

    if not is_valid:
        result["error"] = error
    else:
        # Intentar parsear para validar sintaxis real
        try:
            normalized = SyntaxNormalizer.normalize(req.expression)
            expr = safe_parse(req.expression)
            result["normalized"] = normalized
            result["latex"] = latex(expr)
        except Exception as e:
            result["valid"] = False
            result["error"] = f"Error de sintaxis: {str(e)}"

    return result


# ── ODE SOLVE ───────────────────────────────────────────────────────────────────

@app.post("/api/math/ode/solve")
async def api_ode_solve(req: OdeSolveRequest):
    is_valid, error = SyntaxNormalizer.validate_ode(req.equation)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)

    cached = cache.get(
        "ode_solve", req.equation,
        initial_conditions=req.initial_conditions,
    )
    if cached:
        cached["cached"] = True
        return cached

    try:
        result = MathEngine.ode_solve(req.equation, req.initial_conditions)
        result["cached"] = False
        cache.set(
            "ode_solve", req.equation, result,
            initial_conditions=req.initial_conditions,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error en ode/solve: {e}")
        raise HTTPException(status_code=500, detail="Error interno de cálculo.")


# ── ODE SYSTEM ──────────────────────────────────────────────────────────────────

@app.post("/api/math/ode/system")
async def api_ode_system(req: OdeSystemRequest):
    for eq in req.equations:
        is_valid, error = SyntaxNormalizer.validate_ode(eq)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error)

    eq_key = ";".join(req.equations)
    cached = cache.get(
        "ode_system", eq_key,
        initial_conditions=req.initial_conditions,
    )
    if cached:
        cached["cached"] = True
        return cached

    try:
        result = MathEngine.ode_system(req.equations, req.initial_conditions)
        result["cached"] = False
        cache.set(
            "ode_system", eq_key, result,
            initial_conditions=req.initial_conditions,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error en ode/system: {e}")
        raise HTTPException(status_code=500, detail="Error interno de cálculo.")


# ═══════════════════════════════════════════════════════════════════════════════
#  ENTRYPOINT
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn

    host = os.environ.get("MATH_ENGINE_HOST", "0.0.0.0")
    port = int(os.environ.get("MATH_ENGINE_PORT", "8000"))

    uvicorn.run(app, host=host, port=port)
