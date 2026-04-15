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
SECRET_NAME=${SECRET_NAME:-garden-home-api-secret}

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

get_secret_value() {
  local key="$1"
  ${KUBECTL_BIN} get secret "${SECRET_NAME}" -n "${NAMESPACE}" \
    -o "jsonpath={.data.${key}}" 2>/dev/null | base64 --decode 2>/dev/null || true
}

ensure_secret_value() {
  local key="$1"
  local explicit="$2"
  local fallback="$3"
  local current
  current="$(get_secret_value "${key}")"

  if [[ -n "${explicit}" ]]; then
    printf '%s' "${explicit}"
    return
  fi
  if [[ -n "${current}" ]]; then
    printf '%s' "${current}"
    return
  fi
  if [[ -n "${fallback}" ]]; then
    printf '%s' "${fallback}"
    return
  fi

  if [[ "${key}" == "OIDC_STATE_SECRET" ]]; then
    openssl rand -hex 32
    return
  fi

  printf ''
}

${KUBECTL_BIN} create namespace "${NAMESPACE}" --dry-run=client -o yaml | ${KUBECTL_BIN} apply -f -

RESOLVED_KEYCLOAK_ADMIN_PASSWORD="$(ensure_secret_value "KEYCLOAK_ADMIN_PASSWORD" "${KEYCLOAK_ADMIN_PASSWORD:-}" "")"
RESOLVED_KEYCLOAK_CLIENT_SECRET="$(ensure_secret_value "KEYCLOAK_CLIENT_SECRET" "${KEYCLOAK_CLIENT_SECRET:-}" "")"
RESOLVED_GARDEN_REGISTRY_KEY="$(ensure_secret_value "GARDEN_REGISTRY_KEY" "${GARDEN_REGISTRY_KEY:-}" "")"
RESOLVED_OIDC_STATE_SECRET="$(ensure_secret_value "OIDC_STATE_SECRET" "${OIDC_STATE_SECRET:-}" "${RESOLVED_KEYCLOAK_CLIENT_SECRET}")"

echo "[i] Applying Kubernetes secret ${SECRET_NAME}"
${KUBECTL_BIN} create secret generic "${SECRET_NAME}" \
  --from-literal=KEYCLOAK_ADMIN_PASSWORD="${RESOLVED_KEYCLOAK_ADMIN_PASSWORD}" \
  --from-literal=KEYCLOAK_CLIENT_SECRET="${RESOLVED_KEYCLOAK_CLIENT_SECRET}" \
  --from-literal=GARDEN_REGISTRY_KEY="${RESOLVED_GARDEN_REGISTRY_KEY}" \
  --from-literal=OIDC_STATE_SECRET="${RESOLVED_OIDC_STATE_SECRET}" \
  -n "${NAMESPACE}" \
  --dry-run=client -o yaml | ${KUBECTL_BIN} apply -f -

HELM_ARGS=(
  --set image.registry="${REGISTRY}"
  --set image.repository="garden-home-api"
  --set image.tag="${VERSION}"
  --set-string env.DEPLOYED_AT="${DEPLOYED_AT}"
  --set secretRef="${SECRET_NAME}"
)

if [[ -n "${INGRESS_HOST:-}" ]]; then
  HELM_ARGS+=(--set ingress.host="${INGRESS_HOST}")
fi

set -x
${HELM_BIN} upgrade --install "${RELEASE}" "${CHART_DIR}" \
  -n "${NAMESPACE}" --create-namespace "${HELM_ARGS[@]}"
set +x

echo "[ok] API deployed: ${RELEASE} (ns=${NAMESPACE}) tag=${VERSION}"
