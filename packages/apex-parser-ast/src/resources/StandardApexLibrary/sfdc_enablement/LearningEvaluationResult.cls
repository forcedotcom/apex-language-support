/**
 * Represents a user’s progress and progress status of a custom exercise in an Enablement program.
 */
global class LearningEvaluationResult {

  global LearningEvaluationResult() {}

  public Double getLearningItemProgress() {}

  public sfdc_enablement.LearningItemProgressStatus getLearningItemProgressStatus() {}

  public void setLearningItemProgress(Double learningItemProgress) {}

  public void setLearningItemProgressStatus(sfdc_enablement.LearningItemProgressStatus learningItemProgressStatus) {}

  global Object clone() {}

}