export interface Commetters {
  users: Users;
}

export interface Users {
  page: string;
  title: string;
  users: User[];
  users_public_contributions: User[];
  private_users: User[];
  organizations: Organization[];
  public_contributions_organizations: Organization[];
  private_organizations: Organization[];
  generated: string;
  min_followers_required: number;
  total_user_count: number;
}

export interface Organization {
  rank: number;
  name: string;
  membercount: number;
}

export interface User {
  rank: number;
  name: string;
  login: string;
  avatarUrl: string;
  contributions: number;
  company: string;
  organizations: string;
}
