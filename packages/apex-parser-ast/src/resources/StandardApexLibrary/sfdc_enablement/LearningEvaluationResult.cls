/**
 * Represents a user’s progress and progress status of a custom exercise in an Enablement program.
 */
global class LearningEvaluationResult {

  global LearningEvaluationResult() {}

  global Double getLearningItemProgress() {}

  global sfdc_enablement.LearningItemProgressStatus getLearningItemProgressStatus() {}

  global void setLearningItemProgress(Double learningItemProgress) {}

  global void setLearningItemProgressStatus(sfdc_enablement.LearningItemProgressStatus learningItemProgressStatus) {}

  global Object clone() {}

}