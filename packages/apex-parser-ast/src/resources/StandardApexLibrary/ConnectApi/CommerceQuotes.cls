global class CommerceQuotes {

  global CommerceQuotes() {}

  public static ConnectApi.UpdateQuoteOutput updateQuote(String webstoreId, String quoteId, ConnectApi.updateQuoteInput updateQuoteInput) {}

  public static ConnectApi.CommerceQuoteDetail getQuoteDetail(String webstoreId, String quoteId, String effectiveAccountId, String fields) {}

  public static ConnectApi.CommerceQuoteCollection getQuotes(String webstoreId, String effectiveAccountId, String fields, ConnectApi.CommereQuotesSortOrder sortParam, Integer pageSize, String pageToken, String earliestDate, String latestDate) {}

  public static ConnectApi.CreateQuoteFromProductOutput createQuoteFromProduct(String webstoreId, String productId, ConnectApi.CreateQuoteFromProductInput createQuoteFromProductInput) {}

  global Object clone() {}

}