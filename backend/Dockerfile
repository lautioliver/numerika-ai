FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el motor
COPY numerika_math_engine.py .

# Puerto del servicio
EXPOSE 8000

# Variables de entorno por defecto
ENV MATH_ENGINE_HOST=0.0.0.0
ENV MATH_ENGINE_PORT=8000
ENV MATH_CACHE_PATH=/app/data/math_cache.db

# Crear directorio para el cache
RUN mkdir -p /app/data

CMD ["python", "numerika_math_engine.py"]
