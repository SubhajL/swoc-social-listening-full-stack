import pg from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from the backend .env file
dotenv.config({ path: path.resolve(__dirname, '../../apps/backend/.env') });

// Define the amphure data from the image
const amphureData = [
  // Kalasin (46)
  { id: 4601, nameTh: 'เมืองกาฬสินธุ์', nameEn: 'Mueang Kalasin', provinceId: 46 },
  { id: 4602, nameTh: 'นามน', nameEn: 'Na Mon', provinceId: 46 },
  { id: 4603, nameTh: 'กมลาไสย', nameEn: 'Kamalasai', provinceId: 46 },
  { id: 4604, nameTh: 'ร่องคำ', nameEn: 'Rong Kham', provinceId: 46 },
  { id: 4605, nameTh: 'กุฉินารายณ์', nameEn: 'Kuchinarai', provinceId: 46 },
  { id: 4606, nameTh: 'เขาวง', nameEn: 'Khao Wong', provinceId: 46 },
  { id: 4607, nameTh: 'ยางตลาด', nameEn: 'Yang Talat', provinceId: 46 },
  { id: 4608, nameTh: 'ห้วยเม็ก', nameEn: 'Huai Mek', provinceId: 46 },
  { id: 4609, nameTh: 'สหัสขันธ์', nameEn: 'Sahatsakhan', provinceId: 46 },
  { id: 4610, nameTh: 'คำม่วง', nameEn: 'Kham Muang', provinceId: 46 },
  { id: 4611, nameTh: 'ท่าคันโท', nameEn: 'Tha Khantho', provinceId: 46 },
  { id: 4612, nameTh: 'หนองกุงศรี', nameEn: 'Nong Kung Si', provinceId: 46 },
  { id: 4613, nameTh: 'สมเด็จ', nameEn: 'Somdet', provinceId: 46 },
  { id: 4614, nameTh: 'ห้วยผึ้ง', nameEn: 'Huai Phueng', provinceId: 46 },
  { id: 4615, nameTh: 'สามชัย', nameEn: 'Sam Chai', provinceId: 46 },
  { id: 4616, nameTh: 'นาคู', nameEn: 'Na Khu', provinceId: 46 },
  { id: 4617, nameTh: 'ดอนจาน', nameEn: 'Don Chan', provinceId: 46 },
  { id: 4618, nameTh: 'ฆ้องชัย', nameEn: 'Khong Chai', provinceId: 46 },

  // Sakon Nakhon (47)
  { id: 4701, nameTh: 'เมืองสกลนคร', nameEn: 'Mueang Sakon Nakhon', provinceId: 47 },
  { id: 4702, nameTh: 'กุสุมาลย์', nameEn: 'Kusuman', provinceId: 47 },
  { id: 4703, nameTh: 'กุดบาก', nameEn: 'Kut Bak', provinceId: 47 },
  { id: 4704, nameTh: 'พรรณานิคม', nameEn: 'Phanna Nikhom', provinceId: 47 },
  { id: 4705, nameTh: 'พังโคน', nameEn: 'Phang Khon', provinceId: 47 },
  { id: 4706, nameTh: 'วาริชภูมิ', nameEn: 'Waritchaphum', provinceId: 47 },
  { id: 4707, nameTh: 'นิคมน้ำอูน', nameEn: 'Nikhom Nam Un', provinceId: 47 },
  { id: 4708, nameTh: 'วานรนิวาส', nameEn: 'Wanon Niwat', provinceId: 47 },
  { id: 4709, nameTh: 'คำตากล้า', nameEn: 'Kham Ta Kla', provinceId: 47 },
  { id: 4710, nameTh: 'บ้านม่วง', nameEn: 'Ban Muang', provinceId: 47 },
  { id: 4711, nameTh: 'อากาศอำนวย', nameEn: 'Akat Amnuai', provinceId: 47 },
  { id: 4712, nameTh: 'สว่างแดนดิน', nameEn: 'Sawang Daen Din', provinceId: 47 },
  { id: 4713, nameTh: 'ส่องดาว', nameEn: 'Song Dao', provinceId: 47 },
  { id: 4714, nameTh: 'เต่างอย', nameEn: 'Tao Ngoi', provinceId: 47 },
  { id: 4715, nameTh: 'โคกศรีสุพรรณ', nameEn: 'Khok Si Suphan', provinceId: 47 },
  { id: 4716, nameTh: 'เจริญศิลป์', nameEn: 'Charoen Sin', provinceId: 47 },
  { id: 4717, nameTh: 'โพนนาแก้ว', nameEn: 'Phon Na Kaeo', provinceId: 47 },
  { id: 4718, nameTh: 'ภูพาน', nameEn: 'Phu Phan', provinceId: 47 },

  // Nakhon Phanom (48)
  { id: 4801, nameTh: 'เมืองนครพนม', nameEn: 'Mueang Nakhon Phanom', provinceId: 48 },
  { id: 4802, nameTh: 'ปลาปาก', nameEn: 'Pla Pak', provinceId: 48 },
  { id: 4803, nameTh: 'ท่าอุเทน', nameEn: 'Tha Uthen', provinceId: 48 },
  { id: 4804, nameTh: 'บ้านแพง', nameEn: 'Ban Phaeng', provinceId: 48 },
  { id: 4805, nameTh: 'ธาตุพนม', nameEn: 'That Phanom', provinceId: 48 },
  { id: 4806, nameTh: 'เรณูนคร', nameEn: 'Renu Nakhon', provinceId: 48 },
  { id: 4807, nameTh: 'นาแก', nameEn: 'Na Kae', provinceId: 48 },
  { id: 4808, nameTh: 'ศรีสงคราม', nameEn: 'Si Songkhram', provinceId: 48 },
  { id: 4809, nameTh: 'นาหว้า', nameEn: 'Na Wa', provinceId: 48 },
  { id: 4810, nameTh: 'โพนสวรรค์', nameEn: 'Phon Sawan', provinceId: 48 },
  { id: 4811, nameTh: 'นาทม', nameEn: 'Na Thom', provinceId: 48 },
  { id: 4812, nameTh: 'วังยาง', nameEn: 'Wang Yang', provinceId: 48 },

  // Mukdahan (49)
  { id: 4901, nameTh: 'เมืองมุกดาหาร', nameEn: 'Mueang Mukdahan', provinceId: 49 },
  { id: 4902, nameTh: 'นิคมคำสร้อย', nameEn: 'Nikhom Kham Soi', provinceId: 49 },
  { id: 4903, nameTh: 'ดอนตาล', nameEn: 'Don Tan', provinceId: 49 },
  { id: 4904, nameTh: 'ดงหลวง', nameEn: 'Dong Luang', provinceId: 49 },
  { id: 4905, nameTh: 'คำชะอี', nameEn: 'Khamcha-i', provinceId: 49 },
  { id: 4906, nameTh: 'หว้านใหญ่', nameEn: 'Wan Yai', provinceId: 49 },
  { id: 4907, nameTh: 'หนองสูง', nameEn: 'Nong Sung', provinceId: 49 },

  // Phichit (66)
  { id: 6601, nameTh: 'เมืองพิจิตร', nameEn: 'Mueang Phichit', provinceId: 66 },
  { id: 6602, nameTh: 'วังทรายพูน', nameEn: 'Wang Sai Phun', provinceId: 66 },
  { id: 6603, nameTh: 'โพธิ์ประทับช้าง', nameEn: 'Pho Prathap Chang', provinceId: 66 },
  { id: 6604, nameTh: 'ตะพานหิน', nameEn: 'Taphan Hin', provinceId: 66 },
  { id: 6605, nameTh: 'บางมูลนาก', nameEn: 'Bang Mun Nak', provinceId: 66 },
  { id: 6606, nameTh: 'โพทะเล', nameEn: 'Pho Thale', provinceId: 66 },
  { id: 6607, nameTh: 'สามง่าม', nameEn: 'Sam Ngam', provinceId: 66 },
  { id: 6608, nameTh: 'ทับคล้อ', nameEn: 'Tap Khlo', provinceId: 66 },
  { id: 6609, nameTh: 'สากเหล็ก', nameEn: 'Sak Lek', provinceId: 66 },
  { id: 6610, nameTh: 'บึงนาราง', nameEn: 'Bueng Na Rang', provinceId: 66 },
  { id: 6611, nameTh: 'ดงเจริญ', nameEn: 'Dong Charoen', provinceId: 66 },
  { id: 6612, nameTh: 'วชิรบารมี', nameEn: 'Wachirabarami', provinceId: 66 },

  // Phetchabun (67)
  { id: 6701, nameTh: 'เมืองเพชรบูรณ์', nameEn: 'Mueang Phetchabun', provinceId: 67 },
  { id: 6702, nameTh: 'ชนแดน', nameEn: 'Chon Daen', provinceId: 67 },
  { id: 6703, nameTh: 'หล่มสัก', nameEn: 'Lom Sak', provinceId: 67 },
  { id: 6704, nameTh: 'หล่มเก่า', nameEn: 'Lom Kao', provinceId: 67 },
  { id: 6705, nameTh: 'วิเชียรบุรี', nameEn: 'Wichian Buri', provinceId: 67 },
  { id: 6706, nameTh: 'ศรีเทพ', nameEn: 'Si Thep', provinceId: 67 },
  { id: 6707, nameTh: 'หนองไผ่', nameEn: 'Nong Phai', provinceId: 67 },
  { id: 6708, nameTh: 'บึงสามพัน', nameEn: 'Bueng Sam Phan', provinceId: 67 },
  { id: 6709, nameTh: 'น้ำหนาว', nameEn: 'Nam Nao', provinceId: 67 },
  { id: 6710, nameTh: 'วังโป่ง', nameEn: 'Wang Pong', provinceId: 67 },
  { id: 6711, nameTh: 'เขาค้อ', nameEn: 'Khao Kho', provinceId: 67 }
];

