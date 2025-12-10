FROM python:3.11-slim

WORKDIR /app

# install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# copy src
COPY . .

# expose port
EXPOSE 5000

# run eventlet
CMD ["python", "run.py"]