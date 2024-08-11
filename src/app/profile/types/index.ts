export type TimeRange = {
  firm: string
  fromTime: string
  toTime: string
}

export type FormData = {
  times: TimeRange[]
}

export type FormsState = {
  [key: string]: FormData[]
}
