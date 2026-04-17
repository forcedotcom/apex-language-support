/**
 * Access information about record motifs, which are small icons used to distinguish record types in the Salesforce UI.
 */
global class Records {

  public static ConnectApi.Motif getMotif(String communityId, String idOrPrefix) {}

  public static ConnectApi.BatchResult[] getMotifBatch(String communityId, List<String> idOrPrefixList) {}

}