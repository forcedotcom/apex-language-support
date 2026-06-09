/**
 * Create, delete, get, run, and update Data 360 calculated insights.
 */
global class CdpCalculatedInsight {

  global CdpCalculatedInsight() {}

  global static ConnectApi.CdpCalculatedInsightOutput createCalculatedInsight(ConnectApi.CdpCalculatedInsightInput input) {}

  global static void deleteCalculatedInsight(String apiName) {}

  global static ConnectApi.CdpCalculatedInsightOutput getCalculatedInsight(String apiName) {}

  global static ConnectApi.CdpCalculatedInsightPage getCalculatedInsights(String definitionType, Integer batchSize, Integer offset, String orderby, String dataspace) {}

  global static ConnectApi.CdpCalculatedInsightPage getCalculatedInsights(String definitionType, Integer batchSize, Integer offset, String orderby, String dataspace, String pageToken) {}

  global static ConnectApi.CdpCalculatedInsightStandardActionesponseRepresentation runCalculatedInsight(String apiName) {}

  global static ConnectApi.CdpCalculatedInsightOutput updateCalculatedInsight(String apiName, ConnectApi.CdpCalculatedInsightInput input) {}

  global Object clone() {}

}