/**
 * Representation for info of file exclusion from LLM requests
 */
global class EinsteinPromptTemplateAttachmentExclusionInfo {

  global EinsteinPromptTemplateAttachmentExclusionInfo() {}

  /**
   * Reason for file exclusion from LLM request
   */
  global String exclusionReason;

  /**
   * True if the file is excluded from LLM request, false otherwise
   */
  global Boolean isExcluded;

  global Object clone() {}

}