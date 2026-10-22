# DPIA — Research responses and referral network

## Status

- Status: draft
- Area: research + referral processing
- Control: compliance / governance

## 1. Context

Konsulin runs citizen-science research batches. Users complete questionnaires;
their QuestionnaireResponses (health data) are stored in the FHIR server keyed
to a pseudonymized identity (patient fhirId or anonymous guest identifier).
To induce a network effect, patients share a referral link (`?ref=p_<fhirId>`).
When a referred user completes a batch, a `Communication` resource records the
edge `sender -> recipient` plus the completed batch.

This DPIA covers processing of (a) research responses and (b) the referral
network graph, both health / community-science data at scale.

## 2. Data flows

| Flow                 | Controller data                                                                                 | Children                                        |
| -------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Research responses   | QuestionnaireResponse (items, scores), authored date, pseudonymized author id                   | health data                                     |
| Referral attribution | `?ref` captured in localStorage; Communication sender (referrer), recipient (referee), batch id | referral network / community structure          |
| Aggregate counts     | `_summary=count` per questionnaire                                                              | non-identifying, masked under k-anonymity floor |

## 3. Lawful basis and purpose

- **Basis**: consent for participation (citizen science) + legitimate interest
  for community/network analysis.
- **Purpose**: measure research participation, reward community contribution,
  and study the structure of the research community.

## 4. Necessity and proportionality

- Responses are needed to run the research.
- Referral edges are stored only after a real completion (no tracking of mere
  clicks), minimising data.
- Aggregates are masked below a k-anonymity floor (5) so small cohorts cannot
  be re-identified.

## 5. Risk assessment and mitigations

| Risk                                       | Likelihood | Impact | Mitigation                                                                            |
| ------------------------------------------ | ---------- | ------ | ------------------------------------------------------------------------------------- |
| Re-identification from responses           | Low        | High   | Pseudonymized identities, `_elements` projection, minimal fields                      |
| Cross-identity linking via referral graph  | Medium     | Medium | Graph only records sender/recipient + batch; reads scoped to own identity             |
| Unauthorised access to PHQ-2 responses     | Medium     | High   | FHIR proxy scopes entry queries to session identity; aggregate counts only for public |
| Retention overflow                         | Medium     | Medium | Erasure pipeline purges QRs + Communications on deletion/revocation                   |
| Small-cohort re-identification from counts | Low        | Medium | k-anonymity floor on displayed totals                                                 |

## 6. Retention and erasure

- Responses and referral records are kept while the user participates.
- On account deletion or participation revocation the user's QuestionnaireResponses
  and all Communications where they are sender or recipient are purged, leaving
  no orphaned edges.

## 7. DPO assessment

Processing health data (PHQ-2 and other instruments) and pseudonymized
community identifiers at scale triggers a Data Protection Officer obligation.

- **Indonesia — UU PDP (Law 27/2022), Pasal 53**: a Data Protection Officer
  must be designated for processing of health and other sensitive personal
  data that is large-scale.
- **GDPR — Article 37(1)(c) and (4)**: a data protection officer must be
  designated where processing is large scale of special categories (health).

**Decision**: appoint a Data Protection Officer for the research and referral
processing before the virality feature is enabled in production.

## Sign-off

- Data controller: Konsulin product leadership
- DPO (to be appointed): TBD
- Date: <today>
