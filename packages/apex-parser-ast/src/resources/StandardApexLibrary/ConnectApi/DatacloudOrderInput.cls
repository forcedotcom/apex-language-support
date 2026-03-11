/**
 * Input representation for a Datacloud order to purchase contacts or companies and retrieve purchase information.
 */
global class DatacloudOrderInput {

  /**
   * A comma-separated list of identification numbers for the companies to be purchased. You can’t include any contact IDs or your purchase fails.
   */
  global String companyIds;

  /**
   * A comma-separated list of identification numbers for the contacts to be purchased. You can’t include any company IDs or your purchase fails.
   */
  global String contactIds;

  /**
   * Indicates the Data.com user type to be used. There are two user types. Monthly (default) Listpool
   */
  global ConnectDatacloudUserTypeEnum userType;

}