# Database vs. RID API Stations Comparison

## Summary

This report compares the telemetry stations in the PostgreSQL database with those available from the RID API services.

### Overall Statistics

- **Total stations in database**: 579
- **Total unique stations from APIs**: 367
- **Stations in database but not in APIs**: 258 (44.56%)

## Non-API Stations Analysis

### By Prefix

- **040361**: 2 stations (Examples: 040361 (C.13), 040361 (C.30))
- **060191**: 1 stations (Examples: 060191 (kgt.29))
- **090160**: 1 stations (Examples: 090160 (สชป.9))
- **090171**: 1 stations (Examples: 090171 (Kgt.19) )
- **090381**: 1 stations (Examples: 090381 เขาเขียว)
- **190620**: 1 stations (Examples: 190620 (S.28))
- **260311**: 1 stations (Examples: 260311 (N.67))
- **260451**: 1 stations (Examples: 260451)
- **260461**: 1 stations (Examples: 260461)
- **440191**: 1 stations (Examples: 440191 (Kgt.15A))
- **440401**: 1 stations (Examples: 440401)
- **440411**: 1 stations (Examples: 440411)
- **660131**: 1 stations (Examples: 660131)
- **690151**: 1 stations (Examples: 690151 (C.30))
- **690251**: 1 stations (Examples: 690251)
- **690371**: 1 stations (Examples: 690371)
- **740081**: 1 stations (Examples: 740081 (Kgt.12))
- **740331**: 1 stations (Examples: 740331)
- **B.**: 1 stations (Examples: B.17)
- **C.**: 15 stations (Examples: C.12, C.22A, C.28A, C.38, C.44)
- **Ct.**: 5 stations (Examples: Ct.20, Ct.21, Ct.22, Ct.23, Ct.24)
- **E.**: 22 stations (Examples: E.5, E.6C, E.29A, E.32A, E.54)
- **G.**: 5 stations (Examples: G.12, G.14, G.2A, G.4, G.8A)
- **Gt.**: 10 stations (Examples: Gt.8, Gt.15, Gt.16, Gt.17, Gt.18)
- **I.**: 3 stations (Examples: I.14, I.1A, I.6)
- **K.**: 12 stations (Examples: K.17, K.22C, K.25A, K.30, K.38A)
- **KH.**: 22 stations (Examples: KH.9A, KH.18, KH.28A, KH.53, KH.54)
- **Kgt.**: 12 stations (Examples: Kgt.18, Kgt.44, Kgt.45, Kgt.65, Kgt.66 )
- **M.**: 32 stations (Examples: M.38C, M.49, M.50, M.75, M.91)
- **N.**: 26 stations (Examples: N.63, N.86, N.87, N.88, N.8)
- **Ny.**: 1 stations (Examples: Ny.6)
- **P.**: 8 stations (Examples: P.104, P.105, P.14, P.24D, P.85A)
- **S.**: 11 stations (Examples: S.10, S.17, S.36, S.7A, S.39)
- **T.**: 3 stations (Examples: T.11, T.12A, T.10 )
- **Tl.**: 3 stations (Examples: Tl.4, Tl.6, Tl.3)
- **X.**: 29 stations (Examples: X.214, X.284, X.286, X.287, X.288)
- **Y.**: 9 stations (Examples: Y.36, Y.37A, Y.66, Y.67, Y.5)
- **Z.**: 10 stations (Examples: Z.46, Z.52, Z.53, Z.55, Z.56)

## Recommendations

1. Consider if these non-API stations are still active or if they should be marked as deprecated in the database.
2. Check if these stations are available through alternative API services not currently being used.
3. Verify if these stations use a different identification scheme that might require mapping between database IDs and API IDs.
