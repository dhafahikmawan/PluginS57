# TSSLPT and TSS_ARROWS Implementation

## Overview

The S57 plugin now includes a lightweight TSSLPT processing pipeline and derived TSS_ARROWS generation for traffic separation scheme markers.

## What is implemented

- TSSLPT point validation, reprojection, ordering, and deduplication
- Derived TSS_ARROWS lane synthesis from grouped TSSLPT points
- Styling hooks for both TSSLPT and TSS_ARROWS layers
- Integration into the S57 conversion bundle and GeoLibre layer registration flow

## Configuration

Default options are exposed through [S57Convert/src/lib/config/tssDefaults.ts](S57Convert/src/lib/config/tssDefaults.ts).

## Validation

The implementation is covered by unit tests for:

- TSSLPT geometry validation and reprojection
- Ordering and deduplication
- Lane identification and arrow generation
