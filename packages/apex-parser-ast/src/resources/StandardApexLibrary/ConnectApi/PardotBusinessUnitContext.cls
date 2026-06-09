/**
 * Get the Pardot business units the context user has access to.
 */
global class PardotBusinessUnitContext {

  global PardotBusinessUnitContext() {}

  global static ConnectApi.PardotBusinessUnitContextOutput getBusinessUnitContext() {}

  global static ConnectApi.PardotBusinessUnitContextOutput getBusinessUnitContextByIsCurrentStatus(Boolean isCurrent) {}

  global Object clone() {}

}