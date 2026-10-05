/**
 * Represents a user’s progress and progress status of a custom exercise in an Enablement program.
 * <p>Usage
 * To calculate the user’s progress through an exercise as a percentage and return the progress status, use the sfdc_enablement.LearningEvaluationResult class inside the sfdc_enablement.LearningItemEvaluationHandler. In your custom code, set the percentages to correspond to these sfdc_enablement.LearningItemProgressStatus enum values.
 * NotStarted is equal to 0.00
 * InProgress is from 0.01 through 99.99
 * Completed is equal to 100.00
 * <p>Example
 * See example code in sfdc_enablement.LearningItemEvaluationHandler.
 */
global class LearningEvaluationResult {
    global LearningEvaluationResult() { }

    global virtual Boolean equals(Object o) { return false; }

    /**
     * Returns the progress percentage of the learning item.
     * @return The progress percentage is formatted to two decimal places.
     */
    global Double getLearningItemProgress() { return 0.0; }

    /**
     * Retrieves the progress status of the learning item.
     */
    global sfdc_enablement.LearningItemProgressStatus getLearningItemProgressStatus() { return null; }

    global virtual Integer hashCode() { return 0; }

    /**
     * Sets the progress percentage of the learning item.
     */
    global void setLearningItemProgress(Double learningItemProgress) { }

    /**
     * Sets the progress status of the learning item.
     */
    global void setLearningItemProgressStatus(sfdc_enablement.LearningItemProgressStatus learningItemProgressStatus) { }

    global override virtual String toString() { return null; }
}