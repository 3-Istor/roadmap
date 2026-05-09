#!/usr/bin/env bash
# Helper script to generate Prisma client with NixOS compatibility

# Source the Nix environment if available
if [ -f shell.nix ]; then
  echo "Using NixOS Prisma engines..."
  export PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
fi

# Generate Prisma client
npx prisma generate

echo "✅ Prisma client generated successfully!"
