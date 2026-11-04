FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system worktrack \
    && useradd --system --gid worktrack --home-dir /app worktrack

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY --chown=worktrack:worktrack . /app/
RUN mkdir -p /app/staticfiles /app/media \
    && chown -R worktrack:worktrack /app

USER worktrack
EXPOSE 8000

CMD ["gunicorn", "worktrack_project.wsgi:application", "--bind=0.0.0.0:8000", "--workers=3", "--timeout=60", "--access-logfile=-", "--error-logfile=-"]
