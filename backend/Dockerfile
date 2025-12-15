FROM python:3.11-slim

WORKDIR /app

# Install build dependencies untuk libp2p (cryptography, grpcio, fastecdsa, etc)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    libffi-dev \
    libssl-dev \
    libgmp-dev \
    cargo \
    && rm -rf /var/lib/apt/lists/*

# install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# copy src
COPY . .

# expose port
EXPOSE 5000

# run eventlet
CMD ["python", "run.py"]