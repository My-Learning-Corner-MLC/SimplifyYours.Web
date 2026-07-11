export interface GuestListError {
  kind: 'notFound' | 'unauthorized' | 'server';
  message: string;
}
