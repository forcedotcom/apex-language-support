/**
 * HTTP headers containing URLs associating text strings and classifications.
 */
global class TextClassificationsOutputRepresentation {

  /**
   * HTTP headers for text classifications output. Each header provides a URL you can use to get the result of the classification. The URL takes a list of text strings and classifiers that each text string can be classified in.
   */
  global List < ConnectApi.HttpHeaderOutputRepresentation > httpHeaders;

}