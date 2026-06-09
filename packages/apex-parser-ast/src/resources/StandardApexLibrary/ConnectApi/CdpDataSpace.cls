/**
 * Get Data 360 data spaces.
 */
global class CdpDataSpace {

  global CdpDataSpace() {}

  global static ConnectApi.DataSpaceCollectionRepresentation getAllDataSpaces(Integer batchSize, Integer offset, String orderBy) {}

  global static ConnectApi.DataSpaceInfoRepresentation getDataSpace(String idOrName) {}

  global Object clone() {}

}