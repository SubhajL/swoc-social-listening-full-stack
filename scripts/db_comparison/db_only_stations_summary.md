# Database-Only Stations Summary

## Overview

This report identifies telemetry stations in the PostgreSQL database that are not available in the RID APIs.

### Overall Statistics

- **Total stations in database**: 579
- **Total stations in API**: 367
- **Stations in database but not in API**: 258 (45% of database stations)

## Database-Only Stations Analysis

The following stations exist in the PostgreSQL database but are not available through the RID API.

| Station ID | Station Name | Province | River Basin | River Name |
|------------|--------------|----------|------------|------------|
| 040361 (C.13) | เขื่อนเจ้าพระยา | ชัยนาท | เจ้าพระยา | แม่น้ำเจ้าพระยา |
| 040361 (C.30) | เขื่อนเจ้าพระยา | ชัยนาท | เจ้าพระยา | แม่น้ำเจ้าพระยา |
| 060191 (kgt.29) | บ้านปะตง | จันทบุรี | ชายฝั่งทะเลตะวันออก | อบต.ปะตง |
| 090160 (สชป.9) | ต้าบลบางพระ | ชลบุรี | บางปะกง | อ่างเก็บน้ำบางพระ |
| 090171 (Kgt.19)  | บ้านเขานางนม | ชลบุรี | บางปะกง | คลองหลวง |
| 090381 เขาเขียว | บ้านเขาไม้แดง | ชลบุรี | บางปะกง | น้ำตกชันตาเถร |
| 190620 (S.28) | เขื่อนป่าสักชลสิทธิ์ | ลพบุรี | ป่าสัก | แม่น้ำป่าสัก |
| 260311 (N.67) | บ้านเกยไชยเหนือ | นครสวรรค์ | น้ำน่าน | แม่น้ำน่าน |
| 260451 | บ้านเกาะใหญ่ | นครสวรรค์ | สะแกกรัง | บ้านเกาะใหญ่ |
| 260461 | บ้านธารมะยม | นครสวรรค์ | สะแกกรัง | บ้านธารมะยม |
| 440191 (Kgt.15A) | บ้านแก่งดินสอ | ปราจีนบุรี | บางปะกง | ห้วยโสมง |
| 440401 | บ้านแก่งดินสอ | ปราจีนบุรี | บางปะกง | อ่างฯนฤบดินทรจินดาฝั่งซ้าย |
| 440411 | บ้านแก่งดินสอ | ปราจีนบุรี | บางปะกง | อ่างฯนฤบดินทรจินดาฝั่งขวา |
| 660131 | บ้านหมื่นด่าน | ตราด | ชายฝั่งทะเลตะวันออก | กองร้อยทหารพราน |
| 690151 (C.30) | บ้านสมอทอง | อุทัยธานี | ท่าจีน | ห้วยขุนแก้ว |
| 690251 | - | อุทัยธานี | สะแกกรัง | โครงการส่งน้ำฯทับเสลา |
| 690371 | ระบำ | อุทัยธานี | สะแกกรัง | ห้วยขาแข้ง |
| 740081 (Kgt.12) | บ้านแก้ง | สระแก้ว | บางปะกง | คลองพระปรง |
| 740331 | อบต.วังสมบูรณ์ | สระแก้ว | บางปะกง | - |
| B.17 | สะพานถนนเพชรเกษม | เพชรบุรี | ลุ่มน้ำหลัก | แม่น้ำเพชรบุรี |
| C.12 | กรมชลประทานสามเสน | กรุงเทพมหานคร | เจ้าพระยา | แม่น้ำเจ้าพระยา |
| C.22A | กรมชลประทานปากเกร็ด | นนทบุรี | เจ้าพระยา | แม่น้ำเจ้าพระยา |
| C.28A | บ้านอิฐ | อ่างทอง | เจ้าพระยา | คลองบางแก้ว |
| C.38 | โรงเรียนคณะราษฎร์บำรุง | ปทุมธานี | เจ้าพระยา | แม่น้ำเจ้าพระยา |
| C.44 | บ้านอินทร์บุรี | สิงห์บุรี | เจ้าพระยา | แม่น้ำเจ้าพระยา |
| C.45 | บ้านบางน้ำเชี่ยว | สิงห์บุรี | เจ้าพระยา | แม่น้ำเจ้าพระยา |
| C.46 | บ้านไชโย | อ่างทอง | เจ้าพระยา | แม่น้ำเจ้าพระยา |
| C.47 | บ้านป่าโมก | อ่างทอง | เจ้าพระยา | แม่น้ำเจ้าพระยา |
| C.51 | บ้านกุดจอก | ชัยนาท | ท่าจีน | ห้วยขุนแก้ว |
| C.56 | บ้านท่าน้ำอ้อย | นครสวรรค์ | เจ้าพระยา | แม่น้ำเจ้าพระยา |
| C.58 | บ้านหนองบัว | ชัยนาท | เจ้าพระยา | คลองกระทง |
| C.60 | บ้านท่าตะโก | นครสวรรค์ | เจ้าพระยา | คลองท่าตะโก |
| C.64 | ท่าข้ากำนันทรง | นครสวรรค์ | เจ้าพระยา | บึงบอระเพ็ด |
| C.65 | สะพานบางประมุง | นครสวรรค์ | เจ้าพระยา | คลองบางประมุง |
| C.66 | สะพานโคกจันทร์ | ชัยนาท | เจ้าพระยา | แม่น้ำเจ้าพระยา |
| Ct.20 | บ้านสะพานเหล็ก | อุทัยธานี | สะแกกรัง | ห้วยทับเสลา |
| Ct.21 | บ้านบึงโคกช้าง | อุทัยธานี | สะแกกรัง | ห้วยก้านยาว |
| Ct.22 | บ้านหมกแถว | อุทัยธานี | สะแกกรัง | ห้วยขวี |
| Ct.23 | บ้านห้วยรัง | อุทัยธานี | สะแกกรัง | ห้วยรัง |
| Ct.24 | บ้านจักษา | อุทัยธานี | สะแกกรัง | คลองระแวง |
| E.29A | บ้านผานกเค้า | เลย | น้ำชี | ลำน้ำพอง |
| E.32A | บ้านหนองอ้อ | ชัยภูมิ | น้ำชี | แม่น้ำชี |
| E.5 | บ้านโนนเปลือย | ชัยภูมิ | น้ำชี | แม่น้ำชี |
| E.54 | บ้านกุดฉิมคุ้มใหญ่ | กาฬสินธุ์ | น้ำชี | ลำน้ำยัง |
| E.57A | บ้านสมสนุก | กาฬสินธุ์ | น้ำชี | น้ำยัง |
| E.64A | บ้านนาแก | หนองบัวลำภู | น้ำชี | ลำพะเนียง |
| E.65 | บ้านท่าไฮ | อุดรธานี | น้ำชี | ลำปาว |
| E.67 | บ้านท่างาม | กาฬสินธุ์ | น้ำชี | ลำพันชาด |
| E.68A | บ้านข้องโป้ | หนองบัวลำภู | น้ำชี | ลำพะเนียง |
| E.6C | บ้านตาดโตน | ชัยภูมิ | น้ำชี | ลำปะทาว |

*Note: Showing 50 of 258 stations. See db_comparison/db_only_stations.json for the complete list.*

## Recommendations

1. Review these database-only stations to determine:
   - If these stations actually exist in the real world but are not exposed via the API
   - If these are legacy stations no longer in service
   - If these stations have a different identifier in the API

2. For stations confirmed to be non-existent or deprecated:
   - Consider marking them as inactive in the database
   - Document their status for historical reference

3. For stations that should be available via API:
   - Contact RID to understand why they're not included in the API
   - Implement a fallback data source for these stations

4. Update the station mapping system to reflect these stations' status

## Next Steps

1. Verify a sample of these stations using alternative sources
2. Update database records to reflect current status
3. Document any special handling needed for these stations in the application