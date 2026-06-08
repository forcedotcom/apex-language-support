/**
 * Represents a single file created during a FetchOptimizationFiles operation. Contains the ID of the Content Version record created in the org and an indicator of whether the creation succeeded.
 */
global class CreatedFile {

  global CreatedFile() {}

  /**
   * The id of the content version created in the org for this file.
   */
  global String contentVersionId;

  /**
   * Indicates whether the file was created successfully. Returns true if the Content Version record was created without errors.
   */
  global Boolean success;

  global Object clone() {}

}