@echo off
echo Iniciando Motor Matemático de NumérikaAI...
cd backend
call .\venv\Scripts\activate.bat
if errorlevel 1 (
    echo Error al activar el entorno virtual. Intentando instalar dependencias...
    python -m venv venv
    call .\venv\Scripts\activate.bat
    pip install -r requirements.txt
)
python numerika_math_engine.py
pause