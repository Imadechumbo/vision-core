#!/usr/bin/env bash
# §75 — Deploy Cloudflare Pages local
# Uso: bash bin/deploy-pages.sh [mensagem opcional]
# Requer: wrangler instalado, OAuth token em ~/.wrangler/config/default.toml

set -e

MSG="${1:-local deploy $(date +%Y-%m-%d)}"
ACCOUNT_ID="51c6414635899456a67dc668bc193553"
DEPLOY_DIR="/tmp/vision-pages-deploy"

echo "🚀 Preparando deploy..."
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"
cp -r frontend/* "$DEPLOY_DIR/"
rm -rf "$DEPLOY_DIR/downloads"
echo "   Dir: $(du -sh "$DEPLOY_DIR" | cut -f1)  Files: $(find "$DEPLOY_DIR" -type f | wc -l)"

echo "📤 Enviando para Cloudflare Pages..."
NODE_TLS_REJECT_UNAUTHORIZED=0 \
CLOUDFLARE_ACCOUNT_ID="$ACCOUNT_ID" \
npx wrangler pages deploy "$DEPLOY_DIR" \
  --project-name visioncoreai \
  --branch main \
  --commit-message "$MSG" \
  --commit-dirty=true

echo "✅ Deploy concluído — https://visioncoreai.pages.dev"
