export interface Transition {
  id: string;
  from: string;
  to: string;
  symbol: string;
  input?: string;
  pop?: string;
  push?: string;
}