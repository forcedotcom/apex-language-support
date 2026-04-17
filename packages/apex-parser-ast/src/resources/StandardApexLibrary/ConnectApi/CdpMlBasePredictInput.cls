/**
 * Base input representation for a prediction request.
 */
global class CdpMlBasePredictInput {

  /**
   * A reference to the model to use to generate the prediction.
   */
  global ConnectApi.CdpAssetReferenceInput model;

  /**
   * The model configuration settings to use to generate the prediction.
   */
  global ConnectApi.CdpMlPredictSettingsInput settings;

  /**
   * Type of input data for the prediction. RawData -Raw data. RecordOverrides -Record IDs with user-provided overrides. Records -Record IDs.
   */
  global CdpMlPredictTypeEnum type;

}