global class CommerceQuotes {

  global CommerceQuotes() {}

  global static ConnectApi.UpdateQuoteOutput updateQuote(String webstoreId, String quoteId, ConnectApi.updateQuoteInput updateQuoteInput) {}

  global static ConnectApi.CommerceQuoteDetail getQuoteDetail(String webstoreId, String quoteId, String effectiveAccountId, String fields) {}

  global static ConnectApi.CommerceQuoteCollection getQuotes(String webstoreId, String effectiveAccountId, String fields, ConnectApi.CommereQuotesSortOrder sortParam, Integer pageSize, String pageToken, String earliestDate, String latestDate) {}

  global static ConnectApi.CreateQuoteFromProductOutput createQuoteFromProduct(String webstoreId, String productId, ConnectApi.CreateQuoteFromProductInput createQuoteFromProductInput) {}

  global Object clone() {}

}