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
  resource: IAssessmentResource | IResearchResource | IResearchListResource;
  search: {
    mode: string;
  };
};

export type IAssessmentLink = {
  relation: string;
  url: string;
};

export type IAssessmentResource = {
  meta: IMeta & {
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

export type IResearchResource = {
  description: string;
  meta: IMeta;
  resourceType: string;
  title: string;
  note: Array<{
    text: string;
  }>;
  status: string;
  id: string;
  period: {
    start: string;
    end: string;
  };
  relatedArtifact: Array<{
    type: string;
    resource: string;
  }>;
  contact: Array<{
    name: string;
  }>;
};

export type IResearchListResource = {
  id: string;
  entry: IResearchListEntry[];
  meta: IMeta;
  mode: string;
  resourceType: string;
  status: string;
  title: string;
};

export type IResearchListEntry = {
  item: {
    reference: string;
  };
};

type IMeta = {
  versionId: string;
  lastUpdated: string;
};
