/**
 * Contains methods to retrieve results from invocable actions called from Apex code.
 */
global class Result {

  public Object clone() {}

  public Invocable.Action getAction() {}

  public List < Invocable.Action.Error > getErrors() {}

  public Map< String , Object > getInvocationParameters() {}

  public Map< String , Object > getOutputParameters() {}

  public Boolean isSuccess() {}

}