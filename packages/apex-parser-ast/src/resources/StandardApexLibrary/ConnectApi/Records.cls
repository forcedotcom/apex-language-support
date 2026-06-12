/**
 * Access information about record motifs, which are small icons used to distinguish record types in the Salesforce UI.
 */
global class Records {

  global Records() {}

  global static ConnectApi.Motif getMotif(String communityId, String idOrPrefix) {}

  global static ConnectApi.BatchResult[] getMotifBatch(String communityId, List<String> idOrPrefixList) {}

  global Object clone() {}

}