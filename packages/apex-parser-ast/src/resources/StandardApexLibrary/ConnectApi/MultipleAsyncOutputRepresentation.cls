/**
 * IDs of the asynchronous background operations. This output only includes the operation IDs, regardless of whether calls are made to an external payment gateway. It doesn’t include any errors from the operations.
 */
global class MultipleAsyncOutputRepresentation extends ConnectApi.BaseOutputRepresentation {

  /**
   * List of IDs of background operations.
   */
  global List < ConnectApi.AsyncOutputRepresentation > asyncOutputs;

}