#!/usr/bin/env bash
# Rebuild and redeploy ECS app with NEXT_PUBLIC_SITE_URL=https://app.underlandex.com
# Run from the underlandex/ Next.js repo root.
set -e

ECR_REPO="647371007727.dkr.ecr.ap-southeast-2.amazonaws.com/mining-asset-portal"
REGION="ap-southeast-2"
CLUSTER="underlandex-cluster"
SERVICE="underlandex-service"
# Set this before running: export NEXT_PUBLIC_MAPBOX_TOKEN="pk.eyJ1..."
MAPBOX_TOKEN="${NEXT_PUBLIC_MAPBOX_TOKEN:?Need NEXT_PUBLIC_MAPBOX_TOKEN env var}"

echo "=== Step 1: Authenticate with ECR ==="
aws ecr get-login-password --region $REGION | \
  docker login --username AWS --password-stdin $ECR_REPO

echo "=== Step 2: Build image with app.underlandex.com site URL ==="
docker build --platform linux/amd64 \
  --build-arg NEXT_PUBLIC_MAPBOX_TOKEN="$MAPBOX_TOKEN" \
  --build-arg NEXT_PUBLIC_SITE_URL="https://app.underlandex.com" \
  -t mining-asset-portal:app-subdomain .

echo "=== Step 3: Tag and push ==="
docker tag mining-asset-portal:app-subdomain "${ECR_REPO}:latest"
docker push "${ECR_REPO}:latest"

echo "=== Step 4: Force new ECS deployment ==="
aws ecs update-service \
  --cluster $CLUSTER \
  --service $SERVICE \
  --force-new-deployment \
  --region $REGION

echo ""
echo "Deployment triggered. Monitor with:"
echo "  aws ecs describe-services --cluster $CLUSTER --services $SERVICE --region $REGION --query 'services[0].deployments'"
echo "  aws logs tail /ecs/underlandex --region $REGION --follow"
echo ""
echo "Typically live in 3-5 minutes at https://app.underlandex.com"
