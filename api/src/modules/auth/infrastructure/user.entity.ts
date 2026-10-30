import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { StaffRole } from '../../orders/domain/order-state-machine';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true }) username: string;
  @Column({ name: 'password_hash' }) passwordHash: string;
  @Column({ type: 'varchar' }) role: StaffRole;
}
