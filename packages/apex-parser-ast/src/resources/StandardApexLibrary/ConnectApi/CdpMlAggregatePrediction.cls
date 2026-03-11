/**
 * Represents a CDP machine-learning aggregate prediction.
 */
global class CdpMlAggregatePrediction {

  /**
   * Top factors associated with this aggregate prediction.
   */
  global List < ConnectApi.CdpMlAggregatePredictCondition > factors;

  /**
   * Prescriptions associated with this aggregate prediction.
   */
  global List < ConnectApi.CdpMlAggregatePredictCondition > prescriptions;

  /**
   * Status of the prediction aggregate function. Error Success
   */
  global CdpMlPredictAggregateFunctionStatusEnum status;

  /**
   * Type of the prediction aggregate function. Average Median Sum
   */
  global CdpMlPredictAggregateFunctionTypeEnum type;

  /**
   * Value of the aggregate prediction.
   */
  global Double value;

}