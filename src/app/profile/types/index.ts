export type TimeRange = {
  roleId: string;
  code: string;
  name: string;
  fromTime: string;
  toTime: string;
};

export type FormData = {
  times: TimeRange[];
};

export type FormsState = {
  [key: string]: FormData[];
};

export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
