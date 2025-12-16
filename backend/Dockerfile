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

# install Python dependencies with constraints to block conflicting packages
COPY requirements.txt constraints.txt ./
RUN pip install --no-cache-dir -c constraints.txt libp2p==0.4.0 && \
    pip install --no-cache-dir -c constraints.txt -r requirements.txt

# copy src
COPY . .

# expose port
EXPOSE 5000

# run eventlet
CMD ["python", "run.py"]