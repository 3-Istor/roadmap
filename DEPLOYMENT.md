# Deployment Guide

This guide covers deploying the Roadmap Dashboard to a K3s cluster with <1GB RAM optimization.

## Prerequisites

- K3s cluster (or any Kubernetes cluster)
- `kubectl` configured to access your cluster
- `helm` v3+ installed
- Container registry access (GitHub Container Registry by default)
- Domain name with DNS configured

## Architecture

The deployment consists of:
- **Next.js App**: Standalone build optimized for minimal memory footprint (<768MB)
- **PostgreSQL**: External managed database (recommended) or in-cluster
- **CronJob**: Hourly sync with Notion API
- **Ingress**: NGINX ingress with TLS

## Memory Optimization Strategy

1. **Next.js Standalone Output**: Reduces image size from ~1.5GB to ~150MB
2. **Resource Limits**: 768MB max, 256MB request
3. **Single Replica**: Sufficient for read-heavy workload
4. **Efficient Caching**: PostgreSQL caches Notion data
5. **Lightweight CronJob**: Uses curl Alpine image (~5MB)

## Quick Start

### 1. Create Secrets

Create a `secrets.yaml` file (DO NOT commit this):

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: roadmap-secrets
  namespace: roadmap
type: Opaque
stringData:
  database-url: "postgresql://user:password@host:5432/roadmap"
  notion-api-key: "ntn_xxxxxxxxxxxxx"
  notion-members-db-id: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  notion-projects-db-id: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  notion-events-db-id: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  notion-tasks-db-id: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
  webhook-secret: "your-random-webhook-secret-here"
  cron-secret: "your-random-cron-secret-here"
```

Or use the example file:
```bash
cp helm/secrets.example.yaml secrets.yaml
# Edit secrets.yaml with your actual values
```

Apply it:
```bash
kubectl create namespace roadmap
kubectl apply -f secrets.yaml
```

### 2. Update Helm Values

Edit `helm/values.yaml`:
- Set `image.repository` to your registry
- Update `ingress.hosts` with your domain
- Adjust resource limits if needed

### 3. Deploy with Helm

```bash
helm upgrade --install roadmap-dashboard ./helm \
  --namespace roadmap \
  --create-namespace \
  --wait
```

### 4. Verify Deployment

```bash
# Check pods
kubectl get pods -n roadmap

# Check logs
kubectl logs -n roadmap -l app.kubernetes.io/name=roadmap-dashboard

# Check CronJob
kubectl get cronjobs -n roadmap
```

## CI/CD Setup

### GitHub Actions

1. **Add Repository Secrets**:
   - `KUBECONFIG`: Base64-encoded kubeconfig file
   - `DATABASE_URL`: PostgreSQL connection string
   - `NOTION_API_KEY`: Notion integration key
   - `NOTION_MEMBERS_DB_ID`: Notion Members database ID
   - `NOTION_PROJECTS_DB_ID`: Notion Projects database ID
   - `NOTION_EVENTS_DB_ID`: Notion Events database ID
   - `NOTION_TASKS_DB_ID`: Notion Tasks database ID
   - `WEBHOOK_SECRET`: Random secret for webhooks
   - `CRON_SECRET`: Random secret for cron endpoint
   - `INGRESS_HOST`: Your domain name

2. **Encode kubeconfig**:
   ```bash
   cat ~/.kube/config | base64 -w 0
   ```

3. **Trigger Deployment**:
   - Push to `main` branch triggers build and deploy
   - Manual deploy via Actions tab

## Database Setup

### Option 1: Managed PostgreSQL (Recommended)

Use a managed service like:
- AWS RDS
- Google Cloud SQL
- DigitalOcean Managed Databases
- Supabase

Benefits:
- Automatic backups
- High availability
- No memory overhead on K3s

### Option 2: In-Cluster PostgreSQL

If you must run PostgreSQL in-cluster, use a lightweight setup:

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm install postgresql bitnami/postgresql \
  --namespace roadmap \
  --set primary.resources.limits.memory=512Mi \
  --set primary.resources.requests.memory=256Mi
```

## Monitoring

### Health Checks

The app exposes health endpoints:
- `/api/dashboard` - Main health check
- Kubernetes probes configured automatically

### Logs

```bash
# Application logs
kubectl logs -n roadmap -l app.kubernetes.io/name=roadmap-dashboard -f

# CronJob logs
kubectl logs -n roadmap -l app.kubernetes.io/component=sync-cronjob
```

### Metrics

Resource usage:
```bash
kubectl top pods -n roadmap
```

## Scaling

### Horizontal Scaling

Enable autoscaling in `values.yaml`:
```yaml
autoscaling:
  enabled: true
  minReplicas: 1
  maxReplicas: 3
  targetMemoryUtilizationPercentage: 80
```

### Vertical Scaling

Adjust resources in `values.yaml`:
```yaml
resources:
  limits:
    memory: 1Gi  # Increase if needed
  requests:
    memory: 512Mi
```

## Troubleshooting

### Pod OOMKilled

If pods are killed due to memory:
1. Check actual usage: `kubectl top pods -n roadmap`
2. Increase memory limit in `values.yaml`
3. Verify database connection pooling

### CronJob Failing

Check CronJob logs:
```bash
kubectl get jobs -n roadmap
kubectl logs -n roadmap job/roadmap-dashboard-sync-xxxxx
```

Common issues:
- Wrong `CRON_SECRET`
- Service name mismatch
- Network policy blocking

### Slow Performance

1. Check database query performance
2. Verify Notion API rate limits
3. Consider adding Redis cache
4. Enable Next.js caching

## Backup and Recovery

### Database Backups

If using managed PostgreSQL, backups are automatic.

For in-cluster PostgreSQL:
```bash
kubectl exec -n roadmap postgresql-0 -- pg_dump -U postgres roadmap > backup.sql
```

### Restore

```bash
kubectl exec -i -n roadmap postgresql-0 -- psql -U postgres roadmap < backup.sql
```

## Security Best Practices

1. **Secrets Management**: Use external secrets operator or sealed secrets
2. **Network Policies**: Restrict pod-to-pod communication
3. **RBAC**: Limit service account permissions
4. **TLS**: Always use HTTPS with valid certificates
5. **Image Scanning**: Scan images for vulnerabilities
6. **Container Security**: App runs as root to execute database migrations on startup, then runs Next.js server

## Cost Optimization

- **Single replica** for development/staging
- **Managed database** with appropriate tier
- **Spot instances** for K3s nodes (if on cloud)
- **Resource requests** set accurately to avoid over-provisioning

## Support

For issues or questions:
1. Check logs: `kubectl logs -n roadmap -l app.kubernetes.io/name=roadmap-dashboard`
2. Review GitHub Issues
3. Check Notion API status
4. Verify database connectivity
