import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
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
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('approval_records');
} 