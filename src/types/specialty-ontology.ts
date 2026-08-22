// Code generated; DO NOT EDIT.
// Generated at: 2026-08-22T11:56:11Z

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
