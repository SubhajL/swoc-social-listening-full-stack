import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

// Define the attributes of the ApprovalRecord model
interface ApprovalRecordAttributes {
  id: number;
  postId: string;
  complaintId: string;
  link: string;
  type: string;
  province: string;
  startDate: string | null;
  endDate: string | null;
  totalDays: string;
  status: string;
  responsible: string;
  position: number; // RBAC position (1, 2, or 3)
  organizationId: string;
  organizationName: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Define the attributes for creating a new ApprovalRecord
export interface ApprovalRecordCreationAttributes extends Optional<ApprovalRecordAttributes, 'id'> {}

// Define the ApprovalRecord model
class ApprovalRecord extends Model<ApprovalRecordAttributes, ApprovalRecordCreationAttributes> implements ApprovalRecordAttributes {
  public id!: number;
  public postId!: string;
  public complaintId!: string;
  public link!: string;
  public type!: string;
  public province!: string;
  public startDate!: string | null;
  public endDate!: string | null;
  public totalDays!: string;
  public status!: string;
  public responsible!: string;
  public position!: number;
  public organizationId!: string;
  public organizationName!: string;
  
  // Timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

// Initialize the model
ApprovalRecord.init(
  {
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
  },
  {
    sequelize,
    tableName: 'approval_records',
    timestamps: true,
    underscored: true, // This tells Sequelize to use snake_case for all column names
  }
);

export default ApprovalRecord; 