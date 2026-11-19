FROM python:3.11-slim

WORKDIR /app

# Cài system dependencies cần cho OpenCV
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

# Tăng timeout pip để tránh lỗi khi tải TensorFlow (~280MB)
ENV PIP_DEFAULT_TIMEOUT=600

# Cài Python packages — timeout 600s, retry 5 lần
COPY requirements.txt .
RUN pip install --no-cache-dir --timeout 600 --retries 5 -r requirements.txt

# Copy source code
COPY . .

# Expose port
EXPOSE 8000

# Chạy FastAPI server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
