/**
 * Matchers use Patterns to perform match operations on a character string.
 */
global class Matcher {

  global Matcher() {}

  /**
   * Returns the position after the last matched character.
   * @return Integer
   */
  global Integer end() {}

  /**
   * Returns the position after the last matched character.
   * @param groupIndex 
   * @return Integer
   */
  global Integer end(Integer groupIndex) {}

  /**
   * Attempts to find the next subsequence of the input sequence that matches the pattern. This method returns true if a subsequence of the input sequence matches this Matcher object's pattern.
   * @return Boolean
   */
  global Boolean find() {}

  /**
   * Attempts to find the next subsequence of the input sequence that matches the pattern. This method returns true if a subsequence of the input sequence matches this Matcher object's pattern.
   * @param group 
   * @return Boolean
   */
  global Boolean find(Integer group) {}

  /**
   * Returns the input subsequence returned by the previous match.
   * @return String
   */
  global String group() {}

  /**
   * Returns the input subsequence returned by the previous match.
   * @param groupIndex 
   * @return String
   */
  global String group(Integer groupIndex) {}

  /**
   * Returns the number of capturing groups in this Matching object's pattern. Group zero denotes the entire pattern and is not included in this count.
   * @return Integer
   */
  global Integer groupCount() {}

  /**
   * Returns true if the Matcher object has anchoring bounds, false otherwise. By default, a Matcher object uses anchoring bounds regions.
   * @return Boolean
   */
  global Boolean hasAnchoringBounds() {}

  /**
   * Returns true if the Matcher object has transparent bounds, false if it uses opaque bounds. By default, a Matcher object uses opaque region boundaries.
   * @return Boolean
   */
  global Boolean hasTransparentBounds() {}

  /**
   * Returns true if the end of input was found by the search engine in the last match operation performed by this Matcher object. When this method returns true, it is possible that more input would have changed the result of the last search.
   * @return Boolean
   */
  global Boolean hitEnd() {}

  /**
   * Attempts to match the input sequence, starting at the beginning of the region, against the pattern.
   * @return Boolean
   */
  global Boolean lookingAt() {}

  /**
   * Attempts to match the entire region against the pattern.
   * @return Boolean
   */
  global Boolean matches() {}

  /**
   * Returns the Pattern object from which this Matcher object was created.
   * @return Pattern object
   */
  global Pattern object pattern() {}

  /**
   * Returns a literal replacement string for the specified string inputString . The characters in the returned string match the sequence of characters in inputString .
   * @param inputString 
   * @return String
   */
  global static String quoteReplacement(String inputString) {}

  /**
   * Sets the limits of this Matcher object's region. The region is the part of the input sequence that is searched to find a match.
   * @param start 
   * @param end 
   * @return Matcher object
   */
  global Matcher object region(Integer start, Integer end) {}

  /**
   * Returns the end index (exclusive) of this Matcher object's region.
   * @return Integer
   */
  global Integer regionEnd() {}

  /**
   * Returns the start index (inclusive) of this Matcher object's region.
   * @return Integer
   */
  global Integer regionStart() {}

  /**
   * Replaces every subsequence of the input sequence that matches the pattern with the replacement string.
   * @param replacementString 
   * @return String
   */
  global String replaceAll(String replacementString) {}

  /**
   * Replaces the first subsequence of the input sequence that matches the pattern with the replacement string.
   * @param replacementString 
   * @return String
   */
  global String replaceFirst(String replacementString) {}

  /**
   * Returns true if more input could change a positive match into a negative one.
   * @return Boolean
   */
  global Boolean requireEnd() {}

  /**
   * Resets this Matcher object . Resetting a Matcher object discards all of its explicit state information.
   * @return Matcher object
   */
  global Matcher object reset() {}

  /**
   * Resets this Matcher object . Resetting a Matcher object discards all of its explicit state information.
   * @param inputSequence 
   * @return Matcher
   */
  global Matcher reset(String inputSequence) {}

  /**
   * Returns the start index of the first character of the previous match.
   * @return Integer
   */
  global Integer start() {}

  /**
   * Returns the start index of the first character of the previous match.
   * @param groupIndex 
   * @return Integer
   */
  global Integer start(Integer groupIndex) {}

  /**
   * Sets the anchoring bounds of the region for the Matcher object. By default, a Matcher object uses anchoring bounds regions.
   * @param anchoringBounds If you specify true , the Matcher object uses anchoring bounds. If you specify false , non-anchoring bounds are used.
   * @return Matcher object
   */
  global Matcher object useAnchoringBounds(Boolean anchoringBounds) {}

  /**
   * Changes the Pattern object that the Matcher object uses to find matches. This method causes the Matcher object to lose information about the groups of the last match that occurred. The Matcher object's position in the input is maintained.
   * @param pattern 
   * @return Matcher object
   */
  global Matcher object usePattern(Pattern pattern) {}

  /**
   * Sets the transparency bounds for this Matcher object. By default, a Matcher object uses anchoring bounds regions.
   * @param transparentBounds If you specify true , the Matcher object uses transparent bounds. If you specify false , opaque bounds are used.
   * @return Matcher object
   */
  global Matcher object useTransparentBounds(Boolean transparentBounds) {}

  global Object clone() {}

}