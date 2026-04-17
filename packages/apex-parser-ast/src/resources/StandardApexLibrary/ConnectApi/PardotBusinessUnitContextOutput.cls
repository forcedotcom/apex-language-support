/**
 * Pardot business unit context.
 */
global class PardotBusinessUnitContextOutput {

  /**
   * List of the Pardot business unit context items that the context user has access to.
   */
  global List < ConnectApi.PardotBusinessUnitContextItem > businessUnits;

  /**
   * Indicates whether the requested resource was successfully provided.
   */
  global Boolean isSuccess;

  /**
   * Indicates the total number of Pardot business units that the context user has access to.
   */
  global Integer totalBusinessUnits;

}