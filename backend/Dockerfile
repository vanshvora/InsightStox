FROM python:3.11-slim

# Prevent Python from writing pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies (needed for some python packages like psycopg2)
RUN apt-get update \
    && apt-get install -y gcc python3-dev libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY requirements.txt /app/
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy project files
COPY . /app/

# Run the development server
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
