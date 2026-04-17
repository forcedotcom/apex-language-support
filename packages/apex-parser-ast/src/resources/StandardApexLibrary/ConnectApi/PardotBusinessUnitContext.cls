/**
 * Get the Pardot business units the context user has access to.
 */
global class PardotBusinessUnitContext {

  public static ConnectApi.PardotBusinessUnitContextOutput getBusinessUnitContext() {}

  public static ConnectApi.PardotBusinessUnitContextOutput getBusinessUnitContextByIsCurrentStatus(Boolean isCurrent) {}

}