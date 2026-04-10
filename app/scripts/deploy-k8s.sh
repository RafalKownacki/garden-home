#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKSPACE_DIR="$(cd "${ROOT_DIR}/.." && pwd)"
CHART_DIR="${ROOT_DIR}/deploy/helm/garden-home-app"
NAMESPACE="${NAMESPACE:-garden-home}"
RELEASE="${RELEASE:-garden-home-app}"

pick_helm() {
  if command -v microk8s >/dev/null 2>&1 && microk8s helm3 version >/dev/null 2>&1; then
    echo "microk8s helm3"
  else
    echo "helm"
  fi
}
HELM_BIN=$(pick_helm)

REGISTRY=${REGISTRY:-localhost:32000}
VERSION=${VERSION:-v$(date +%Y.%m.%d-%H%M)}
DEPLOYED_AT=${DEPLOYED_AT:-$(TZ=Europe/Warsaw date '+%Y-%m-%d %H:%M:%S %Z')}

# Build-time env for Next.js
NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL:-https://home-api.grdn.pl}
NEXT_PUBLIC_KEYCLOAK_ENABLED=${NEXT_PUBLIC_KEYCLOAK_ENABLED:-true}
NEXT_PUBLIC_KEYCLOAK_URL=${NEXT_PUBLIC_KEYCLOAK_URL:-https://auth.grdn.pl}
NEXT_PUBLIC_KEYCLOAK_REALM=${NEXT_PUBLIC_KEYCLOAK_REALM:-garden}
NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=${NEXT_PUBLIC_KEYCLOAK_CLIENT_ID:-garden-home-app}
NEXT_PUBLIC_APP_NAME=${NEXT_PUBLIC_APP_NAME:-Home}

if ! command -v docker >/dev/null 2>&1; then
  echo "[error] docker is required"; exit 1
fi

if [[ "${REGISTRY}" == "localhost:32000" ]]; then
  if ! curl -fsS "http://localhost:32000/v2/" >/dev/null 2>&1; then
    echo "[error] microk8s registry not reachable"; exit 1
  fi
fi

echo "[i] Building image ${REGISTRY}/garden-home-app:${VERSION}"
DOCKER_BUILDKIT=1 docker build --progress=plain \
  --build-arg "NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}" \
  --build-arg "NEXT_PUBLIC_KEYCLOAK_ENABLED=${NEXT_PUBLIC_KEYCLOAK_ENABLED}" \
  --build-arg "NEXT_PUBLIC_KEYCLOAK_URL=${NEXT_PUBLIC_KEYCLOAK_URL}" \
  --build-arg "NEXT_PUBLIC_KEYCLOAK_REALM=${NEXT_PUBLIC_KEYCLOAK_REALM}" \
  --build-arg "NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=${NEXT_PUBLIC_KEYCLOAK_CLIENT_ID}" \
  --build-arg "NEXT_PUBLIC_APP_NAME=${NEXT_PUBLIC_APP_NAME}" \
  -t "${REGISTRY}/garden-home-app:${VERSION}" \
  -f "${ROOT_DIR}/Dockerfile" "${WORKSPACE_DIR}"

echo "[i] Pushing image ${REGISTRY}/garden-home-app:${VERSION}"
docker push "${REGISTRY}/garden-home-app:${VERSION}"

HELM_ARGS=(
  --set image.registry="${REGISTRY}"
  --set image.repository="garden-home-app"
  --set image.tag="${VERSION}"
  --set ingress.enabled=true
  --set ingress.host="${INGRESS_HOST:-home.grdn.pl}"
)

set -x
${HELM_BIN} upgrade --install "${RELEASE}" "${CHART_DIR}" \
  -n "${NAMESPACE}" --create-namespace "${HELM_ARGS[@]}"
set +x

echo "[ok] APP deployed: ${RELEASE} (ns=${NAMESPACE}) tag=${VERSION}"
