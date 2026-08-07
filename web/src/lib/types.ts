export type Role = 'organizer' | 'attendee';

export interface ApiUser {
  _id: string;
  name: string;
  email: string;
  role: Role;
}

export interface ApiEvent {
  _id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location?: string;
  organizer: ApiUser | string;
  participants?: ApiUser[];
  createdAt: string;
  updatedAt: string;
}

export interface EventListResponse {
  events: ApiEvent[];
  page: number;
  limit: number;
  total: number;
}

export interface AuthResponse {
  user: ApiUser;
  token: string;
}

/** Standard result shape for form server actions rendered with useActionState. */
export interface ActionState {
  error?: string;
}
