# API-Only Stations Summary

## Overview

This report identifies telemetry stations available in the RID APIs that are not present in the PostgreSQL database.

### Overall Statistics

- **Total stations in database**: 579
- **Total unique stations from APIs**: 367
- **Stations in APIs but not in database**: 47 (12.81% of API stations)

### API Distribution

- **Only in hourly API**: 21 stations
- **Only in daily API**: 4 stations
- **In both APIs**: 22 stations

## API-Only Stations Analysis

### By Prefix

- **01**: 1 stations (Examples: 01)
- **02**: 1 stations (Examples: 02)
- **03**: 1 stations (Examples: 03)
- **04**: 1 stations (Examples: 04)
- **05**: 1 stations (Examples: 05)
- **C.**: 1 stations (Examples: C.30)
- **E.**: 2 stations (Examples: E.2A, E.95A)
- **K.**: 1 stations (Examples: K.56A)
- **Kgt.**: 1 stations (Examples: Kgt.34)
- **Kh.**: 10 stations (Examples: Kh.1, Kh.100, Kh.103, Kh.104, Kh.16B)
- **M.**: 3 stations (Examples: M.199, M.210, M.5A)
- **N.**: 3 stations (Examples: N.39, N.89, N.8B)
- **P.**: 1 stations (Examples: P.47A)
- **Pr.**: 1 stations (Examples: Pr.1)
- **S.**: 3 stations (Examples: S.46, S.51, S.52)
- **T.**: 2 stations (Examples: T.10, T.5)
- **TS.**: 1 stations (Examples: TS.2)
- **X.**: 8 stations (Examples: X.119, X.176, X.292, X.293, X.294)
- **Y.**: 5 stations (Examples: Y.49, Y.50, Y.51, Y.52, Y.6A)

## Recommendations

1. Review the generated SQL script to insert these missing stations into the database.
2. Consider fetching additional metadata (station name, river name, location) for these stations from the API.
3. Implement a periodic sync process to automatically add new stations as they become available in the API.
