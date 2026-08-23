// Code generated; DO NOT EDIT.
// Generated at: 2026-08-23T13:29:27Z

export interface SpecialtyNode {
  nuccCode: string;
  iscoCode: string;
  label: string;
  domainSignature: string[];
}

export type ProximityTable = Record<string, Record<string, number>>;

export interface SpecialtyIndex {
  proximity: ProximityTable;
  specialties: Record<string, SpecialtyNode>;
}
