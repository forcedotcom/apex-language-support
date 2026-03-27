/**
 * Search objects using keywords or a natural language query.
 */
global class Search {

  public static ConnectApi.SearchAnswer answer(String q) {}

  public static ConnectApi.SearchAnswer answer(String q, String objectApiName) {}

  public static ConnectApi.SearchAnswer answer(String q, String objectApiName, List<String> displayFields) {}

  public static ConnectApi.SearchResultGroups findAndGroup(String q) {}

  public static ConnectApi.SearchResultGroups findAndGroup(String q, String configurationName) {}

  public static ConnectApi.SearchResultGroups findAndGroup(String q, String configurationName, Boolean highlights) {}

  public static ConnectApi.ScopedSearchResults find(String objectApiName, ConnectApi.SearchRequest request) {}

  public static void setTestAnswer(String q, ConnectApi.SearchAnswer result) {}

  public static void setTestAnswer(String q, String objectApiName, ConnectApi.SearchAnswer result) {}

  public static void setTestAnswer(String q, String objectApiName, List<String> displayFields, ConnectApi.SearchAnswer result) {}

  public static void setTestFindAndGroup(String q, ConnectApi.SearchResultGroups result) {}

  public static void setTestFindAndGroup(String q, String configurationName, ConnectApi.SearchResultGroups result) {}

  public static void setTestFindAndGroup(String q, String configurationName, Boolean highlights, ConnectApi.SearchResultGroups result) {}

  public static void setTestFind(String objectApiName, ConnectApi.SearchRequest request, ConnectApi.ScopedSearchResults result) {}

}