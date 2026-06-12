/**
 * Prediction result.
 */
global class CdpMlPredictionBase {

  global CdpMlPredictionBase() {}

  /**
   * Status of the prediction. Error Success
   */
  global CdpMlPredictStatusEnum status;

  global Object clone() {}

}