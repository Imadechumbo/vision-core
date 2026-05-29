#!/usr/bin/env bash
# deploy.sh — Vision Core V2.9.10 Deploy Script
# Usage:
#   ./deploy.sh --staging              Deploy to staging environments
#   ./deploy.sh --production           Deploy to production (requires explicit human confirmation)
#
# Requirements: go, node, wrangler (npm i -g wrangler), eb CLI (AWS EB)
# REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove, não libera, não marca stable
set -euo pipefail

CYAN='\033[0;36m'; GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'; NC='\033[0m'
BOLD='\033[1m'

info()  { echo -e "${CYAN}[DEPLOY]${NC} $*"; }
ok()    { echo -e "${GREEN}[OK]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
fail()  { echo -e "${RED}[FAIL]${NC} $*"; exit 1; }
block() { echo -e "${RED}${BOLD}[BLOCKED]${NC} $*"; exit 1; }

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_ROOT"
MODE=""

# ── Parse args ───────────────────────────────────────────────────
for arg in "$@"; do
  case "$arg" in
    --staging)    MODE="staging" ;;
    --production) MODE="production" ;;
  esac
done

[ -z "$MODE" ] && fail "Usage: ./deploy.sh --staging | --production"

echo -e "${BOLD}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║         VISION CORE V2.9.10 — DEPLOY ($MODE)          "
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ── Step 1: go-core validation ───────────────────────────────────
info "Step 1/5: Validating go-core..."

[ -f bin/vision-core ] || [ -f bin/vision-core.exe ] || {
  info "Binary not found — building..."
  (cd go-core && go build -o ../bin/vision-core -ldflags="-s -w" ./cmd/vision-core)
}

GOCORE_BIN="bin/vision-core"
[ -f bin/vision-core.exe ] && GOCORE_BIN="bin/vision-core.exe"

