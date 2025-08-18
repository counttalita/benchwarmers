# Docker Setup for Benchwarmers

This directory contains the Docker configuration for the Benchwarmers marketplace platform.

## Services

### PostgreSQL Database
- **Image**: `postgres:15-alpine`
- **Port**: `5432`
- **Database**: `benchwarmers_dev`
- **User**: `postgres`
- **Password**: `password`

### Redis Cache
- **Image**: `redis:7-alpine`
- **Port**: `6379`

## Directory Structure

```
docker/
├── postgres/
│   └── init/
│       └── 01-init.sql    # Database initialization script
└── README.md              # This file
```

## Database Initialization

The `01-init.sql` script is automatically executed when the PostgreSQL container starts for the first time. It includes:

- Creation of `uuid-ossp` extension for UUID generation
- Creation of `pg_trgm` extension for text search capabilities
- Comments for future index creation

## Usage

### Start Services
```bash
docker-compose up -d
```

### Stop Services
```bash
docker-compose down
```

### View Logs
```bash
docker-compose logs postgres
docker-compose logs redis
```

### Connect to Database
```bash
# Using docker exec
docker exec -it benchwarmers-postgres psql -U postgres -d benchwarmers_dev

# Using local psql (if installed)
psql -h localhost -p 5432 -U postgres -d benchwarmers_dev
```

### Reset Database
```bash
docker-compose down -v
docker-compose up -d
```

## Troubleshooting

### Issue: "cannot create subdirectories" Error
This error occurs when Docker tries to mount a file to a directory. The fix is to:

1. Use a directory mount instead of a file mount
2. Place init scripts in `docker/postgres/init/` directory
3. Mount the entire directory to `/docker-entrypoint-initdb.d`

### Issue: Port Conflicts
If ports 5432 or 6379 are already in use:

1. Stop existing services using those ports
2. Or modify the port mappings in `docker-compose.yml`

### Issue: Permission Denied
If you encounter permission issues:

1. Ensure the init script has correct permissions: `chmod 644 docker/postgres/init/01-init.sql`
2. Check Docker volume permissions

## Environment Variables

The following environment variables can be customized in `docker-compose.yml`:

- `POSTGRES_DB`: Database name (default: `benchwarmers_dev`)
- `POSTGRES_USER`: Database user (default: `postgres`)
- `POSTGRES_PASSWORD`: Database password (default: `password`)

## Health Checks

Both services include health checks:

- **PostgreSQL**: Uses `pg_isready` to verify database connectivity
- **Redis**: Uses `redis-cli ping` to verify cache connectivity

Health checks run every 10 seconds with a 5-second timeout and 5 retries.
