/**
 * Exception indicating a problem with the execution of a resolution strategy.
 */
global class ResolutionException {

  global ResolutionException(String errorMessage, Exception exception) {}

  global ResolutionException(Exception exception) {}

  global ResolutionException(String errorMessage) {}

  global String getTypeName() {}

  global Object clone() {}

}