GOCORE_OUT=$("$GOCORE_BIN" mission --root "." --input "deploy-preflight" 2>/dev/null)
PASS_GOLD=$(echo "$GOCORE_OUT" | node -e "
  let d=''; process.stdin.on('data',c=>d+=c).on('end',()=>{
    try{const j=JSON.parse(d); process.stdout.write(j.pass_gold?'true':'false');}
    catch{process.stdout.write('false')}
  })")

[ "$PASS_GOLD" = "true" ] || block "go-core PASS GOLD not achieved — deploy blocked. Fix issues then retry."
ok "go-core PASS GOLD confirmed"

# ── Step 2: Backend syntax gate ──────────────────────────────────
info "Step 2/5: Backend validation..."
(cd backend && node scripts/validate-syntax.js) || fail "Backend syntax validation failed"
(cd backend && node scripts/validate-passgold.js | node -e "
  let d=''; process.stdin.on('data',c=>d+=c).on('end',()=>{
    const j=JSON.parse(d);
    if(j.pass_gold!==true) { console.error('validate-passgold: NOT GOLD'); process.exit(1); }
  })") || fail "Backend PASS GOLD validation failed"
ok "Backend validated"

# ── Step 3: go tests ─────────────────────────────────────────────
info "Step 3/5: Running go tests..."
(cd go-core && go test ./... -count=1 2>&1) || fail "Go tests failed — deploy blocked"
ok "Go tests passed"

# ── PRODUCTION gate ──────────────────────────────────────────────
if [ "$MODE" = "production" ]; then
  echo ""
  echo -e "${RED}${BOLD}═══════════════════════════════════════════════════════════${NC}"
  echo -e "${RED}${BOLD}  PRODUCTION DEPLOY — EXPLICIT AUTHORIZATION REQUIRED       ${NC}"
  echo -e "${RED}${BOLD}  REGRA ABSOLUTA: SEM PASS GOLD REAL → não promove          ${NC}"
  echo -e "${RED}${BOLD}═══════════════════════════════════════════════════════════${NC}"
  echo ""
  echo -e "  Type exactly: ${BOLD}PASS GOLD REAL AUTORIZADO${NC}"
  echo -e "  to confirm production deploy authorization."
  echo ""
  read -r -p "  Authorization phrase: " CONFIRM

  if [ "$CONFIRM" != "PASS GOLD REAL AUTORIZADO" ]; then
    block "Authorization phrase incorrect. Production deploy blocked."
  fi
  ok "Production deploy authorized by operator"
fi

# ── Step 4: Deploy ───────────────────────────────────────────────
info "Step 4/5: Deploying to $MODE..."

if [ "$MODE" = "staging" ]; then

  # Backend → Elastic Beanstalk (staging)
  if command -v eb &>/dev/null; then
    info "Deploying backend to EB (staging)..."
    (cd backend && eb deploy vision-core-staging 2>&1) && ok "Backend deployed to EB staging" \
      || warn "EB deploy failed — check EB CLI config"
  else
    warn "eb CLI not found — skipping backend EB deploy"
  fi

  # Frontend → Cloudflare Pages (staging)
  if command -v wrangler &>/dev/null; then
    info "Deploying frontend to CF Pages (staging branch)..."
    (cd frontend && wrangler pages deploy . --project-name=vision-core --branch=staging 2>&1) \
      && ok "Frontend deployed to CF Pages (staging)" \
      || warn "CF Pages deploy failed — check wrangler config"
  else
    warn "wrangler not found — skipping frontend CF Pages deploy"
  fi

elif [ "$MODE" = "production" ]; then

  # Backend → Elastic Beanstalk (production)
  if command -v eb &>/dev/null; then
    info "Deploying backend to EB (production)..."
    (cd backend && eb deploy vision-core-prod 2>&1) && ok "Backend deployed to EB production" \
      || { BACKEND_FAIL=true; warn "EB production deploy failed"; }
  else
    warn "eb CLI not found — skipping backend EB production deploy"
  fi

  # Frontend → Cloudflare Pages (production branch)
  if command -v wrangler &>/dev/null; then
    info "Deploying frontend to CF Pages (production)..."
    (cd frontend && wrangler pages deploy . --project-name=vision-core --branch=main 2>&1) \
      && ok "Frontend deployed to CF Pages (production)" \
      || { FRONTEND_FAIL=true; warn "CF Pages production deploy failed"; }
  else
    warn "wrangler not found — skipping frontend CF Pages production deploy"
  fi
fi

# ── Step 5: Post-deploy health check + rollback ──────────────────
info "Step 5/5: Post-deploy health check..."

HEALTH_URL=""
if [ "$MODE" = "staging" ]; then
  HEALTH_URL="${STAGING_HEALTH_URL:-}"
elif [ "$MODE" = "production" ]; then
  HEALTH_URL="${PROD_HEALTH_URL:-}"
fi

if [ -n "$HEALTH_URL" ]; then
  info "Checking $HEALTH_URL..."
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$HEALTH_URL" || echo "000")
  if [ "$HTTP_CODE" = "200" ]; then
    ok "Health check passed (HTTP $HTTP_CODE)"
  else
    warn "Health check returned HTTP $HTTP_CODE"
    if [ "$MODE" = "production" ] && command -v eb &>/dev/null; then
      warn "Initiating rollback..."
      (cd backend && eb deploy vision-core-prod --version previous 2>&1) \
        && warn "Rollback initiated — verify manually" \
        || warn "Rollback command failed — manual intervention required"
    fi
  fi
else
  warn "No HEALTH_URL set (set STAGING_HEALTH_URL or PROD_HEALTH_URL env var) — skipping health check"
fi

# ── Summary ──────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║          DEPLOY COMPLETE — $MODE                         "
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  go-core PASS GOLD: ✅                                   ║"
echo "║  Backend syntax:    ✅                                   ║"
echo "║  Go tests:          ✅                                   ║"
echo "║                                                          ║"
echo "║  Check deployment dashboards for live status.            ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
