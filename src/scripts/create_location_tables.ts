import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from the backend .env file
dotenv.config({ path: path.resolve(__dirname, '../../apps/backend/.env') });

async function createLocationTables() {
  console.log('Starting location tables creation...\n');

  const pool = new Pool({
    user: process.env.DB_WRITE_USER,
    password: process.env.DB_WRITE_PASSWORD,
    host: process.env.DB_WRITE_HOST,
    port: parseInt(process.env.DB_WRITE_PORT || '5432'),
    database: process.env.DB_WRITE_DATABASE,
    ssl: process.env.DB_WRITE_SSL === 'true' ? {
      rejectUnauthorized: false
    } : undefined
  });

  try {
    // Drop existing tables if they exist
    await pool.query(`
      DROP TABLE IF EXISTS amphures_new CASCADE;
      DROP TABLE IF EXISTS provinces_new CASCADE;
    `);

    // Create new tables with proper structure
    await pool.query(`
      CREATE TABLE provinces_new (
        id VARCHAR(2) PRIMARY KEY,
        name_th VARCHAR(250),
        name_en VARCHAR(250),
        latitude NUMERIC,
        longitude NUMERIC,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE amphures_new (
        id VARCHAR(4) PRIMARY KEY,
        name_th VARCHAR(250),
        name_en VARCHAR(250),
        province_id VARCHAR(2) REFERENCES provinces_new(id),
        latitude NUMERIC,
        longitude NUMERIC,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert provinces with proper encoding
    const provinces = [
      ['10', 'กรุงเทพมหานคร', 'Bangkok'],
      ['11', 'จังหวัดสมุทรปราการ', 'Samut Prakan'],
      ['12', 'จังหวัดนนทบุรี', 'Nonthaburi'],
      ['13', 'จังหวัดปทุมธานี', 'Pathum Thani'],
      ['14', 'จังหวัดพระนครศรีอยุธยา', 'Phra Nakhon Si Ayutthaya'],
      ['15', 'จังหวัดอ่างทอง', 'Ang Thong'],
      ['16', 'จังหวัดลพบุรี', 'Lopburi'],
      ['17', 'จังหวัดสิงห์บุรี', 'Sing Buri'],
      ['18', 'จังหวัดชัยนาท', 'Chai Nat'],
      ['19', 'จังหวัดสระบุรี', 'Saraburi'],
      ['20', 'จังหวัดชลบุรี', 'Chonburi'],
      ['21', 'จังหวัดระยอง', 'Rayong'],
      ['22', 'จังหวัดจันทบุรี', 'Chanthaburi'],
      ['23', 'จังหวัดตราด', 'Trat'],
      ['24', 'จังหวัดฉะเชิงเทรา', 'Chachoengsao'],
      ['25', 'จังหวัดปราจีนบุรี', 'Prachinburi'],
      ['26', 'จังหวัดนครนายก', 'Nakhon Nayok'],
      ['27', 'จังหวัดสระแก้ว', 'Sa Kaeo'],
      ['30', 'จังหวัดนครราชสีมา', 'Nakhon Ratchasima'],
      ['31', 'จังหวัดบุรีรัมย์', 'Buriram'],
      ['32', 'จังหวัดสุรินทร์', 'Surin'],
      ['33', 'จังหวัดศรีสะเกษ', 'Sisaket'],
      ['34', 'จังหวัดอุบลราชธานี', 'Ubon Ratchathani'],
      ['35', 'จังหวัดยโสธร', 'Yasothon'],
      ['36', 'จังหวัดชัยภูมิ', 'Chaiyaphum'],
      ['37', 'จังหวัดอำนาจเจริญ', 'Amnat Charoen'],
      ['38', 'จังหวัดบึงกาฬ', 'Bueng Kan'],
      ['39', 'จังหวัดหนองบัวลำภู', 'Nong Bua Lamphu'],
      ['40', 'จังหวัดขอนแก่น', 'Khon Kaen'],
      ['41', 'จังหวัดอุดรธานี', 'Udon Thani'],
      ['42', 'จังหวัดเลย', 'Loei'],
      ['43', 'จังหวัดหนองคาย', 'Nong Khai'],
      ['44', 'จังหวัดมหาสารคาม', 'Maha Sarakham'],
      ['45', 'จังหวัดร้อยเอ็ด', 'Roi Et'],
      ['46', 'จังหวัดกาฬสินธุ์', 'Kalasin'],
      ['47', 'จังหวัดสกลนคร', 'Sakon Nakhon'],
      ['48', 'จังหวัดนครพนม', 'Nakhon Phanom'],
      ['49', 'จังหวัดมุกดาหาร', 'Mukdahan'],
      ['50', 'จังหวัดเชียงใหม่', 'Chiang Mai'],
      ['51', 'จังหวัดลำพูน', 'Lamphun'],
      ['52', 'จังหวัดลำปาง', 'Lampang'],
      ['53', 'จังหวัดอุตรดิตถ์', 'Uttaradit'],
      ['54', 'จังหวัดแพร่', 'Phrae'],
      ['55', 'จังหวัดน่าน', 'Nan'],
      ['56', 'จังหวัดพะเยา', 'Phayao'],
      ['57', 'จังหวัดเชียงราย', 'Chiang Rai'],
      ['58', 'จังหวัดแม่ฮ่องสอน', 'Mae Hong Son'],
      ['60', 'จังหวัดนครสวรรค์', 'Nakhon Sawan'],
      ['61', 'จังหวัดอุทัยธานี', 'Uthai Thani'],
      ['62', 'จังหวัดกำแพงเพชร', 'Kamphaeng Phet'],
      ['63', 'จังหวัดตาก', 'Tak'],
      ['64', 'จังหวัดสุโขทัย', 'Sukhothai'],
      ['65', 'จังหวัดพิษณุโลก', 'Phitsanulok'],
      ['66', 'จังหวัดพิจิตร', 'Phichit'],
      ['67', 'จังหวัดเพชรบูรณ์', 'Phetchabun'],
      ['70', 'จังหวัดราชบุรี', 'Ratchaburi'],
      ['71', 'จังหวัดกาญจนบุรี', 'Kanchanaburi'],
      ['72', 'จังหวัดสุพรรณบุรี', 'Suphan Buri'],
      ['73', 'จังหวัดนครปฐม', 'Nakhon Pathom'],
      ['74', 'จังหวัดสมุทรสาคร', 'Samut Sakhon'],
      ['75', 'จังหวัดสมุทรสงคราม', 'Samut Songkhram'],
      ['76', 'จังหวัดเพชรบุรี', 'Phetchaburi'],
      ['77', 'จังหวัดประจวบคีรีขันธ์', 'Prachuap Khiri Khan'],
      ['80', 'จังหวัดนครศรีธรรมราช', 'Nakhon Si Thammarat'],
      ['81', 'จังหวัดกระบี่', 'Krabi'],
      ['82', 'จังหวัดพังงา', 'Phang Nga'],
      ['83', 'จังหวัดภูเก็ต', 'Phuket'],
      ['84', 'จังหวัดสุราษฎร์ธานี', 'Surat Thani'],
      ['85', 'จังหวัดระนอง', 'Ranong'],
      ['86', 'จังหวัดชุมพร', 'Chumphon'],
      ['90', 'จังหวัดสงขลา', 'Songkhla'],
      ['91', 'จังหวัดสตูล', 'Satun'],
      ['92', 'จังหวัดตรัง', 'Trang'],
      ['93', 'จังหวัดพัทลุง', 'Phatthalung'],
      ['94', 'จังหวัดปัตตานี', 'Pattani'],
      ['95', 'จังหวัดยะลา', 'Yala'],
      ['96', 'จังหวัดนราธิวาส', 'Narathiwat']
    ];

    // Insert provinces
    for (const [id, name_th, name_en] of provinces) {
      await pool.query(`
        INSERT INTO provinces_new (id, name_th, name_en)
        VALUES ($1, $2, $3)
      `, [id, name_th, name_en]);
    }

    // Verify the encoding
    const verifyResult = await pool.query(`
      SELECT id, name_th, name_en, encode(name_th::bytea, 'hex') as hex
      FROM provinces_new
      ORDER BY id
      LIMIT 5
    `);

    console.log('\nVerifying first 5 provinces:');
    verifyResult.rows.forEach(row => {
      console.log(`ID: ${row.id}`);
      console.log(`Thai: ${row.name_th}`);
      console.log(`English: ${row.name_en}`);
      console.log(`Hex: ${row.hex}`);
      console.log();
    });

    console.log('Location tables created successfully!');

  } catch (error) {
    console.error('Error during table creation:', error);
  } finally {
    await pool.end();
  }
}

createLocationTables().catch(console.error); 