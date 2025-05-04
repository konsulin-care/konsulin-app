import { HumanName } from 'fhir/r4';

export const mergeNames = (data: HumanName[]) => {
  if (!data || data.length === 0) {
    return '';
  }

  return data.map(item => [...item.given, item.family].join(' ')).join('');
};

export const customMarkdownComponents = {
  p: ({ children }) => <span>{children}</span>
};
