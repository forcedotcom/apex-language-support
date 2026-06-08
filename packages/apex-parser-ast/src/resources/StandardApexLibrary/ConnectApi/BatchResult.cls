/**
 * The result of an operation returned by a batch method.
 */
global class BatchResult {

  global BatchResult() {}

  public ConnectApi.ConnectApiException getError() {}

  public String getErrorMessage() {}

  public String getErrorTypeName() {}

  public Object getResult() {}

  public Boolean isSuccess() {}

  global Object clone() {}

}