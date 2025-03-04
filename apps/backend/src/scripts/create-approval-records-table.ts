import sequelize from '../config/database';
import { DataTypes } from 'sequelize';
import { logger } from '../utils/logger';

async function createApprovalRecordsTable() {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    logger.info('Checking if approval_records table exists...');
    
    // Check if the table already exists
    const tables = await queryInterface.showAllTables();
    if (tables.includes('approval_records')) {
      logger.info('approval_records table already exists');
      process.exit(0);
      return;
    }
    
    logger.info('Creating approval_records table...');
    
    // Create the table
    await queryInterface.createTable('approval_records', {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      postId: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'post_id'
      },
      complaintId: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'complaint_id'
      },
      link: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      province: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      startDate: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'start_date'
      },
      endDate: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'end_date'
      },
      totalDays: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'total_days'
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      responsible: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      position: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      organizationId: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'organization_id'
      },
      organizationName: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'organization_name'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'created_at'
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'updated_at'
      }
    });
    
    logger.info('approval_records table created successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error creating approval_records table:', error);
    process.exit(1);
  }
}

// Run the function
createApprovalRecordsTable(); 