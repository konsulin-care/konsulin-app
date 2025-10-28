export type MarkUnavailabilityRequest = {
  practitionerRoleIds: string[];
  reason: string;
  allDay?: boolean;
  date?: string; // YYYY-MM-DD
  from?: string; // ISO with offset
  to?: string; // ISO with offset
  setStatus: 'busy-tentative' | 'busy-unavailable';
};

export type MarkUnavailabilityConflict = {
  practitionerRoleId: string;
  slotId: string;
  start: string;
  end: string;
  status: string;
};

export type MarkUnavailabilityResponse = {
  success: boolean;
  message: string;
  data: {
    conflicts: MarkUnavailabilityConflict[] | null;
    createdSlots: { id: string; status: string }[] | null;
    updatedPractitionerRoles: string[] | null;
  };
};

export type MarkUnavailabilityResult = {
  data: MarkUnavailabilityResponse;
  status: number;
};
