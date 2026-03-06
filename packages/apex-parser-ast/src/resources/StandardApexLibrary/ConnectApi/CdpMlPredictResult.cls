/**
 * Represents a CDP machine-learning prediction result.
 */
global class CdpMlPredictResult {

  /**
   * List of aggregate results.
   */
  global List < ConnectApi.CdpMlAggregatePrediction > aggregatePredictions;

  /**
   * Model asset reference used as part of the prediction request.
   */
  global ConnectApi.CdpAssetReference model;

  /**
   * Type of the model prediction. BinaryClassification -Binary classification. Generic -Generic/unknown. MulticlassClassification -Multiclass classification. Regression -Regression.
   */
  global CdpMlModelPredictionTypeEnum predictionType;

  /**
   * A list of prediction results.
   */
  global List < ConnectApi.CdpMlPredictionBase > predictions;

  /**
   * Settings used for the prediction.
   */
  global ConnectApi.CdpMlPredictSettings settings;

}