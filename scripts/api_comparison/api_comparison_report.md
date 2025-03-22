# RID Telemetry API Services Comparison

## Summary

This report compares the stations returned by two RID Telemetry API services:
- `getHourlyStationList`
- `getDailyStationList`

### Overall Statistics

- **Total unique stations across both APIs**: 379
- **Common stations**: 345 (91.03%)
- **Stations only in hourly API**: 24 (6.33%)
- **Stations only in daily API**: 10 (2.64%)

### Conclusion

The APIs return OVERLAPPING station sets.

## Station Code Samples

### Common Stations (both APIs)

- `P.67`
- `P.1`
- `P.103`
- `P.82`
- `P.84`
- `P.81`
- `P.5`
- `P.76`
- `P.85`
- `P.77`
- ... and 335 more

### Stations Only in Hourly API

- `W.17A`
- `E.75`
- `03`
- `04`
- `05`
- `01`
- `02`
- `N.80`
- `C.38`
- `C.22A`
- ... and 14 more

### Stations Only in Daily API

- `SW.6`
- `M.145`
- `M.174`
- `M.210`
- `Ny.4`
- `Z.18`
- `X.260`
- `X.267`
- `X.112`
- `X.261`


## Recommendations

Based on this comparison:

1. When retrieving station metadata, consider using getHourlyStationList API as it contains more unique stations.

2. For complete coverage, consider querying both APIs and merging the results, as each contains unique stations not found in the other.

3. When storing station data in the database, include a field indicating which API(s) the station is available from.
