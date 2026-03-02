/**
 * Create, delete, get, run, and update Data 360 calculated insights.
 */
public class CdpCalculatedInsight {

  public static ConnectApi.CdpCalculatedInsightOutput createCalculatedInsight(ConnectApi.CdpCalculatedInsightInput input) {}

  public static Void deleteCalculatedInsight(String apiName) {}

  public static ConnectApi.CdpCalculatedInsightOutput getCalculatedInsight(String apiName) {}

  public static ConnectApi.CdpCalculatedInsightPage getCalculatedInsights(String definitionType, Integer batchSize, Integer offset, String orderby, String dataspace) {}

  public static ConnectApi.CdpCalculatedInsightPage getCalculatedInsights(String definitionType, Integer batchSize, Integer offset, String orderby, String dataspace, String pageToken) {}

  public static ConnectApi.CdpCalculatedInsightStandardActionesponseRepresentation runCalculatedInsight(String apiName) {}

  public static ConnectApi.CdpCalculatedInsightOutput updateCalculatedInsight(String apiName, ConnectApi.CdpCalculatedInsightInput input) {}

}