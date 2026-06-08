/**
 * Get Data 360 data spaces.
 */
global class CdpDataSpace {

  global CdpDataSpace() {}

  public static ConnectApi.DataSpaceCollectionRepresentation getAllDataSpaces(Integer batchSize, Integer offset, String orderBy) {}

  public static ConnectApi.DataSpaceInfoRepresentation getDataSpace(String idOrName) {}

  global Object clone() {}

}