export type IAssessment = {
  id: string;
  type: string;
  entry: IAssessmentEntry[];
  link: IAssessmentLink[];
  total: number;
  resourceType: string;
};

export type IAssessmentEntry = {
  fullUrl: string;
  resource: IAssessmentResource;
  search: {
    mode: string;
  };
};

export type IAssessmentLink = {
  relation: string;
  url: string;
};

export type IAssessmentResource = {
  meta: {
    versionId: string;
    lastUpdated: string;
    tag: Array<{
      system: string;
      code: string;
    }>;
  };
  id: string;
  title: string;
  description: string;
  resourceType: string;
};
