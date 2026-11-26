---
title: Study Metadata
description: How research study group, lead, question, ethics and findings map onto FHIR ResearchStudy
status: accepted
date: 2026-06-03
---

# Context

The research home needs a group, a lead, a research question, who can
join, ethics status, a shares-findings flag and published findings for
each study. ResearchStudy has native fields for some of these. The rest
need extensions. Participant pages must not fetch Practitioner.

# Decision

Mapping onto ResearchStudy:

- Group: `sponsor` as `{reference: Organization/<id>, display: name}`.
- Lead: `principalInvestigator.display`, set at save time.
- Research question: `objective[0].name`.
- Who can join, ethics status and shares-findings: new extensions under
  `http://konsulin.care/fhir/StructureDefinition/`, following
  `@src/utils/fhir/AGENTS.md`. Ethics status carries a code
  (`applying`, `approved`, `exempt`) and an optional reference.
- Findings: `ResearchStudy.note[]`. Each note has `text`, `time`,
  `author` and a participant-count extension.

Konsulin fallback: a study counts as Konsulin when its sponsor is the
`KONSULIN_ORGANIZATION_ID` group. When that variable is empty, studies
with no sponsor count as Konsulin and studies with a sponsor count as
other groups.

Display names on references: the register and edit forms fetch
`GET /fhir/Organization/{organizationId}` for the group name and store
it in `sponsor.display`. The lead name is stored in
`principalInvestigator.display`. Participant pages read these display
values and never fetch Practitioner.

Findings as notes: posting a finding appends a note to the study. No
new resource type is added.

Version check: ResearchStudy writes (posting a finding, saving an edit)
go through a `/fhir` transaction bundle. The PUT entry carries
`request.ifMatch: 'W/"<meta.versionId>"'`. A 412 response surfaces as a
conflict error, so concurrent edits never overwrite each other.

Catalogue reads stay plain cacheable GETs with `_count` and
`Bundle.link` next handling. No `:contains`, no server-side sort.

# Impact

- Participant pages need one ResearchStudy read and no extra lookups.
- Display names can go stale if a group is renamed until the study is
  saved again.
- Findings live on the study, so each post rewrites the resource and
  depends on the version check.
- Writes use a bundle instead of a bare PUT, and the UI must handle
  the conflict error.
