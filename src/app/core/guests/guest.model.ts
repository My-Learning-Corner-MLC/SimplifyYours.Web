// Mirrors GuestManagementService.Contracts.Guests.GuestListItemResponse.
export interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  emailAddress: string | null;
  gender: string;
  relationship: string | null;
  side: string | null;
  plusOnes: number;
  dietaryNotes: string | null;
  createdAt: string;
}

export function guestFullName(guest: Pick<Guest, 'firstName' | 'lastName'>): string {
  return `${guest.firstName} ${guest.lastName}`.trim();
}
