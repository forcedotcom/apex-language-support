/**
 * Base Order Management async output class.
 */
global class BaseAsyncOutputRepresentation extends ConnectApi.BaseOutputRepresentation {

  global BaseAsyncOutputRepresentation() {}

  /**
   * ID of the background operation.
   */
  global String backgroundOperationId;

  global Object clone() {}

}