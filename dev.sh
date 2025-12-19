#!/bin/bash
set -m
pnpm build-partial &&
cd client && webpack watch & 
wrangler dev --ip 0.0.0.0; kill %1