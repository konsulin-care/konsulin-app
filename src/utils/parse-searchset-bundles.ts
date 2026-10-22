/**
 * @deprecated Import directly from the specific modules instead:
 *   - `@/utils/fhir/searchset-bundle` for bundle parsers and mergeRecords
 *   - `@/utils/fhir/observation-extract` for extractObservation
 *   - `@/utils/fhir/condition-extract` for extractCondition
 *   - `@/utils/fhir/qr-extract` for QuestionnaireResponse extraction
 */
export {
  extractCondition,
  extractObservation,
  extractQuestionnaireResponse,
  mergeRecords,
  parseConditionBundle,
  parseObservationBundle,
  parseQRBundle,
  resolveQuestionnaireTitle
} from '@/utils/fhir/searchset-bundle';
