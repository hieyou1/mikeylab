#!/bin/bash
set -m
pnpm build-partial &&
cd client && webpack watch & 
wrangler dev; kill %1