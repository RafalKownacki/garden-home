#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKSPACE_DIR="$(cd "${ROOT_DIR}/.." && pwd)"
CHART_DIR="${ROOT_DIR}/deploy/helm/garden-home-api"
NAMESPACE="${NAMESPACE:-garden-home}"
RELEASE="${RELEASE:-garden-home-api}"

pick_helm() {
  if command -v microk8s >/dev/null 2>&1 && microk8s helm3 version >/dev/null 2>&1; then
    echo "microk8s helm3"
  else
    echo "helm"
  fi
}
pick_kubectl() {
  if command -v microk8s >/dev/null 2>&1 && microk8s kubectl version --client >/dev/null 2>&1; then
    echo "microk8s kubectl"
  else
    echo "kubectl"
  fi
}
HELM_BIN=$(pick_helm)
KUBECTL_BIN=$(pick_kubectl)

REGISTRY=${REGISTRY:-localhost:32000}
VERSION=${VERSION:-v$(date +%Y.%m.%d-%H%M)}
DEPLOYED_AT=${DEPLOYED_AT:-$(TZ=Europe/Warsaw date '+%Y-%m-%d %H:%M:%S %Z')}

if ! command -v docker >/dev/null 2>&1; then
  echo "[error] docker is required"; exit 1
fi

if [[ "${REGISTRY}" == "localhost:32000" ]]; then
  if ! curl -fsS "http://localhost:32000/v2/" >/dev/null 2>&1; then
    echo "[error] microk8s registry not reachable"; exit 1
  fi
fi

echo "[i] Building image ${REGISTRY}/garden-home-api:${VERSION}"
DOCKER_BUILDKIT=1 docker build --progress=plain \
  -t "${REGISTRY}/garden-home-api:${VERSION}" \
  -f "${ROOT_DIR}/Dockerfile" "${WORKSPACE_DIR}"

echo "[i] Pushing image ${REGISTRY}/garden-home-api:${VERSION}"
docker push "${REGISTRY}/garden-home-api:${VERSION}"

# Create K8s secret for admin password if not exists
if ! ${KUBECTL_BIN} get secret garden-home-api-secret -n "${NAMESPACE}" >/dev/null 2>&1; then
  echo "[i] Creating K8s secret for Keycloak admin password"
  ${KUBECTL_BIN} create namespace "${NAMESPACE}" --dry-run=client -o yaml | ${KUBECTL_BIN} apply -f -
  ${KUBECTL_BIN} create secret generic garden-home-api-secret \
    --from-literal=KEYCLOAK_ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD:-}" \
    -n "${NAMESPACE}"
fi

HELM_ARGS=(
  --set image.registry="${REGISTRY}"
  --set image.repository="garden-home-api"
  --set image.tag="${VERSION}"
  --set-string env.DEPLOYED_AT="${DEPLOYED_AT}"
  --set secretRef="garden-home-api-secret"
)

if [[ -n "${INGRESS_HOST:-}" ]]; then
  HELM_ARGS+=(--set ingress.host="${INGRESS_HOST}")
fi

set -x
${HELM_BIN} upgrade --install "${RELEASE}" "${CHART_DIR}" \
  -n "${NAMESPACE}" --create-namespace "${HELM_ARGS[@]}"
set +x

echo "[ok] API deployed: ${RELEASE} (ns=${NAMESPACE}) tag=${VERSION}"
