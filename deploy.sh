#!/bin/bash

echo "🚀 DEPLOY ELITEPASS MUNDIAL - v0e2eedd"
echo "=========================================="
echo ""

# Variables
SERVER="10.0.0.4"
PORT="5001"
APP_PATH="/home/soporte/elitepass-mundial"

echo "📍 Servidor: $SERVER:$PORT"
echo "📁 Ruta: $APP_PATH"
echo ""

# Step 1: Build
echo "1️⃣  Compilando imagen Docker..."
ssh -p $PORT root@$SERVER "cd $APP_PATH && podman build --no-cache -t elitepass-mundial ."

if [ $? -ne 0 ]; then
  echo "❌ Error en build"
  exit 1
fi
echo "✅ Build completado"
echo ""

# Step 2: Stop containers
echo "2️⃣  Deteniendo contenedores..."
ssh -p $PORT root@$SERVER "podman stop app_1 app_2 2>/dev/null || true"
echo "✅ Contenedores detenidos"
echo ""

# Step 3: Remove old containers
echo "3️⃣  Eliminando contenedores antiguos..."
ssh -p $PORT root@$SERVER "podman rm app_1 app_2 2>/dev/null || true"
echo "✅ Contenedores removidos"
echo ""

# Step 4: Start new containers
echo "4️⃣  Iniciando nuevos contenedores..."
ssh -p $PORT root@$SERVER "podman run -d --name app_1 --network host \
  -e NODE_ENV=production \
  -v $APP_PATH/.env.local:/app/.env.local \
  elitepass-mundial npm start"

ssh -p $PORT root@$SERVER "podman run -d --name app_2 --network host \
  -e NODE_ENV=production \
  -v $APP_PATH/.env.local:/app/.env.local \
  elitepass-mundial npm start"

echo "✅ Contenedores iniciados"
echo ""

# Step 5: Verify
echo "5️⃣  Verificando status..."
ssh -p $PORT root@$SERVER "podman ps | grep elitepass"
echo ""

echo "=========================================="
echo "✅ DEPLOY COMPLETADO - v0e2eedd"
echo "🔗 URL: https://mundial.genial-it.net"
echo "=========================================="
