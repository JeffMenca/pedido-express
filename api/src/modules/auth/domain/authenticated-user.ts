import { StaffRole } from '../../orders/domain/order-state-machine';

export interface AuthenticatedUser {
  id: string;
  username: string;
  role: StaffRole;
}
