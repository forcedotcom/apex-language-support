/**
 * Exception indicating a problem with the execution of a resolution strategy.
 */
global class ResolutionException {

  public ResolutionException(String errorMessage, Exception exception) {}

  public ResolutionException(Exception exception) {}

  public ResolutionException(String errorMessage) {}

  public String getTypeName() {}

}