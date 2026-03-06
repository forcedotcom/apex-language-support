/**
 * Contains information about a lead or guest user.
 */
global class LeadInput {

  /**
   * The company of the lead.
   */
  global String company;

  /**
   * The email address of the lead.
   */
  global String email;

  /**
   * Use to add values to any of the fields, including custom fields.
   */
  global List < ConnectApi.ExtendedFieldInput > extendedFields;

  /**
   * The first name of the lead.
   */
  global String firstName;

  /**
   * The last name of the lead.
   */
  global String lastName;

  /**
   * The phone number of the lead.
   */
  global String phone;

}