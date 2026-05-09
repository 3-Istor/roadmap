#!/bin/bash
set -e

# Roadmap Dashboard Deployment Script
# Quick deployment to K3s cluster

echo "🚀 Roadmap Dashboard Deployment"
echo "================================"
echo ""

# Check prerequisites
command -v kubectl >/dev/null 2>&1 || { echo "❌ kubectl is required but not installed. Aborting." >&2; exit 1; }
command -v helm >/dev/null 2>&1 || { echo "❌ helm is required but not installed. Aborting." >&2; exit 1; }

# Configuration
NAMESPACE="${NAMESPACE:-roadmap}"
RELEASE_NAME="${RELEASE_NAME:-roadmap}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

echo "📋 Configuration:"
echo "   Namespace: $NAMESPACE"
echo "   Release: $RELEASE_NAME"
echo "   Image Tag: $IMAGE_TAG"
echo ""

# Check if secrets exist
if kubectl get secret roadmap-secrets -n $NAMESPACE >/dev/null 2>&1; then
    echo "✅ Secrets already exist"
else
    echo "⚠️  Secrets not found. Please create them first:"
    echo ""
    echo "kubectl create secret generic roadmap-secrets \\"
    echo "  --from-literal=database-url=\"postgresql://user:pass@host:5432/db\" \\"
    echo "  --from-literal=notion-api-key=\"secret_xxx\" \\"
    echo "  --from-literal=notion-database-id=\"xxx\" \\"
    echo "  --from-literal=cron-secret=\"your-secret\" \\"
    echo "  --namespace=$NAMESPACE"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Create namespace if it doesn't exist
echo "📦 Creating namespace..."
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Deploy with Helm
echo "🎯 Deploying with Helm..."
helm upgrade --install $RELEASE_NAME ./helm \
    --namespace $NAMESPACE \
    --set image.tag=$IMAGE_TAG \
    --wait \
    --timeout 5m

# Verify deployment
echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Status:"
kubectl get pods -n $NAMESPACE -l app.kubernetes.io/name=roadmap

echo ""
echo "🔍 Logs:"
echo "   kubectl logs -n $NAMESPACE -l app.kubernetes.io/name=roadmap -f"
echo ""
echo "🌐 Access:"
echo "   kubectl port-forward -n $NAMESPACE svc/$RELEASE_NAME 3000:3000"
echo "   Then open: http://localhost:3000"
echo ""
echo "🔄 CronJob:"
kubectl get cronjobs -n $NAMESPACE

echo ""
echo "✨ Done!"
