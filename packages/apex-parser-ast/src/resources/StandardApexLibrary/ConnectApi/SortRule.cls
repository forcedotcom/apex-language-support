/**
 * Sort rule.
 */
global class SortRule {

  /**
   * Direction of the sort rule. Values are: Ascending —Sorts in ascending alphanumeric order (A–Z, 0–9). Default —When no direction is defined, sorts by relevance. Descending —Sorts in descending alphanumeric order (Z–A, 9–0).
   */
  global ConnectApi.CommerceSearchSortRuleDirection direction;

  /**
   * Label of the sort rule.
   */
  global String label;

  /**
   * Label suffix of the sort rule.Values are: Ascen —Label suffix for 'Asc' Ascending —Label suffix for 'Ascending' Az —Label suffix for 'A-Z' Descen —Label suffix for 'Desc' Descending —Label suffix for 'Descending' FewMany —Label suffix for 'Few-Many' HeavyLight —Label suffix for 'Heavy-Light' HighLow —Label suffix for 'High-Low' HighestLowest —Label suffix for 'Highest-Lowest' LightHeavy —Label suffix for 'Light-Heavy' LowHigh —Label suffix for 'Low-High' LowestHighest —Label suffix for 'Lowest-Highest' ManyFew —Label suffix for 'Many-Few' NewOld —Label suffix for 'New-Old' Newest —Label suffix for 'Newest' NewestOldest —Label suffix for 'Newest-Oldest' NineZero —Label suffix for '9-0' OldNew —Label suffix for 'Old-New' Oldest —Label suffix for 'Oldest' OldestNewest —Label suffix for 'Oldest-Newest' PriceDecreasing —Label suffix for '$$-$' PriceIncreasing —Label suffix for '$-$$' ThickThin —Label suffix for 'Thick-Thin' ThinThick —Label suffix for 'Thin-Thick' Za —Label suffix for 'Z-A' ZeroNine —Label suffix for '0-9'
   */
  global ConnectApi.CommerceSearchSortRuleLabelSuffix labelSuffix;

  /**
   * Name of the sort rule field or, if the sort rule is based on a custom field, ID.
   */
  global String nameOrId;

  /**
   * Sort order for the rule. A lower number has higher precedence. The first sort option is called when no other option is selected.
   */
  global Integer sortOrder;

  /**
   * ID of the sort rule.
   */
  global String sortRuleId;

  /**
   * Type of sort rule. Values are: ProductAttributeBased —Sorts by product attribute fields. ProductBased —Sorts by product field data. Relevancy —Sorts by product and catalog term frequency. SortByPricebook —Sorts by product prices defined in the specified pricebook (version 55.0 and later).
   */
  global ConnectApi.CommerceSearchSortRuleType type;

}