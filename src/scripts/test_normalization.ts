import { normalizeThaiText, createSearchQuery } from './update_location_data_final';

// Test cases for Thai text normalization
const testCases = [
  {
    input: 'จ.เชียงใหม่',
    expected: 'จังหวัดเชียงใหม่',
    description: 'Province abbreviation with tone marks'
  },
  {
    input: 'อ.เมือง​เชียงใหม่',
    expected: 'อำเภอเมืองเชียงใหม่',
    description: 'District with zero-width space'
  },
  {
    input: 'เชียง​ใหม่',
    expected: 'เชียงใหม่',
    description: 'Name with zero-width space'
  },
  {
    input: '  กรุงเทพ  มหานคร  ',
    expected: 'กรุงเทพมหานคร',
    description: 'Multiple spaces'
  }
];

// Run tests
console.log('=== Testing Thai Text Normalization ===');
testCases.forEach((testCase, index) => {
  const result = normalizeThaiText(testCase.input);
  const passed = result === testCase.expected;
  console.log(`\nTest ${index + 1}: ${testCase.description}`);
  console.log(`Input:    "${testCase.input}"`);
  console.log(`Expected: "${testCase.expected}"`);
  console.log(`Result:   "${result}"`);
  console.log(`Status:   ${passed ? '✅ PASSED' : '❌ FAILED'}`);
});

// Test search query construction
const queryTests = [
  {
    type: 'province' as const,
    data: { name_th: 'เชียงใหม่', name_en: 'Chiang Mai' },
    expected: 'ศาลากลางจังหวัดเชียงใหม่'
  },
  {
    type: 'province' as const,
    data: { name_th: 'กรุงเทพมหานคร', name_en: 'Bangkok' },
    expected: 'ศาลาว่าการกรุงเทพมหานคร'
  },
  {
    type: 'amphure' as const,
    data: { 
      name_th: 'เมืองเชียงใหม่', 
      name_en: 'Mueang Chiang Mai',
      province_name_th: 'เชียงใหม่',
      province_name_en: 'Chiang Mai'
    },
    expected: 'ที่ว่าการอำเภอเมืองเชียงใหม่'
  },
  {
    type: 'amphure' as const,
    data: { 
      name_th: 'พระนคร', 
      name_en: 'Phra Nakhon',
      province_name_th: 'กรุงเทพมหานคร',
      province_name_en: 'Bangkok'
    },
    expected: 'สำนักงานเขตพระนคร'
  }
];

console.log('\n=== Testing Search Query Construction ===');
queryTests.forEach((test, index) => {
  const result = createSearchQuery(test.type, test.data);
  const passed = result === test.expected;
  console.log(`\nTest ${index + 1}: ${test.data.name_en}`);
  console.log(`Input:    ${test.type}, ${test.data.name_th}`);
  console.log(`Expected: "${test.expected}"`);
  console.log(`Result:   "${result}"`);
  console.log(`Status:   ${passed ? '✅ PASSED' : '❌ FAILED'}`);
}); 