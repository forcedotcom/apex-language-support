/**
 * Phone number.
 */
global class PhoneNumber {

  /**
   * A localized string indicating the phone type.
   */
  global String label;

  /**
   * Phone number.
   */
  global String phoneNumber;

  /**
   * Phone type. Values are: Fax Mobile Work These values are not localized.
   */
  global String phoneType;

  /**
   * Note This property is not available after version 29.0. Use the phoneType property instead. Values are: Fax Mobile Work These values are not localized.
   */
  global String type;

}