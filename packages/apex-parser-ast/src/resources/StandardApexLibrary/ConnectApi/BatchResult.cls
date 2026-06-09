/**
 * The result of an operation returned by a batch method.
 */
global class BatchResult {

  global BatchResult() {}

  global ConnectApi.ConnectApiException getError() {}

  global String getErrorMessage() {}

  global String getErrorTypeName() {}

  global Object getResult() {}

  global Boolean isSuccess() {}

  global Object clone() {}

}