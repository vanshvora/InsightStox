#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt

python manage.py collectstatic --noinput
python manage.py migrate

echo "Build complete. Be sure to run 'gunicorn config.wsgi:application' as your start command."
