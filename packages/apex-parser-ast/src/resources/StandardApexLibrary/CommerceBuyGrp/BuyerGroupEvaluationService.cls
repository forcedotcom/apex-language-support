/**
 * The BuyerGroupEvaluationService class allows you define and execute custom business logic for dynamically assigning users to buyer groups. Unlike out-of-the-box configurations limited to account, market, or data segment-based buyer groups, this service supports extensibility and empowers you to implement tailored buyer group evaluation strategies. It supports both guest and logged-in user scenarios, enabling highly customizable and context-specific buyer group determination.
 */
global class BuyerGroupEvaluationService {

  public CommerceBuyGrp.BuyerGroupResponse getBuyerGroupIds(CommerceBuyGrp.BuyerGroupRequest request) {}

}