/**
 * Search metadata for the field of an object.
 */
global class FieldMetadata {

  /**
   * The object that the field is associated with.
   */
  global String domain;

  /**
   * Field path through the object.
   */
  global String field;

  /**
   * API name of the field.
   */
  global String fieldApiName;

  /**
   * Field type. Values are: Address AnyType Base64 Boolean Combobox ComplexValue Currency DataCategoryGroupReference Date DateTime Double Email EncryptedString ExtensionEntityLookup ExternalLookup FloatArray Id ImageUrl IndirectLookup Integer Json Location Long MultiPicklist Percent PersonName Phone Picklist PlainTextArea Reference RichTextArea Sobject String SwitchablePersonName TextArea Time Url
   */
  global ConnectApi.FieldType fieldType;

  /**
   * Specifies whether the field is filterable ( true ) or not ( false ).
   */
  global Boolean filterable;

  /**
   * Specifies whether the field is highlightable ( true ) or not ( false ).
   */
  global Boolean highlightable;

  /**
   * Label of the field.
   */
  global String label;

  /**
   * Specifies whether the field is sortable ( true ) or not ( false ).
   */
  global Boolean sortable;

}