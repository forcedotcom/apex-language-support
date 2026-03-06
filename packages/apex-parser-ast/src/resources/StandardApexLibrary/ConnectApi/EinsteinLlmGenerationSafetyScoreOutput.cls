/**
 * Safety score information related to the LLM response.
 */
global class EinsteinLlmGenerationSafetyScoreOutput {

  /**
   * A higher value means the generated response is more likely to contain text that expresses, incites, or promotes hatred, violence, or severe harm towards the targeted group. Minimum value of 0.0 . Maximum value of 1.0 .
   */
  global Double hateScore;

  /**
   * A higher value means the generated response is more likely to contain text with unsafe advice that may harm the user or others physically, or text that promotes, encourages, or depicts acts of self-harm. Minimum value of 0.0 . Maximum value of 1.0 .
   */
  global Double physicalScore;

  /**
   * A higher value means the generated response is more likely to contain swear words, curse words, or obscene or profane language. Minimum value of 0.0 . Maximum value of 1.0 .
   */
  global Double profanityScore;

  /**
   * Overall safety score based on the hateScore , physicalScore , profanityScore , sexualScore , toxicityScore , and violenceScore . A higher value means the generated response is more likely to be safe. Minimum value of 0.0 . Maximum value of 1.0 .
   */
  global Double safetyScore;

  /**
   * A higher value means the generated response is more likely to contain text meant to arouse sexual excitement or promote sexual services. Minimum value of 0.0 . Maximum value of 1.0 .
   */
  global Double sexualScore;

  /**
   * A higher value means the generated response is more likely to contain text that is rude, disrespectful, or unreasonable. Minimum value of 0.0 . Maximum value of 1.0 .
   */
  global Double toxicityScore;

  /**
   * A higher value means the generated response is more likely to contain text that promotes or glorifies violence or celebrates the suffering or humiliation of others. Minimum value of 0.0 . Maximum value of 1.0 .
   */
  global Double violenceScore;

}