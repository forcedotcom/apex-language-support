/**
 * Filter input for object search.
 */
global class SearchFilter {

  /**
   * Field to use in the filter.
   */
  global String field;

  /**
   * Filter operator. Values are: EqOp —Equal ExcludesOp —Excludes GtOp —Greater than GteOp —Greater than or equal InOp —In IncludesOp —Includes LikeOp —Like LtOp —Less than LteOp —Less than or equal NeOp —Not equal NinOp —Not in
   */
  global ConnectApi.FilterOperator operator;

  /**
   * Values of the filter, it can be a List of String, Boolean, Long, or Double. Do not mix data types for filter values, for example, ["A", "B", "C"] is valid, but ["A", -7, false] isn't.
   */
  global List < ConnectApi.AbstractList > values;

}