async function populateAmphuresFromData() {
  console.log('Starting amphures population from data...');

  const pool = new pg.Pool({
    user: process.env.DB_WRITE_USER,
    password: process.env.DB_WRITE_PASSWORD,
    host: process.env.DB_WRITE_HOST,
    port: parseInt(process.env.DB_WRITE_PORT || '5432'),
    database: process.env.DB_WRITE_DATABASE,
  });

  try {
    // Delete existing amphures for the provinces we're updating
    console.log('\nDeleting existing amphures for provinces 46-49, 66-67...');
    await pool.query('DELETE FROM amphures_new WHERE province_id::integer IN (46,47,48,49,66,67)');

    // Insert new amphures
    let insertCount = 0;
    for (const amphure of amphureData) {
      const prefix = amphure.provinceId === 10 ? 'เขต' : 'อำเภอ';
      await pool.query(
        'INSERT INTO amphures_new (id, name_th, name_en, province_id) VALUES ($1, $2, $3, $4)',
        [
          amphure.id,
          `${prefix}${amphure.nameTh}`,
          amphure.nameEn,
          amphure.provinceId
        ]
      );
      console.log(`Added amphure: ${amphure.id} - ${prefix}${amphure.nameTh} (${amphure.nameEn})`);
      insertCount++;
    }

    console.log(`\nInserted ${insertCount} new amphures\n`);

    // Verify amphures for each province
    for (const provinceId of [46, 47, 48, 49, 66, 67]) {
      console.log(`\nVerifying amphures for province ${provinceId}:`);
      const verifyResult = await pool.query(`
        SELECT a.id, a.name_th, a.name_en, p.name_th as province_name
        FROM amphures_new a
        JOIN provinces_new p ON a.province_id = p.id
        WHERE a.province_id::integer = $1
        ORDER BY a.id
      `, [provinceId]);

      for (const row of verifyResult.rows) {
        console.log(`\nID: ${row.id}`);
        console.log(`Thai: ${row.name_th}`);
        console.log(`English: ${row.name_en}`);
        console.log(`Province: ${row.province_name}`);
      }

      // Get amphur count for the province
      const countResult = await pool.query(`
        SELECT p.name_th, COUNT(a.id) as count
        FROM provinces_new p
        LEFT JOIN amphures_new a ON p.id = a.province_id
        WHERE p.id::integer = $1
        GROUP BY p.name_th
      `, [provinceId]);

      for (const row of countResult.rows) {
        console.log(`\n${row.name_th}: ${row.count} amphurs`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

async function checkAllProvinces() {
  console.log('Checking all provinces and their amphures...');

  const pool = new pg.Pool({
    user: process.env.DB_WRITE_USER,
    password: process.env.DB_WRITE_PASSWORD,
    host: process.env.DB_WRITE_HOST,
    port: parseInt(process.env.DB_WRITE_PORT || '5432'),
    database: process.env.DB_WRITE_DATABASE,
  });

  try {
    // Get all provinces and their amphure counts
    const result = await pool.query(`
      WITH province_counts AS (
        SELECT 
          p.id,
          p.name_th,
          p.name_en,
          COUNT(a.id) as amphure_count
        FROM provinces_new p
        LEFT JOIN amphures_new a ON p.id = a.province_id
        GROUP BY p.id, p.name_th, p.name_en
        ORDER BY p.id
      )
      SELECT *,
        CASE 
          WHEN amphure_count = 0 THEN 'Missing amphures'
          ELSE 'OK'
        END as status
      FROM province_counts
    `);

    console.log('\nProvinces without amphures:');
    console.log('===========================');
    
    let totalProvinces = 0;
    let provincesWithAmphures = 0;
    let provincesWithoutAmphures = 0;

    for (const row of result.rows) {
      totalProvinces++;
      if (row.amphure_count > 0) {
        provincesWithAmphures++;
      } else {
        provincesWithoutAmphures++;
        console.log(`\nID: ${row.id}`);
        console.log(`Name: ${row.name_th} (${row.name_en})`);
        console.log(`Amphure count: ${row.amphure_count}`);
      }
    }

    console.log('\nSummary:');
    console.log(`Total Provinces: ${totalProvinces}`);
    console.log(`Provinces with Amphures: ${provincesWithAmphures}`);
    console.log(`Provinces without Amphures: ${provincesWithoutAmphures}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

populateAmphuresFromData().catch(console.error);
checkAllProvinces().catch(console.error); 